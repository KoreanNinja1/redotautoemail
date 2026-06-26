# creator-data 目录说明

## 日常只看这三个文件

| 文件 | 用途 |
|------|------|
| `queues/kol_uncontacted_master.csv` | **唯一待发名单**（见文件内实际人数） |
| `blacklists/outreach_do_not_contact.csv` | 已联系 / 合作中 — 搜人时排除 |
| `blacklists/ras_below_60.csv` | RAS&lt;60 — 搜人时排除 |

## 子目录

| 文件夹 | 内容 |
|--------|------|
| `queues/` | 仅保留 `kol_uncontacted_master.csv` |
| `blacklists/` | outreach + RAS 黑名单 + `Outreach记录-3.xlsx` 备份 |
| `scripts/` | Nox 拉人、RAS 打分等自动化脚本 |
| `templates/` | Nox 搜索配置、CSV 模板 |
| `references/` | 流程说明、unsupported 国家 |

## 印度 crypto 100 批次（已完成）

- **41 人 RAS≥60** → 已联系，在 `outreach_do_not_contact.csv`
- **59 人 RAS&lt;60** → 在 `ras_below_60.csv`

## 发信 / 搜人后

- 发完 → 追加 `blacklists/outreach_do_not_contact.csv`
- 打分 &lt;60 → 自动进 `ras_below_60.csv`
- 从 `kol_uncontacted_master.csv` 删掉已处理行（或等我帮你重建）
