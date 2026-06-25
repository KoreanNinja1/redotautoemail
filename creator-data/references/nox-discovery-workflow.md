# Nox 拉达人 — RedotPay BD 标准流程

> 给 Cursor / Agent 用。每次拉人前**必须先问用户填参数**，不要擅自用默认值跑完全流程。

---

## 每次必问（复制给用户填）

```
本次 Nox 拉人参数：

1. 平台：YouTube / TikTok / Instagram（默认 YouTube）
2. 国家：如 IN / PK / DZ / BR（可多选，用国家代码）
3. 关键词/赛道：如 forex / crypto / criptomoedas
4. 粉丝量：最少 ___ 最多 ___（默认 4000–100000）
5. 平均播放：最少 ___（可选，南美用过约 500+）
6. 最近发文：___ 天内发过（可选，南美用过 90 天）
7. 要几个人：___（默认 20）
8. 只要 Nox 有邮箱信号？是 / 否（默认 是）
9. 去掉 outreach 已联系？是 / 否（默认 **是，必须**）
10. 去掉 ras_below_60 低分黑名单？是 / 否（默认 **是，必须**）
11. 去掉 unsupported 国家？是 / 否（默认 是）
12. 要不要过自建网站 RAS 评分？是 / 否（默认 否；测试时可开）
13. 输出文件名备注：如 algeria_forex / india_test
```

**用户没填全 → 只追问缺的项，不要猜。**

---

## 标准执行顺序

```text
① 确认参数（上面 12 项）
② noxinfluencer creator search（带齐筛选）
③ 拉 profile 拿 YouTube channel_id
④ 去掉 outreach_do_not_contact.csv（名字 / channel_id / 邮箱 / @handle）
⑤ 去掉 ras_below_60.csv（RAS&lt;60 已打分频道）
⑥ 去掉 unsupported_countries.csv（如用户要求）
⑦ 可选：KOL Intelligence snapshot / report-refresh 拿 RAS
⑧ 输出 CSV → creator-data/queues/nox_queue_{备注}_{日期}.csv
⑨ 打分后：≥60 → *_ready.csv；&lt;60 → blacklists/ras_below_60.csv
⑩ 汇报：拉了几个 / 去掉几个 outreach / 去掉几个 ras 黑名单 / 几个有邮箱
```

---

## Nox 搜索常用参数（对应以前南美那套）

| 参数 | CLI flag | 以前南美典型值 | 印度测试用了吗 |
|------|----------|----------------|----------------|
| 平台 | `--platform` | youtube | ✅ |
| 国家 | `--country '["BR"]'` | BR / AR / CO… | ✅ IN |
| 关键词 | `--keywords` | criptomoedas / crypto | ✅ forex |
| 粉丝下限 | `--follower_min` | 4000 | ✅ |
| 粉丝上限 | `--follower_max` | 100000 | ✅ |
| 有邮箱信号 | `--has_email true` | true | ✅ |
| 最近发文 | `--published_within_days` | **90** | ❌ **没加** |
| 平均播放 | `--avg_view_min` | 视情况 500+ | ❌ **没加** |
| 互动率 | `--engagement_rate_min` | 可选 | ❌ |
| 人数 | `--page_size` | 20 | ✅ |

**印度测试问题：只加了国家+关键词+粉丝+邮箱，少了最近发文/播放量筛选，且当时没做 outreach 去重。**

---

## Outreach 去重（强制）

黑名单文件：

`RedotPay-KOL-BD/creator-data/blacklists/outreach_do_not_contact.csv`

**RAS 低分黑名单（搜人时同样排除）：**

`RedotPay-KOL-BD/creator-data/blacklists/ras_below_60.csv`

匹配规则（命中任一即跳过）：

- 频道名（忽略大小写）
- YouTube channel_id
- 邮箱
- @handle（如 `@MindedTrader`）

**绝不能把 outreach 里的人当新候选输出。**

---

## Unsupported 国家

文件：`creator-data/references/unsupported_countries.csv`

拉非 MVP 市场或全球搜索时，导出前过滤。

---

## 输出 CSV 建议字段

| 字段 | 说明 |
|------|------|
| priority_rank | 按 RAS 或粉丝/播放排序 |
| channel_name | |
| channel_id | |
| profile_url | |
| country | |
| subscribers | |
| avg_views | |
| language | |
| email | 若已查到 |
| ras_score | 若过了自建网站 |
| bd_verdict | |
| in_outreach | 应为 no |
| email_action | ready_for_lark / find_via_noxin_or_manual |
| data_source | noxinfluencer |

---

## 脚本

通用脚本（读 JSON 配置）：

```bash
node RedotPay-KOL-BD/creator-data/scripts/nox-discovery-queue.mjs \
  creator-data/templates/nox-search-config.example.json
```

配置模板：`creator-data/templates/nox-search-config.example.json`

---

## 和自建网站的分工

| 场景 | 用谁 |
|------|------|
| 库存市场（DZ/PK/EG…）已有 RAS | **先拉自建网站**，Nox 补新 |
| 测试新市场/新赛道（如印度 forex） | Nox 拉 → 可选 report-refresh 评分 |
| 补邮箱 | Nox contacts 或 `/api/jobs/nox-contact` |
