# Onboard 运营同步（每周一更新）

> **给 Cursor Agent 看的单页真相**：onboard 之后做什么、**Notion 表在哪**、本周怎么提效。  
> **外联找 KOL** → `/noxinme` `/rasme` + `creator-data/`；**已合作状态** → **Notion 实时维护**。

**最后更新：** _2026-06-28（模板；填 Notion 链接后生效）_

---

## 本周我们在做什么

| 项 | 内容 |
|----|------|
| **进行中活动** | _ |
| **要更新的 guidelines** | `plans/activities/` 或「无」 |
| **预计要催稿** | _约 __ 人_ |
| **deadline** | _ |

---

## 想怎么提效（和 Agent 对齐）

- [ ] _每周五：Notion 导出 onboarded 视图 → AI 出未发稿 list_
- [ ] _活动 guidelines 1 页模板，只改 3 个字段_
- [ ] _周一：Notion 导出 + `all_ready.csv` → `/grilling` A 排本周 todo_

---

## 数据在哪

| 数据 | 位置 |
|------|------|
| **状态主表（你实时改）** | **Notion：** _粘贴数据库链接_ |
| Notion 导出给 Agent | 每周一 / 需要排计划时 → 导出 csv 贴对话或放 `creator-data/exports/` |
| KOL 候选 / RAS / blacklist | `creator-data/`（`/noxinme` `/rasme` 产出） |
| ready 待发池 | `creator-data/queues/batches/results/all_ready.csv` |
| 外联历史（脚本去重用） | `creator-data/blacklists/outreach_do_not_contact.csv` |
| **领导提供的 KOL csv** | `creator-data/exports/`（仅补强候选；**非合作系统**） |
| 活动 guidelines | `plans/activities/` · `redotpay-guides/` |

**数据来源原则：**

- RedotPay 主流程 = Nox + RAS + Notion + Lark 626 + 公司 outreach 记录
- 外部/领导 list = **只当额外候选来源**，合并前必须对 `outreach_do_not_contact.csv` 去重
- 文档和 Agent **不得**声称与第三方 list 提供方有任何业务关系

**分工：**

- **Notion** = 每个人走到哪一步（contacted / onboarded / posted）、next_action、活动
- **creator-data** = 机器生成的候选池、分数、黑名单
- **Agent** = 读两边 → 排计划、出 list；**不自动改 Notion**（除非你明确要求）

---

## Notion 建议字段

`name, channel_url, platform, country, stage, ras_score, email, outreach_date, onboard_date, last_post_date, current_campaign, next_action, status_notes, source`

**stage 示例：** `candidate` · `contacted` · `replied` · `onboarded` · `posted` · `churned`

---

## 未发稿 / 需跟进定义（可调）

- onboard **≥14 天** 且 `last_post_date` 空 → 进催稿 list
- 已分配活动，deadline **前 3 天** 仍无稿 → 本周优先

---

## 本周成功标准

- _例：Notion 里 onboarded 人数和真实一致_
- _例：活动 X 前 Y 人交稿；周五未发稿 list 已出并 Lark 催完_

---

## 请 Agent 帮忙时怎么说

```text
Notion 导出：[路径或粘贴]
KOL ready：creator-data/queues/batches/results/all_ready.csv
/grilling A — 排下周 todo，外联和 onboard 分开，每天最多 5 条
```

```text
Notion 导出 onboarded 名单，
查谁 90 天内没发过 RedotPay 相关内容 → 未发稿 list.csv（不自动发催稿）
```

```text
/grilling E — onboard 运营 todo + guidelines 要不要更新
```
