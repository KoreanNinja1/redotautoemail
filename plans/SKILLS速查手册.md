# Skills & 斜杠命令速查（别忘用）

> 新开 Agent → 输入 **`/`** 选命令，或直接打字。  
> 项目内命令在 `RedotPay-KOL-BD/.cursor/commands/`；全局 skill 在 `Downloads/.agents/skills/`。

---

## 一、RedotPay 专用（最常用）

| 命令 | 什么时候用 | 你会得到什么 |
|------|------------|--------------|
| **`/noxinme`** | 要从 Nox **搜新博主**、补候选池 | Agent 先问 13 项参数 → 跑 Nox → 去 outreach/RAS 黑名单 → `nox_queue_*.csv` |
| **`/rasme`** | 已有 CSV，要 **RAS 打分** | Agent 问 CSV + 市场 → 跑 API → `*_ready.csv`（≥60，**先国家后分数**） |
| **`/grilling`** | 定计划、排每日 todo、改流程、做决策前 **被问清楚** | Agent 按主题逐项问你，答完帮你写计划 / checklist / 流程改进 |

**一条龙：**

```text
/noxinme  →  nox_queue_*.csv
/rasme    →  *_ready.csv  →  Lark 话术  →  Gmail
发完      →  sync-outreach-from-xlsx 或更新 outreach_do_not_contact.csv
```

---

## 二、全局 Skills（底层能力）

| Skill | 路径 | 什么时候用 | 和上面命令的关系 |
|-------|------|------------|------------------|
| **noxinfluencer** | `.agents/skills/noxinfluencer` | Nox CLI 底层：搜人、查邮箱、campaign、配额 | `/noxinme` 已封装 RedotPay 流程；复杂 Nox 操作可直接说「用 noxinfluencer」 |
| **redotpay-youtube-kol-intelligence** | `.agents/skills/redotpay-youtube-kol-intelligence` | 查 RAS、市场覆盖、channel snapshot、API smoke-test | `/rasme` 已封装批量打分；单频道尽调可说「查这个 channel 的 RAS」 |

---

## 三、不用斜杠、直接说也行

| 你说… | Agent 应… |
|-------|-----------|
| 「Nox 拉印度 forex 20 个」 | 走 `/noxinme` 流程 |
| 「帮这批 CSV 跑分」 | 走 `/rasme` |
| 「grill 我一下怎么排明天的工作」 | 走 `/grilling` |
| 「同步 outreach xlsx」 | `node creator-data/scripts/sync-outreach-from-xlsx.mjs …` |
| 「按国家拆 ready 名单」 | 看 `creator-data/queues/batches/results/by_country/` |

---

## 四、常用脚本（无 skill，但常配合用）

```bash
cd RedotPay-KOL-BD

# Nox 拉人（/noxinme 最终会跑这个）
node creator-data/scripts/nox-discovery-queue.mjs creator-data/templates/nox-search-config.xxx.json

# RAS 打分（/rasme 最终会跑这个）
node creator-data/scripts/kol-score-csv.mjs <input.csv> India

# 大批量打分
node creator-data/scripts/split-score-batches.mjs
node creator-data/scripts/run-all-score-batches.mjs

# Outreach 去重
node creator-data/scripts/sync-outreach-from-xlsx.mjs /path/to/outreach.xlsx
```

---

## 五、新电脑 / 新 Agent 必做 Setup

1. Cursor 打开 **`RedotPay-KOL-BD`** 文件夹（不要只开 Downloads 父目录）
2. `noxinfluencer login` + `.env.local` 里 `YTK_API_KEY`
3. 新对话先看 **`plans/本周每日计划.md`**（每日）和 **`plans/本周工作计划与资源清单.md`**（每周）
4. 需要搜人/打分时：**别口述一长串**，直接 `/noxinme` 或 `/rasme`

---

## 六、分工表（避免混用）

| 任务 | 用谁 | 别用谁 |
|------|------|--------|
| 找**新**博主 | `/noxinme` | 不要只靠 KOL Intelligence 导出 |
| 给名单**打分** | `/rasme` | 不要在 noxinme 里默认开 kol_intelligence_score |
| 定**明天干什么** | `/grilling` + 每日计划 md | 不要空聊不落地 |
| 写**外联邮件正文** | 人工 + `kol-outreach/` 模板 | Nox skill 不代写谈判邮件 |
| 单频道**尽调** | redotpay-youtube-kol-intelligence | — |

---

*最后更新：2026-06-28 · 详见 `.cursor/skills/README.md`*
