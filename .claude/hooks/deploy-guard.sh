#!/usr/bin/env bash
# PreToolUse(Bash) 部署前安全閘
# 攔截部署/重啟類指令;若工作目錄有未 commit 改動 → 擋下(exit 2),
# 把原因回饋給 Claude,要求先 commit → /code-review → 測試 → 過 CI 再部署。
# CI 非綠燈只「警告」不擋。免 jq:用 python3 解析 stdin 的 hook payload。

payload="$(cat)"
cmd="$(printf '%s' "$payload" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin).get("tool_input",{}).get("command",""))' \
  2>/dev/null)"

# 只對「部署/重啟」類指令動作(依技術棧調整這份清單)
case "$cmd" in
  *"pm2 reload"*|*"pm2 restart"*|*"pm2 start"*|*deploy.sh*) : ;;
  *) exit 0 ;;   # 不是部署指令 → 放行
esac

# 不在 git repo → 無從判斷,放行
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

# 1) 有未 commit 改動 → 擋下
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  {
    echo "⛔ 部署被擋下:工作目錄有未 commit 的改動。"
    echo "請先 commit → 跑 /code-review + 測試 → 過 CI,再部署。"
    echo "── 未 commit 檔案 ──"
    git status --porcelain
  } >&2
  exit 2   # exit 2 = 阻擋這次 Bash 呼叫,stderr 內容回饋給 Claude
fi

# 2) 最近一次 CI 非 success → 只警告(不擋;本機 pm2 部署不一定有對應 CI)
branch="$(git branch --show-current 2>/dev/null)"
if [ -n "$branch" ] && command -v gh >/dev/null 2>&1; then
  ci="$(gh run list --branch "$branch" --limit 1 --json conclusion --jq '.[0].conclusion' 2>/dev/null)"
  if [ -n "$ci" ] && [ "$ci" != "success" ]; then
    echo "⚠️ 分支 $branch 最近一次 CI 為 '$ci'(非 success),建議先讓 CI 綠燈再部署。" >&2
  fi
fi

exit 0
