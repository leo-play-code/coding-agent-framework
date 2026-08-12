#!/usr/bin/env node
// verify-up.mjs — 把這個專案的 compose 真的 build 起來、跑起來、curl 得到,然後收乾淨。
//
// 為什麼要一支腳本而不是叫 agent 自己下 docker 指令:agent 容器是用【宿主的 docker socket】
// 指揮【宿主的 daemon】(docker-out-of-docker),直接 `docker compose up` 會踩三個坑,而且每個
// 都表現成「看起來成功、其實不對」:
//
//   1. ports 綁到【宿主】—— compose 寫的 8080 是目標機的號,宿主上通常已被別的東西佔著,
//      不是撞號起不來,就是把別人的服務蓋掉。驗證根本不需要對外 port。
//   2. bind mount 的來源路徑由【宿主 daemon】解析 —— `./data:/data` 在容器內是
//      /workspace/proj/data,宿主上根本沒這個路徑,daemon 會默默建一個空目錄掛上去:
//      服務起得來、資料全空,是最難查的那種假成功。
//   3. container_name 是【宿主全域】唯一 —— 撞到宿主上正在跑的同名容器就直接失敗,
//      或更糟:把生產容器當成自己的殘留清掉。
//
// 做法:讀 `docker compose config`(已展開變數的真實定義)→ 改寫成一份只在驗證期存在的
// 臨時 compose(拔掉 ports、bind 路徑換算成宿主路徑、容器名加 cfverify- 前綴)→ up →
// 把自己接進那個 network 直接 curl 服務 → 不論成敗都 down 乾淨。
//
// 用法(在專案根目錄):
//   node ~/.claude/skills/containerize/verify-up.mjs [env] [--keep]
//     env     預設 staging(對應 compose.staging.yml)
//     --keep  驗完不要 down(要進去翻現場時用;翻完自己 down)
//
// exit 0 = 這份 compose 真的能 build + 起來 + 回應;非 0 = 不行,stderr 有真實錯誤與容器 log。

import { execFileSync, execFile } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { basename, resolve, isAbsolute, join } from 'node:path';
import { promisify } from 'node:util';

const pexec = promisify(execFile);
const [envArg, ...flags] = process.argv.slice(2).filter(Boolean);
const ENV = envArg && !envArg.startsWith('--') ? envArg : 'staging';
const KEEP = process.argv.includes('--keep');
const FILE = `compose.${ENV}.yml`;
const CWD = process.cwd();
const PROJ = `cfverify-${basename(CWD).toLowerCase().replace(/[^a-z0-9]/g, '')}-${ENV}`;
const TMP = `/tmp/${PROJ}.yml`;

const say = (m) => process.stdout.write(`${m}\n`);
const die = (m, code = 1) => { process.stderr.write(`✗ ${m}\n`); process.exit(code); };
const sh = (args, opts = {}) =>
  execFileSync('docker', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, ...opts });

// ── 前置:docker 通不通、compose 在不在 ────────────────────────────────────
if (!existsSync(FILE)) {
  die(`找不到 ${FILE}(要在專案根目錄跑,且這個環境的 compose 必須存在 —— 中央部署器第一道守衛就是查它)`);
}
try {
  sh(['version', '--format', '{{.Server.Version}}'], { stdio: ['ignore', 'pipe', 'pipe'] });
} catch {
  die('連不到 docker daemon。這個容器要靠宿主的 /var/run/docker.sock,\n'
    + '  沒掛進來就沒有這個能力(docker.js 的 dockerSockMountArgs);請容器重建後再試。');
}

// ── 1. 讀出「展開變數後」的真實定義 ────────────────────────────────────────
// 用 config 而不是自己解析 YAML:變數代換、extends、預設值都由 compose 自己算,才不會
// 驗的是一份跟部署時不一樣的東西。這一步也順便驗了 compose 語法與 env_file 是否存在。
let conf;
try {
  conf = JSON.parse(sh(['compose', '-f', FILE, 'config', '--format', 'json'],
    { stdio: ['ignore', 'pipe', 'pipe'] }));
} catch (e) {
  die(`${FILE} 解析失敗(部署時會用同一份,所以這是真的壞了):\n${String(e.stderr || e.message).trim()}`);
}

