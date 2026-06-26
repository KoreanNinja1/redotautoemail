---
name: noxinme
description: >-
  RedotPay Nox 拉人工作流（/noxinme）。先问用户 13 项参数（grill），再跑 Nox
  搜索、去 outreach/RAS 黑名单、输出 queue CSV。Use when the user types /noxinme,
  says Nox 拉人、搜博主、nox discovery, or wants new KOL candidates from NoxInfluencer.
disable-model-invocation: true
---

# /noxinme — Nox 拉人

用户输入 `/noxinme` 或说「Nox 拉人」时执行本 skill。**先问参数，再跑命令。不要猜默认值。**

## 依赖

- NoxInfluencer CLI：`noxinfluencer doctor` 须通过（见 `~/.agents/skills/noxinfluencer` 或项目外 `noxinfluencer` skill）
- 项目路径：`RedotPay-KOL-BD/creator-data/`
- 黑名单：`blacklists/outreach_do_not_contact.csv`、`blacklists/ras_below_60.csv`

## 第 1 步：Grill（必问，逐项填）

把下面清单发给用户，**缺项只追问缺的，不要擅自开跑**：

```
本次 Nox 拉人参数：

1. 平台：YouTube / TikTok / Instagram（默认 YouTube）
2. 国家：如 IN / PK / DZ / BR（可多选，国家代码）
3. 关键词/赛道：如 forex / crypto / criptomoedas
4. 粉丝量：最少 ___ 最多 ___（默认 4000–100000）
5. 平均播放：最少 ___（可选，南美常用 500+）
6. 最近发文：___ 天内发过（可选，南美常用 90 天）
7. 要几个人：___（默认 20）
8. 只要 Nox 有邮箱信号？是 / 否（默认 是）
9. 去掉 outreach 已联系？是 / 否（默认 **是，必须**）
10. 去掉 ras_below_60 黑名单？是 / 否（默认 **是，必须**）
11. 去掉 unsupported 国家？是 / 否（默认 是）
12. 本次要不要顺便 RAS 打分？是 / 否（默认 **否**；打分请用 /rasme）
13. 输出备注：如 india_forex / brazil_crypto
```

## 第 2 步：写配置并执行

根据用户答案生成 JSON（可参考 `creator-data/templates/nox-search-config.example.json`），然后：

```bash
cd RedotPay-KOL-BD
node creator-data/scripts/nox-discovery-queue.mjs creator-data/templates/nox-search-config.{备注}.json
```

配置字段对应：

| Grill 项 | JSON 字段 |
|----------|-----------|
| 平台 | `platform` |
| 国家 | `countries` |
| 关键词 | `keywords` |
| 粉丝 | `follower_min` / `follower_max` |
| 均播 | `avg_view_min` |
| 最近发文 | `published_within_days` |
| 人数 | `count` |
| 有邮箱 | `has_email` |
| 去 outreach | `exclude_outreach` |
| 去 RAS 黑名单 | `exclude_ras_blacklist` |
| 去 unsupported | `exclude_unsupported` |
| 顺便打分 | `kol_intelligence_score`（true 时才开） |
| 备注 | `output_slug` |

## 第 3 步：汇报

执行后向用户汇报：

- 扫了几页 / 多少候选
- 去掉 outreach 几个、RAS 黑名单几个、unsupported 几个
- 最终输出几人、几人有邮箱
- **输出文件路径**：`creator-data/queues/nox_queue_{备注}_{日期}.csv`

## 分工提醒

| 场景 | 用谁 |
|------|------|
| 找**新**博主 | **/noxinme**（本 skill） |
| 给 CSV **跑 RAS 分** | **/rasme** |
| 库存市场已有分 | 先 `export-market-queue.mjs`，不够再 Nox |

详细参考：`creator-data/references/nox-discovery-workflow.md`
