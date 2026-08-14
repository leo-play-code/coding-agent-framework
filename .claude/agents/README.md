# 自訂子代理(agent model)

放在這裡的 `*.md` 會跟著這個 repo 一起版控,merge 到 `main` 之後由 ops-hub
(http://1.1.7.75:5200/#/deploy)自動送到每一台執行主機的
`~/agent/coding-agent-released`,再由該台 cf-api 重建**閒置的**容器套用
——正在跑一輪對話的人會被跳過,下一次套用再補,所以沒有人會被踢下線。

容器裡看得到的位置:

| 這個 repo | 容器內 | 性質 |
|---|---|---|
| `.claude/agents/` | `/workspace/.claude/agents/` | 唯讀 bind-mount,live |
| `.claude/skills/<name>/` | `/workspace/.claude/skills/<name>/` 與 `/root/.claude/skills/<name>/` | 唯讀,與 image 內建的 skills **合併**(不覆蓋) |
| `CLAUDE.md` | `/workspace/CLAUDE.md` | 每次 ensure 複製進去(不是 mount) |
| `templates/` | `/workspace/templates/` | 唯讀 bind-mount |

## 不放在這裡的東西

`~/.claude` 底下第三方生態(gstack 的 55 個 skills、ecc-* 系列、plugins、bun)
是**烤進 cf-agent image** 的,不走這一層 —— 它們 1.6G,而且不是我們維護的。
要更新那些得重 build image,是另一個動作。

## 新增一個 agent

1. 在這裡放 `my-agent.md`(frontmatter 要有 `name`、`description`)
2. commit → push → merge 到 `main`
3. ops-hub 幾秒內推到各台;新開的容器立刻有,既有容器等它閒下來自動重建
