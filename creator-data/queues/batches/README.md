# RAS 打分批次

从 `kol_uncontacted_master.csv` 拆出：**有邮箱 + 未打分**（381 人）。

## 推荐跑批顺序

| 顺序 | 批次 | market 参数 | 人数 | 说明 |
|------|------|-------------|------|------|
| 1 | `score_batch_IN_*` | India | 82 | MVP 南亚，优先 |
| 2 | `score_batch_OTHERS_*` | India | 7 | 实为印度 crypto，用 India |
| 3 | `score_batch_CO_*` | Colombia | 29 | 南美 |
| 4 | `score_batch_AR_*` | Argentina | 29 | 南美 |
| 5 | `score_batch_CL_*` | Chile | 8 | 南美 |
| 6 | `score_batch_PE_*` | Peru | 6 | 南美 |
| 7 | `score_batch_VE_*` | Venezuela | 4 | 南美 |
| 8–10 | `score_batch_BR_part1–3_*` | Brazil | 72×3 | 巴西最大，放最后分 3 批 |

每批约 **15–45 分钟**（若需 report-refresh 会更久）。

## 命令

```bash
cd ~/Downloads/RedotPay-KOL-BD
node creator-data/scripts/kol-score-csv.mjs creator-data/queues/batches/score_batch_IN_2026-06-25.csv India
```

输出同目录：
- `*_scored.csv` — 全量打分
- `*_ready.csv` — RAS≥60，可联系
- `<60` 自动进 `blacklists/ras_below_60.csv`

## 重新拆批

```bash
node creator-data/scripts/split-score-batches.mjs
```
