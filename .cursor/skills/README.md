# RedotPay BD Agent Skills

| 命令 | 作用 |
|------|------|
| **`/noxinme`** | Nox 拉人：13 项 grill → 搜博主 → 去黑名单 → CSV |
| **`/rasme`** | RAS 打分：CSV → API → ready（≥60，先国家后分数） |
| **`/grilling`** | 排每日 todo / 改流程 / PDF 大纲 / 未来计划 |

**完整说明（给用户看）：** [`plans/SKILLS速查手册.md`](../plans/SKILLS速查手册.md)

**新 Agent 启动：** 根目录 [`AGENTS.md`](../AGENTS.md) · 每日 [`plans/本周每日计划.md`](../plans/本周每日计划.md)

## Setup

1. Cursor 打开 **`RedotPay-KOL-BD`** 文件夹
2. `noxinfluencer login` + `.env.local` 填 `YTK_API_KEY`
3. 新对话输入 **`/`** 选命令

## 典型流程

```text
/noxinme  →  /rasme  →  Lark  →  Gmail  →  outreach 同步
/grilling →  排 todo / 改流程（随时）
```
