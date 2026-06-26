---
name: rasme
description: >-
  RedotPay KOL Intelligence RAS 打分工作流（/rasme）。对 queue CSV 批量跑自建网站 API
  打分，≥60 进 ready，<60 进 ras_below_60。Use when the user types /rasme, says
  跑分、RAS 打分、kol-score, or wants to score a Nox queue CSV.
disable-model-invocation: true
---

# /rasme — RAS 打分

用户输入 `/rasme` 或说「跑分 / RAS」时执行本 skill。

## 依赖

- API Key：`RedotPay-KOL-BD/.env.local`（`YTK_API_KEY`、`YTK_BASE_URL=https://kol.redotpay.club`）
- 或 skill：`redotpay-youtube-kol-intelligence`（`~/.agents/skills/redotpay-youtube-kol-intelligence/.env.local`）
- 验证：`bash ~/.agents/skills/redotpay-youtube-kol-intelligence/scripts/smoke-test.sh`

## 第 1 步：确认输入（简短问）

```
1. 要打分的 CSV 路径？（默认：刚出的 nox_queue_*.csv 或 all_ready 待重跑列表）
2. 市场参数 market？（India / Brazil / Colombia / Argentina / Chile / Peru / Venezuela）
3. 一批多少人？（默认跑完整文件；大文件可先 split-score-batches）
```

若用户刚跑完 `/noxinme`，用输出的 `nox_queue_{备注}_{日期}.csv` 和国家推断 `market`。

## 第 2 步：单文件打分

```bash
cd RedotPay-KOL-BD
node creator-data/scripts/kol-score-csv.mjs <input.csv> <Market>
```

示例：

```bash
node creator-data/scripts/kol-score-csv.mjs \
  creator-data/queues/nox_queue_india_forex_2026-06-26.csv India
```

## 第 3 步：输出（自动）

排序规则：**先国家（A→Z，如 AR → BR → IN）→ 同国内 RAS 从高到低** → `priority_rank` 按此顺序编号。

| 文件 | 内容 |
|------|------|
| `*_scored.csv` | 全量打分结果 |
| `*_ready.csv` | **仅 RAS ≥ 60**，可联系 |
| `blacklists/ras_below_60.csv` | <60 自动追加 |

规则：**≥60 联系；<60 或 Exclude 进黑名单，以后搜人排除。**

## 第 4 步：大批量（可选）

待发主表里很多人要打分：

```bash
# 按国家拆批（有邮箱、未打分）
node creator-data/scripts/split-score-batches.mjs

# 顺序跑完所有批，每批合并到 results/
node creator-data/scripts/run-all-score-batches.mjs
```

合并结果：

- `creator-data/queues/batches/results/all_scored.csv`
- `creator-data/queues/batches/results/all_ready.csv`
- 按国家：`results/by_country/ready_{IN|BR|AR|CO}_*.csv`

## 第 5 步：与 outreach 同步后去重

发信前若更新了 Outreach 表：

```bash
node creator-data/scripts/sync-outreach-from-xlsx.mjs /path/to/outreach.xlsx
```

会从 `all_ready` 去掉已在 outreach / RAS 黑名单的重复。

## 第 6 步：汇报

- 总共几人、几人 ≥60、几人进 blacklist
- `*_ready.csv` 路径
- Top 5（名字 + RAS + 邮箱）
- 提醒：发完要追加 `blacklists/outreach_do_not_contact.csv`

## 分工提醒

| 步骤 | Skill |
|------|-------|
| Nox 搜新博主 | `/noxinme` |
| RAS 打分 | `/rasme`（本 skill） |
| Lark 话术 + Gmail | 人工 |

API 只读 GET；`report-refresh` 由 `kol-score-csv.mjs` 在缺分时自动 POST（勿手工乱刷）。