const HOST_WS = process.env.CF_HOST_WORKSPACE || null;   // 容器內 /workspace 對應的宿主路徑
const toHostPath = (p) => {
  if (!HOST_WS || !p.startsWith('/workspace')) return p;
  return join(HOST_WS, p.slice('/workspace'.length));
};

// ── 2. 改寫成驗證用的臨時 compose ─────────────────────────────────────────
const probes = [];   // [{service, containerName, port}] — 待會兒 curl 的對象
for (const [name, svc] of Object.entries(conf.services || {})) {
  // (1) 記下要探的內部 port,然後把 ports 整段拔掉 —— 驗證不對外,不佔宿主任何號。
  for (const p of svc.ports || []) {
    const target = Number(p.target ?? p);
    if (target) probes.push({ service: name, port: target });
  }
  delete svc.ports;

  // (2) 容器名加前綴:宿主是全域命名空間,不加前綴就可能撞到(甚至誤刪)正在跑的同名容器。
  svc.container_name = `${PROJ}-${name}`;

  // (3) bind mount 的來源換算成宿主路徑。換不了(不在 /workspace 底下、或沒 CF_HOST_WORKSPACE)
  //     就直接拔掉並警告 —— 掛一個宿主上不存在的路徑,daemon 會建個空目錄給你,
  //     那正是「服務起得來但讀不到檔」的假成功,不如不掛、讓錯誤明確。
  if (Array.isArray(svc.volumes)) {
    svc.volumes = svc.volumes.filter((v) => {
      if (typeof v === 'string' || v?.type !== 'bind') return true;
      const src = v.source || '';
      const mapped = toHostPath(isAbsolute(src) ? src : resolve(CWD, src));
      if (mapped === src && !isAbsolute(src)) return true;
      if (HOST_WS && mapped.startsWith(HOST_WS)) { v.source = mapped; return true; }
      process.stderr.write(`⚠ 拔掉無法換算成宿主路徑的掛載 ${src}(驗證環境不掛它;`
        + `目標機上這個掛載仍然有效)\n`);
      return false;
    });
  }
  // (4) 驗證期不要 restart 政策:失敗就該停下來讓人看見,不是無限重啟刷 log。
  if (svc.restart) svc.restart = 'no';
}
if (!probes.length) {
  process.stderr.write(`⚠ ${FILE} 沒有任何 ports 宣告 —— 只驗 build 與啟動,不做 HTTP 探測\n`);
}
// name 是 config 補上的專案名,留著會蓋掉 -p。
delete conf.name;
// networks 的名字也被 config 固化成 `<原專案名>_default` —— 不清掉,-p 就改不動它,
// 驗證環境會去接【宿主上同名的既有 network】(那可能正是生產服務在用的那張網),
// 等於把驗證容器插進別人的網路。清成空物件讓 compose 依 -p 自己重新命名。
for (const n of Object.values(conf.networks || {})) { if (n && typeof n === 'object') delete n.name; }
writeFileSync(TMP, JSON.stringify(conf));

// ── 3. build + up ────────────────────────────────────────────────────────
const compose = (...args) => ['compose', '-f', TMP, '-p', PROJ, ...args];
const down = () => {
  try { sh(compose('down', '-v', '--remove-orphans'), { stdio: 'ignore' }); } catch { /* best effort */ }
  try { rmSync(TMP, { force: true }); } catch { /* best effort */ }
};

