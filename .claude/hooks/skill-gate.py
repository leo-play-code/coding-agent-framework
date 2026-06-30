#!/usr/bin/env python3
# PreToolUse(Bash) 品質關卡 — 配 deploy-guard.sh 一起用。
#
# 攔截「push / 開 PR」類指令:若這次 session 已經寫過程式碼,卻沒有實際呼叫過
# 必跑的審查 skill(Skill tool),就擋下(exit 2),把原因回饋給 Claude,
# 要它先跑審查再 push。這是把 CLAUDE.md「任何程式碼進 repo 前必須過 /code-review」
# 從「軟提示」變成「硬關卡」——agent 沒法用幻覺(「skill 未安裝」)繞過。
#
# 為什麼用 push 當關卡、不用 Stop hook:Stop 會在 agent 中途停下等使用者(⏸ 確認關卡)
# 時誤擋;push 才是明確的「我要出貨」信號,正好對應那條規則。
#
# 偵測依據:transcript(stdin payload 的 transcript_path)。Skill 呼叫 = tool_use
# name=="Skill" 的 input.skill;寫程式碼 = Write/Edit/MultiEdit 的 file_path 副檔名。
# 任何解析失敗一律放行(fail-open):hook 不該把 agent 卡死。

import sys, json, os, glob

# ── 關卡設定:條件成立卻沒跑對應 skill → 擋 push ───────────────────────────
#   key  = 必跑的 skill 名(Skill tool 的 input.skill)
#   when = 看這次 session 是否寫了該類檔案才要求
# 預設只放「零誤判」的兩條(所有情境含 debug 都適用):
#   code-review   —— 只要動到任何程式碼
#   design-review —— 只要動到前端檔
# /cso、/spec 是「情境相關」(debug 不需要),自動強制會誤擋 debug,故預設不開;
# 要更嚴可把下面註解打開(會在每次有程式碼變動時也要求,debug 一併被擋)。
GATE = {
    "code-review":   "code",
    "design-review": "frontend",
    # "cso":         "code",   # 解除註解 = 每次有程式碼變動都強制安全審查(含 debug)
    # "spec":        "code",   # 解除註解 = 每次有程式碼變動都強制需求釐清(含 debug)
}

CODE_EXT = {".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".rs", ".java", ".rb",
            ".php", ".c", ".cc", ".cpp", ".h", ".hpp", ".cs", ".kt", ".swift",
            ".vue", ".svelte", ".scala", ".sql"}
FRONTEND_EXT = {".tsx", ".jsx", ".vue", ".svelte", ".css", ".scss", ".sass",
                ".less", ".html", ".htm"}

# push / 開 PR 類指令才檢查;其餘 Bash 一律放行
def is_ship_command(cmd: str) -> bool:
    c = cmd.lower()
    return ("git push" in c
            or "gh pr create" in c
            or "tea pr" in c          # tea pr create / pulls create
            or "glab mr create" in c)


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    cmd = (payload.get("tool_input") or {}).get("command", "") or ""
    if not is_ship_command(cmd):
        sys.exit(0)

    tpath = payload.get("transcript_path")
    if not tpath or not os.path.exists(tpath):
        sys.exit(0)  # 沒 transcript 無從判斷 → 放行

    # 程式碼多半由 subagent(Agent tool / feature-dev)寫,記錄在
    # <session>/subagents/*.jsonl,不在主 transcript → 主 + subagent 一起掃。
    files = [tpath]
    files += glob.glob(os.path.join(os.path.splitext(tpath)[0], "**", "*.jsonl"),
                       recursive=True)

    skills_called = set()
    wrote_code = False
    wrote_frontend = False
    for fp in files:
        try:
            with open(fp, errors="ignore") as f:
                for line in f:
                    try:
                        o = json.loads(line)
                    except Exception:
                        continue
                    content = (o.get("message") or {}).get("content")
                    if not isinstance(content, list):
                        continue
                    for c in content:
                        if not isinstance(c, dict) or c.get("type") != "tool_use":
                            continue
                        name = c.get("name")
                        inp = c.get("input") or {}
                        if name == "Skill":
                            s = inp.get("skill")
                            if s:
                                skills_called.add(s)
                        elif name == "SlashCommand":
                            # /code-review --high → 取 "code-review"
                            cm = (inp.get("command") or "").lstrip("/").split()
                            if cm:
                                skills_called.add(cm[0])
                        elif name in ("Write", "Edit", "MultiEdit"):
                            ext = os.path.splitext(inp.get("file_path", ""))[1].lower()
                            if ext in CODE_EXT:
                                wrote_code = True
                            if ext in FRONTEND_EXT:
                                wrote_frontend = True
        except Exception:
            continue

    cond = {"code": wrote_code, "frontend": wrote_frontend}
    missing = [sk for sk, w in GATE.items()
               if cond.get(w) and sk not in skills_called]
    if not missing:
        sys.exit(0)

    lines = [
        "⛔ push 被擋下:本次已修改程式碼,但尚未實際呼叫必跑的審查 skill。",
        "依強制規則「任何程式碼進 repo 前必須過 /code-review」,請先用 Skill tool 呼叫:",
    ]
    for sk in missing:
        lines.append(f"  • /{sk}")
    lines.append("(這些 skill 都已安裝;`ls ~/.claude/skills/` 可確認。跑完並修正後再 push。)")
    sys.stderr.write("\n".join(lines) + "\n")
    sys.exit(2)   # exit 2 = 擋下這次 Bash 呼叫,stderr 回饋給 Claude


if __name__ == "__main__":
    main()
