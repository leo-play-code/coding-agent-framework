// gen-acceptance-report.mjs — 讀 acceptance manifest,產出 PM/RD/User 三方協作的報告:
//   1) <outDir>/使用者驗收報告.xlsx  (User/PM 勾填:說明 / 驗收明細 / 三方狀態 三 sheet)
//   2) <outDir>/使用者驗收報告.md    (同內容 Markdown 版,便於 git diff / PR review)
//   3) <outDir>/開發者驗證報告.md    (RD:每功能的驗證基準/策略/證據力,含證據力分佈統計)
//   4) <outDir>/三方狀態表.md        (PM:需求→實作→驗證→驗收 pipeline 一眼看進度)
//
// 用法:  node scripts/gen-acceptance-report.mjs docs/acceptance/manifest.json
//   (需 exceljs:`npm i exceljs`。路徑一律相對 manifest.meta.outDir,無硬編。)

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';

// exceljs 從「執行時的專案 cwd/node_modules」載入,而非 skill 檔所在位置 —— 因為 skill 是唯讀
// 掛載在專案 node_modules 之外,ESM 的 bare import 不吃 NODE_PATH 也走不到專案樹。exceljs 是 CJS,
// 用 createRequire 錨定 cwd 即可解析(專案需先 `npm i exceljs`)。
const require = createRequire(join(process.cwd(), 'noop.js'));
let ExcelJS;
try {
  ExcelJS = require('exceljs');
} catch {
  console.error('✘ 找不到 exceljs。請在專案根先安裝:npm i exceljs(再從專案根跑本腳本)。');
  process.exit(2);
}

const manifestPath = process.argv[2] || 'docs/acceptance/manifest.json';
const mf = JSON.parse(readFileSync(manifestPath, 'utf8'));
const meta = mf.meta || {};
const outDir = resolve(process.cwd(), meta.outDir || dirname(manifestPath));
mkdirSync(outDir, { recursive: true });
const features = mf.features || [];

// ── 通用證據力分級(跨所有 profile 一致)──
const EVIDENCE = {
  A: '對權威基準做過獨立比對並通過(舊系統逐格對 / 對 spec 驗收準則 verify 全綠 / API 契約測試 / UI 逐步驟 qa+截圖)',
  B: '自動化測試或內部一致性通過,但尚未對權威基準(恆等式、單元測試綠但無驗收操作)',
  C: '僅實作完成,尚未驗證',
};
const PROFILE_LABEL = { migration: '汰換/重寫', greenfield: '全新功能', api: 'API/後端', webapp: '一般 web app' };
const STATUS_MARK = { done: '✅', pending: '⬜', na: '—', blocked: '🚫' };
const smark = (v) => STATUS_MARK[v] || '⬜';
const prof = (f) => f.profile || meta.profile || 'greenfield';

// ─────────────────────────── XLSX ───────────────────────────
const HEAD = 'FF1F4E79', SUB = 'FFDDEBF7';
const border = { top:{style:'thin',color:{argb:'FFBFBFBF'}},left:{style:'thin',color:{argb:'FFBFBFBF'}},bottom:{style:'thin',color:{argb:'FFBFBFBF'}},right:{style:'thin',color:{argb:'FFBFBFBF'}} };
const wb = new ExcelJS.Workbook();
wb.creator = `${meta.project || 'project'} 驗收`;

// Sheet 1:說明
const s0 = wb.addWorksheet('說明');
s0.columns = [{ width: 18 }, { width: 84 }];
[
  [`${meta.project || ''} 使用者驗收報告`, ''],
  ['目的', 'PM/RD/User 三方對每個功能達成共識:是否符合需求、是否驗證過、是否驗收通過'],
  ['驗收基準', meta.baselineName || '依各功能 profile(舊系統/需求規格/API 合約/驗收清單)'],
  ['測試人', ''], ['測試日期', ''], ['系統版本/commit', ''],
  ['', ''],
  ['判定標準', 'PASS=功能符合該條驗收準則;FAIL=不符 → 於「差異/問題」寫清楚。逐條勾填,不含糊。'],
  ['證據力', 'A=已對權威基準比對通過;B=自動化測試過但未對基準;C=僅實作未驗證(見開發者驗證報告)'],
  ['⚠寫入警語', '有副作用(寫入/金流/寄信/寫回)的功能見各列 writes,測寫入前請確認'],
].forEach((r, i) => {
  const row = s0.addRow(r);
  if (i === 0) row.font = { bold: true, size: 14, color: { argb: HEAD } };
  else row.getCell(1).font = { bold: true };
  row.alignment = { vertical: 'top', wrapText: true };
});

