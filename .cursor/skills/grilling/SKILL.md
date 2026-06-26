---
name: grilling
description: >-
  RedotPay BD 计划与决策 Grill（/grilling）。通过结构化问答帮用户定每日 todo、
  工作流程改进、资源优先级、PDF/文档改版方向。Use when the user types /grilling,
  says grill 我、排每日任务、提高效率、工作流程、未来计划.
disable-model-invocation: true
---

# /grilling — 结构化问答

用户输入 `/grilling` 或说「grill 我」时执行。**先问清楚，再出计划；不要替用户做决定。**

## 模式选择（先问一句）

```
你要 grill 哪一类？
A. 每日 / 每周 todo 分配（我会提供数据或目标）
B. 回复效率 & 外联工作流程
C. 文档 / PDF 改版方向（KOL、Affiliate 等）
D. 未来计划 & 优先级
E. Onboard 后运营（发稿跟进、活动 guidelines、AI 查是否发过内容、未发稿 list）
F. 自定义（你说主题）
```

---

## A. 每日 / 每周 Todo 分配

**必问清单：**

1. 今天/本周 **固定会议或 deadline**？
2. 你手上有哪些 **数据**？（outreach 表、ready 名单、开卡数据、活动日历——路径或粘贴摘要）
3. **必须做** vs **想做** vs **可以推后** 各是什么？
4. 有没有 **要通知的人**？（Louis、老板、其他 BD、活动相关方）
5. 每天能挤出 **几小时** 做 BD 框架？
6. 本周 **成功标准** 一句话？

**输出：**

- 更新或新建 `plans/本周每日计划.md` 里对应日期段落（用户确认后）
- 按优先级排序的 **今日 3–5 条** + **本周剩余**
- 若有 ready 名单：建议今天联系哪国、几人（引用 `by_country/ready_*.csv`）

---

## B. 回复效率 & 工作流程

**必问清单：**

1. 现在 **最慢的一环** 是什么？（找人 / 打分 / 写话术 / Lark / Gmail / follow-up / 记 outreach）
2. 一封邮件从 ready 到发出，**实际几步、几分钟**？
3. 哪些步骤 **必须人工**，哪些可以脚本/AI？
4. Gmail / Lark / Sheet / Nox / KOL 网站 **各用在哪一步**？
5. 重复劳动 TOP3？
6. 理想状态：**每天发几封**、谁审核、follow-up 谁盯？

**输出：**

- 当前 vs 目标流程（简短 bullet）
- 3 条 **本周可落地** 的改进（带负责人=用户、预估节省时间）
- 需要新 skill / 脚本 / 集成的建议（仅建议，不擅自大改）

参考：`plans/半自动化外联流程展示/流程展示.md`、`plans/BD运营手册-详细版.md`

---

## C. 文档 / PDF 改版

**必问清单：**

1. 哪份文档？（KOL 话术 PDF / Affiliate guidebook / 其他）
2. 受众是谁？（博主 / affiliate / 内部 BD）
3. **必须保留** 的信息 TOP5？
4. 必须删掉的冗余？
5. 目标页数（默认 **2–3 页**）和语言？

**输出：**

- 新大纲（章节 + 每节 1 句目的）
- 哪些段落可交给 AI 缩写、哪些必须人工审
- 可选工具提示：Cursor 内改 md → 导出 PDF；或 Canva / Google Docs 排版

文件位置：`kol-outreach/`、`guidebooks/RedotPay_Affiliates_Guidebook.md`

---

## D. 未来计划

**必问清单：**

1. 时间范围：下 **1 周 / 1 月 / Q3**？
2. 依赖项状态：API、话术 v2、自动化、团队扩人？
3. 量化目标：发信量、ready 池大小、开卡数？
4. 最大 **风险/阻塞** 是什么？

**输出：**

- 分阶段里程碑表
- 每项：依赖、负责人、完成标志
- 写入 `plans/周末计划-*.md` 或用户指定文件（确认后）

---

## E. Onboard 后运营

**背景：** onboard 不是终点；发稿、活动、guidelines 仍由用户负责。

**先读：** `plans/onboard-运营同步.md`（若存在）

**必问清单：**

1. 本周 **活动** 与 deadline？
2. **Onboard 主表** 在哪？字段是否齐（name, url, onboard_date, last_post_date, campaign）？
3. **Guidelines** 要新建还是改版？放哪？
4. 「发过相关内容」怎么定义？（关键词、时间窗如 90 天、平台）
5. 本周想 **催多少人**？自动 list 后谁发 Lark？
6. 和外联 todo 如何 **分开排**（各 2–3 条/天）？

**输出：**

- 更新 `plans/onboard-运营同步.md`（用户确认后）
- **未发稿 list** 规则 + 可选 csv 列定义
- 活动 guidelines 1 页大纲（若需要）
- 每周节奏：周一同步 → 周五出 list → 人工确认催稿

**AI 查内容时注意：**

- 只读公开频道信息 / 用户提供的导出；无法确认则标 `needs_manual_check`
- **不自动发送** 催稿；只出 list + 话术建议

---

## F. 自定义

（原 E.custom）

---

## 通用原则

- 一次只 grill **一个主题**；答完再问要不要下一个
- 用户答案写入计划 md 时 **先展示 diff 摘要，再改文件**
- 与 `/noxinme`、`/rasme` 分工：grilling **不自动跑 Nox/API**，只规划