let selfId = null;
let joined = null;
try {
  say(`▶ build(${FILE},專案名 ${PROJ})`);
  sh(compose('build'), { stdio: 'inherit' });
  say('▶ up');
  sh(compose('up', '-d'), { stdio: 'inherit' });

  // ── 4. 健康探測:把自己接進 compose 的 network,直接對容器名 curl ──────────
  // 不走宿主 port(上面拔掉了),也不假設服務容器內有 curl —— 由 agent 這一側發請求。
  if (probes.length) {
    selfId = (process.env.HOSTNAME || readFileSync('/etc/hostname', 'utf8')).trim();
    // 直接問第一個服務容器「你在哪張網上」——比用命名規則猜可靠(compose 的命名隨版本/設定變)。
    const probeSvc = probes[0].service;
    const net = sh(['inspect', `${PROJ}-${probeSvc}`,
      '--format', '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}'])
      .trim().split(/\s+/).filter(Boolean)[0];
    if (!net) throw new Error(`容器 ${PROJ}-${probeSvc} 沒有接上任何 network,無法探測`);
    try { sh(['network', 'connect', net, selfId]); joined = net; }
    catch (e) { throw new Error(`把驗證端接進 network 失敗:${e.message}`); }

    const DEADLINE = Date.now() + 90_000;   // 給 90 秒暖機(build 完的冷啟動 + migration)
    const pending = [...probes];
    const ok = [];
    while (pending.length && Date.now() < DEADLINE) {
      for (let i = pending.length - 1; i >= 0; i--) {
        const p = pending[i];
        const url = `http://${PROJ}-${p.service}:${p.port}/`;
        try {
          // 任何 HTTP 回應都算「起來了」(401/404 也是活著);只有連不上才是沒起來。
          const code = (await pexec('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}',
            '--max-time', '5', url], { timeout: 8000 })).stdout.trim();
          if (code && code !== '000') { ok.push(`${p.service}:${p.port} → HTTP ${code}`); pending.splice(i, 1); }
        } catch { /* 還沒起來,下一輪 */ }
      }
      if (pending.length) await new Promise((r) => setTimeout(r, 3000));
    }
    for (const line of ok) say(`  ✓ ${line}`);
    if (pending.length) {
      const dead = pending.map((p) => `${p.service}:${p.port}`).join(', ');
      process.stderr.write(`\n── 容器 log(最後 60 行)──\n`);
      try { sh(compose('logs', '--tail', '60'), { stdio: 'inherit' }); } catch { /* best effort */ }
      throw new Error(`90 秒內連不上:${dead} —— 服務沒真的起來(上面是它的 log)`);
    }
  }

  // 起來之後還要活著:up 成功但幾秒後 crash 的容器,前面的探測可能剛好在它死前打到。
  // compose ps 的 --format json 在不同版本吐的是 JSON array 或一行一物件(JSON lines),兩種都要吃。
  const psRaw = sh(compose('ps', '-a', '--format', 'json')).trim();
  const ps = psRaw.startsWith('[')
    ? JSON.parse(psRaw)
    : psRaw.split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const bad = ps.filter((c) => !/^(running|Up)/i.test(c.State || c.Status || ''));
  if (bad.length) {
    process.stderr.write(`\n── 容器 log(最後 60 行)──\n`);
    try { sh(compose('logs', '--tail', '60'), { stdio: 'inherit' }); } catch { /* best effort */ }
    throw new Error(`這些容器不是 running:${bad.map((c) => `${c.Service}(${c.State || c.Status})`).join(', ')}`);
  }

  say(`\n✅ ${FILE} 驗證通過:build 成功、容器 running、服務有回應。`);
} catch (e) {
  process.stderr.write(`\n✗ ${FILE} 驗證失敗:${e.message}\n`);
  process.exitCode = 1;
} finally {
  if (joined && selfId) { try { sh(['network', 'disconnect', joined, selfId]); } catch { /* best effort */ } }
  if (KEEP) say(`(--keep:留著 ${PROJ},翻完請自己跑 docker compose -f ${TMP} -p ${PROJ} down -v)`);
  else down();
}