// Sheet 2:驗收明細
const s = wb.addWorksheet('驗收明細', { views: [{ state: 'frozen', ySplit: 1 }] });
s.columns = [
  { header: '功能', key: 'f', width: 20 }, { header: '介面/路徑', key: 'r', width: 22 }, { header: '類型', key: 'p', width: 12 },
  { header: '驗收準則 / 欄位', key: 'c', width: 50 }, { header: '結果', key: 'res', width: 9 },
  { header: '差異/問題', key: 'diff', width: 34 }, { header: '測試人', key: 'u', width: 10 }, { header: '日期', key: 'dt', width: 12 },
];
const hr = s.getRow(1); hr.font = { bold: true, color: { argb: 'FFFFFFFF' } }; hr.height = 20;
hr.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEAD } }; c.alignment = { vertical: 'middle', horizontal: 'center' }; c.border = border; });
function addRow(vals, fill) {
  const row = s.addRow(vals);
  row.eachCell(c => { c.border = border; c.alignment = { vertical: 'top', wrapText: true }; });
  if (fill) row.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } });
  return row.number;
}
for (const f of features) {
  const title = addRow({ f: f.name, r: f.surface, p: PROFILE_LABEL[prof(f)] || prof(f), c: `【驗收準則】${f.writes ? ' ⚠有寫入:' + f.writes : ''}` }, SUB);
  s.getRow(title).font = { bold: true };
  (f.acceptance || []).forEach(a => addRow({ c: a }));
  if ((f.fields || []).length) {
    addRow({ c: '【資料欄位逐格對基準】' }, SUB);
    f.fields.forEach(fl => addRow({ c: fl }));
  }
}
const last = s.rowCount;
s.dataValidations.add(`E2:E${last}`, { type: 'list', allowBlank: true, formulae: ['"PASS,FAIL,N/A"'] });

// Sheet 3:三方狀態
const s2 = wb.addWorksheet('三方狀態');
s2.columns = [
  { header: '功能', width: 22 }, { header: '類型', width: 12 }, { header: 'PM', width: 10 }, { header: 'RD', width: 10 },
  { header: '需求', width: 8 }, { header: '實作', width: 8 }, { header: '驗證', width: 8 }, { header: '驗收', width: 8 }, { header: '證據力', width: 8 },
];
s2.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
s2.getRow(1).eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEAD } }; c.border = border; c.alignment = { horizontal: 'center' }; });
for (const f of features) {
  const st = f.status || {};
  const row = s2.addRow([f.name, PROFILE_LABEL[prof(f)] || prof(f), (f.owner||{}).pm || '', (f.owner||{}).rd || '',
    smark(st.spec), smark(st.impl), smark(st.verify), smark(st.accept), (f.verification||{}).evidenceLevel || 'C']);
  row.eachCell(c => { c.border = border; c.alignment = { horizontal: 'center' }; });
  row.getCell(1).alignment = { horizontal: 'left' };
}

const xlsxPath = join(outDir, '使用者驗收報告.xlsx');
await wb.xlsx.writeFile(xlsxPath);

// ─────────────────────────── 使用者驗收報告 Markdown ───────────────────────────
const U = [];
U.push(`# ${meta.project || ''} 使用者驗收報告`, '');
U.push(`> 由 **User/PM 實際操作勾填**。每個功能逐條驗收準則判 PASS/FAIL;不符請於「差異/問題」寫清楚。`, '');
U.push(`- **驗收基準**:${meta.baselineName || '依各功能類型'}　- **測試人**:____　**日期**:____　**版本**:____`, '');
features.forEach((f, i) => {
  U.push('---', '', `## ${i + 1}. ${f.name} — \`${f.surface}\`　(${PROFILE_LABEL[prof(f)] || prof(f)})`);
  if (f.writes) U.push(`> ⚠️ 有寫入/副作用:${f.writes}`);
  U.push('', '| # | 驗收準則 | 結果 | 差異/問題 |', '|---|---|---|---|');
  (f.acceptance || []).forEach((a, j) => U.push(`|${j + 1}|${a}|☐PASS ☐FAIL|  |`));
  if ((f.fields || []).length) {
    U.push('', '**資料欄位逐格對基準**', '', '| # | 欄位 | 相同? | 差異 |', '|---|---|---|---|');
    f.fields.forEach((fl, j) => U.push(`|${j + 1}|${fl}|☐|  |`));
  }
  U.push('', `測試人:____ 日期:____ 　總判定:☐PASS ☐FAIL`, '');
});
U.push('---', '', '**User 簽核**:______　**PM 簽核**:______　**日期**:______', '');
writeFileSync(join(outDir, '使用者驗收報告.md'), U.join('\n'), 'utf8');

