# RedotPay KOL BD — Agent 启动说明

> **新 Agent 读这个文件**：帮用户对齐「今天干什么」和「有哪些斜杠命令」，不要从零猜。

---

## 会话开始：先提醒用户看这些

| 频率 | 文件 | 用途 |
|------|------|------|
| **每天** | [`plans/本周每日计划.md`](plans/本周每日计划.md) | 今天/本周具体 checkbox |
| **每周** | [`plans/本周工作计划与资源清单.md`](plans/本周工作计划与资源清单.md) | 周目标、资源、下周节奏 |
| **跑通后** | [`plans/未来-跑通后Checklist.md`](plans/未来-跑通后Checklist.md) | 稳态每日清单（启动期别用） |
| **Onboard 运营** | [`plans/onboard-运营同步.md`](plans/onboard-运营同步.md) | 发稿跟进、活动 guidelines（**每周一更**） |
| **周末/规划** | [`plans/周末计划-2026-06-28.md`](plans/周末计划-2026-06-28.md) | 周末任务 + 未来计划（含 onboard） |
| **别忘命令** | [`plans/SKILLS速查手册.md`](plans/SKILLS速查手册.md) | `/noxinme` `/rasme` `/grilling` 速查 |

**开场话术模板（Agent 可用）：**

> 你好。RedotPay BD 项目里——  
> - **今天任务**看 `plans/本周每日计划.md`  
> - **本周大方向**看 `plans/本周工作计划与资源清单.md`  
> - 搜博主用 **`/noxinme`**，跑 RAS 用 **`/rasme`**，排计划/改流程用 **`/grilling`**  
> 你想先做哪一块？

---

## 斜杠命令（项目内）

| 命令 | Skill 路径 |
|------|------------|
| `/noxinme` | `.cursor/skills/noxinme/SKILL.md` |
| `/rasme` | `.cursor/skills/rasme/SKILL.md` |
| `/grilling` | `.cursor/skills/grilling/SKILL.md` |

全局（Downloads 工作区）：`noxinfluencer`、`redotpay-youtube-kol-intelligence` → 见 `plans/SKILLS速查手册.md`

---

## 数据来源（不要写错）

- **RedotPay 公司内部**：领导提供的 KOL list、Lark 626 公司总表、Nox、`/rasme`、KOL Intelligence、`outreach_do_not_contact.csv`、Notion Pipeline
- **公司外部 list**：仅作**候选补强**，导入 `creator-data/exports/external/` 后去重合并；**无合作/从属关系**
- **禁止**在计划、SOP、Agent 回复里把外部补强 list 写成「合作系统」或绑定特定第三方品牌名

## 业务硬规则（不要改）

- RAS **≥ 60** 才联系；< 60 → `creator-data/blacklists/ras_below_60.csv`
- 发信前必须去重 `outreach_do_not_contact.csv`
- 粉丝 **4K–100K**；MVP 中东/南亚；南美 Q3
- **成功指标：开卡数**；不要自动发 Gmail，BD 审核后再发

---

## 数据与脚本

- 主数据：`creator-data/`（见 `creator-data/README.md`）
- 话术：`kol-outreach/`
- 流程展示：`plans/半自动化外联流程展示/流程展示.md`
