# 触达状态字段说明（给你更新回复 / follow-up 用）

在 `kol_queue_*.csv` 或发信后合并进 `outreach_do_not_contact.csv` 时，用下面值即可。你改完 CSV 告诉我「已更新」，我可以帮你排 follow-up 名单。

## outreach_status（你有没有发过）

| 值 | 含义 |
| --- | --- |
| `not_contacted` | 还没发 |
| `first_sent` | 已发第一封 |
| `followup_1` | 第 1 轮 follow-up（+7 天） |
| `followup_2` | 第 2 轮 follow-up（+14 天） |
| `followup_3` | 第 3 轮 follow-up（最后一轮） |
| `no_followup` | 标记为无需再跟（拒绝/不合适） |
| `partner` | 已合作 |

## reply_status（他们有没有回）

| 值 | 含义 | 建议动作 |
| --- | --- | --- |
| （空） | 未发或刚发 | — |
| `no_reply` | 发了没回 | 到期做 follow-up |
| `replied` | 有回复 | 你人工跟进，不做 cold follow-up |
| `interested` | 有意向 | 优先跟 |
| `rejected` | 明确拒绝 | `outreach_status=no_followup` |
| `bounced` | 邮箱退信 | 换邮箱或 `find_via_noxin_or_manual` |

## 日期字段

- `last_contact_date`：最近一次你发信日期（YYYY-MM-DD）
- `next_followup_date`：建议下次 follow-up 日期；第一封后通常 +7 天，第二轮 +14 天

## 每日你可以做的

1. 发完信：把 `outreach_status` 改成 `first_sent`，填 `last_contact_date`
2. 有回复：改 `reply_status=replied` 或 `interested`
3. 没回且到期：告诉我「帮我排 follow-up」，我会按日期筛出来