// ─────────────────────────── 開發者驗證報告 Markdown ───────────────────────────
const D = [];
D.push(`# ${meta.project || ''} 開發者驗證報告`, '');
D.push('> 給 RD:每個功能「用什麼基準、什麼策略驗證、證據力多強」。**證據力誠實分級,別把測試綠講成已對基準。**', '');
D.push('## 證據力分級', ...Object.entries(EVIDENCE).map(([k, v]) => `- **${k}** — ${v}`), '');
D.push(
  '## 證據力關係(C → B → A,逐級加強)',
  '三級是「**驗證做到哪**」的遞進,不是隨意標籤:',
  '- **C → B|做了驗證,但只證「內部一致」**:C=寫完了、還沒驗(不知道對不對);B=驗過且通過,但驗的是**自己跟自己對得起來**(恆等式、單元測試),**沒跟外部標準答案比**。',
  '  例:aapr190a 跑 harness,彙總總計==逐筆加總==桶合計(差=0)→ 邏輯自洽=B;但這不代表數字和舊系統一樣(兩邊可能用同邏輯算出同樣的偏差)。',
  '- **B → A|從「內部一致」到「對權威基準獨立比對」**:A=拿**外部標準答案**(舊系統逐格匯出檔 / spec 驗收準則 / API 合約)逐項比對且相符。',
  '  例:aapr190a 要升 A,需拿 TIPTOP 實際匯出檔逐列逐欄 diff。',
  '',
  '> 一句話:**C=不知道對不對;B=自己跟自己對得起來;A=跟標準答案對過且一致。** 只有 A 能對 User/主管說「已驗證與基準相符」。',
  '');
const dist = { A: 0, B: 0, C: 0 };
features.forEach(f => { dist[(f.verification || {}).evidenceLevel] = (dist[(f.verification || {}).evidenceLevel] || 0) + 1; });
D.push(`## 證據力分佈:A=${dist.A||0} / B=${dist.B||0} / C=${dist.C||0}(共 ${features.length} 功能)`, '');
D.push('| # | 功能 | 類型 | 驗證基準 | 策略 | 證據力 |', '|---|---|---|---|---|---|');
features.forEach((f, i) => {
  const v = f.verification || {};
  D.push(`|${i + 1}|${f.name}|${PROFILE_LABEL[prof(f)] || prof(f)}|${v.baseline || '(未定)'}|${v.strategy || '(未定)'}|**${v.evidenceLevel || 'C'}**|`);
});
D.push('', '## 待補(證據力未達 A 者)');
features.filter(f => ((f.verification || {}).evidenceLevel || 'C') !== 'A').forEach(f => {
  const v = f.verification || {};
  D.push(`- **${f.name}**(${v.evidenceLevel || 'C'}):${v.note || '補齊對權威基準的獨立比對即可升 A'}`);
});
D.push('');
writeFileSync(join(outDir, '開發者驗證報告.md'), D.join('\n'), 'utf8');

// ─────────────────────────── 三方狀態表 Markdown ───────────────────────────
const S = [];
S.push(`# ${meta.project || ''} 三方狀態表`, '', '> PM 視角:每功能 需求→實作→驗證→驗收 的協作進度。✅完成 ⬜待辦 🚫卡住 —不適用。', '> 證據力:**C**=未驗證 / **B**=內部一致(未對基準) / **A**=已對權威基準比對相符(詳見開發者驗證報告)。', '');
S.push('| 功能 | 類型 | PM | RD | 需求 | 實作 | 驗證 | 驗收 | 證據力 |', '|---|---|---|---|---|---|---|---|---|');
features.forEach(f => {
  const st = f.status || {}, o = f.owner || {};
  S.push(`| ${f.name} | ${PROFILE_LABEL[prof(f)] || prof(f)} | ${o.pm || ''} | ${o.rd || ''} | ${smark(st.spec)} | ${smark(st.impl)} | ${smark(st.verify)} | ${smark(st.accept)} | ${(f.verification||{}).evidenceLevel || 'C'} |`);
});
const acc = features.filter(f => (f.status || {}).accept === 'done').length;
S.push('', `**驗收完成:${acc}/${features.length}**　| 未驗收者見上表 ⬜/🚫 欄`, '');
writeFileSync(join(outDir, '三方狀態表.md'), S.join('\n'), 'utf8');

console.log(`OK
  ${xlsxPath}
  ${join(outDir, '使用者驗收報告.md')}
  ${join(outDir, '開發者驗證報告.md')}
  ${join(outDir, '三方狀態表.md')}
功能:${features.length} | 證據力 A/B/C = ${dist.A||0}/${dist.B||0}/${dist.C||0} | 已驗收 ${acc}/${features.length}`);
