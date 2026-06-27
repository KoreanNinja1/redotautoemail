# 新电脑 / 香港机 · 5 分钟启动

## 1. Clone

```bash
git clone git@github.com:KoreanNinja1/redotautoemail.git RedotPay-KOL-BD
cd RedotPay-KOL-BD
```

用 HTTPS：`https://github.com/KoreanNinja1/redotautoemail.git`

## 2. Cursor 打开仓库

- 工作区根目录选 `RedotPay-KOL-BD`
- 新 Agent 会自动读 `AGENTS.md` 和 `plans/周末计划-2026-06-28.md`

## 3. 一次性配置（不进 Git）

| 项 | 命令 / 位置 |
|----|-------------|
| KOL Intelligence API | 复制 `.env.example` → `.env.local`，填 `YTK_API_KEY` |
| Nox CLI | `noxinfluencer login` → `noxinfluencer doctor` |
| Notion MCP | Cursor Settings → Notion 插件 → Connect workspace |

## 4. 周末计划顺序

见 **`plans/周末计划-2026-06-28.md`**：

1. PDF 已定稿（`kol-outreach/`、`guidebooks/`）
2. **Notion 建 KOL Pipeline 表**（连 MCP 后对 Agent 说「可以建了」）
3. 外联流程 / onboard 运营 / `/daily` todo

## 5. 斜杠命令

`/noxinme` · `/rasme` · `/grilling` — 见 `plans/SKILLS速查手册.md`

Pipeline 定稿：`plans/onboard-运营同步.md`

**数据：**

- 领导 list（公司内部）→ `creator-data/exports/internal/`
- 外部补强 list → `creator-data/exports/external/`（去重合并，不写合作系统名）
