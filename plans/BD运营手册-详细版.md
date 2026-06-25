# BD 运营手册（详细版）

> 自己用。老板只看 `RedotPay_KOL_Referral_BD_AI_提效计划.md`（一页纸）。

---

## 1. 范围与原则

- **当前阶段**：只给你自己用，每日优先级派给你；**不管其他 BD**。
- **核心 KPI**：**开卡数**。
- **MVP 市场**：阿尔及利亚、巴基斯坦、埃及、UAE 等中东/南亚（外币卡需求，非纯 crypto 国）。
- **南美**：Q3 后再加强。
- **排除**：[unsupported_countries.csv](../creator-data/reference/unsupported_countries.csv)
- **平台**：YouTube（crypto/AI/web3/forex）· Instagram（forex）· TikTok 后续。
- **粉丝量**：4K–100K。
- **印度 CSV**：先放着，质量不高未筛选。

## 2. 工具

| 工具 | 状态 | 用途 |
| --- | --- | --- |
| NoxInfluencer API | ✅ | 搜寻、邮箱信号 |
| KOL Intelligence | ✅ 2000+ 频道，日增 | RAS、品牌安全、topic；YouTube API ~50/账号/天，多账号 |
| KOL Intelligence API | ⬜ 找 **Louis** 申请 | 自动化读 RAS、排优先级 |
| Google Sheet | 主表 | KOL 主数据 |
| AI / Codex | ✅ | **纯 AI** 生成个性化开头；每日优先级 |
| Gmail | ✅ | 触达、Follow-up |

## 3. 流程

```text
Nox 搜寻（排除 unsupported）
→ Google Sheet 主表去重
→ KOL Intelligence RAS（网站或 API）
→ AI 生成每日优先级名单（发给你）
→ AI 生成当地语言邮件 + 个性化开头（topic / 频道名关键词 / 最近视频）
→ 你确认后 Gmail 发送
→ 更新状态；Follow-up 第 1/2/3 轮（7 天、14 天）
```

## 4. RAS 筛选（不单看分数）

**硬门槛：** unsupported 否 · 品牌安全通过 · 有邮箱 · 评论真实（真实性≥6，垃圾风险≤3）· 无刷量嫌疑 · BD 判断非「不优先」。

**优先级：** P0 = BD 适合 + RAS≥65 · P1 = RAS 60–64 · P2/禁止 = 低分或刷量。

## 5. 邮件

- **语言**：按市场当地语言。
- **结构**：`[AI 个性化开头]` + `[话术 v2 正文]` + `[签名]`
- **个性化素材**：`topic` + 频道名关键词；备选最近视频标题。
- **话术 v1**：放 `kol-outreach/`（待你放入）
- **Follow-up**：共 **3 轮**，间隔 **7 天、14 天**（首封后）

## 6. 发信量节奏

| 阶段 | 新 cold / 天 |
| --- | --- |
| 第 1 周 | 5–10（跑通） |
| 第 2–3 周 | 20–30 |
| 稳态 | ~50 |

## 7. AI Token 成本（约 100 博主/天处理）

~12.6 万 token/天 → 经济型模型约 **$0.03–0.05/天**，月 **$1 左右**；远低于招人。

## 8. 分阶段

1. **本周**：框架、主表、话术 v2、找 Louis 要 API、KOL 数据汇总  
2. **下周**：5–10 封/天试点  
3. **之后**：API + 每日优先级自动派发；冲 50/天；按开卡数据优化  

## 9. 数据字段

见 [kol_master_template.csv](../creator-data/templates/kol_master_template.csv)

## 10. Gmail 标签（建议）

`BD/待触达` · `BD/已触达` · `BD/Follow-up` · `BD/Interested` · `BD/Need-Info` · `BD/Negotiating` · `BD/Rejected` · `BD/合作中`

---

*原完整版 SOP 内容合并于此；日常执行用 `每日每周Checklist.md`*
