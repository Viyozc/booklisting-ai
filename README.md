# BookListing AI — 落地页 + 免费 KDP Listing SEO 审计钩子（静态站）

Listora 的「姊妹站」：面向 **KDP（Kindle 自出版）作者** 的免费 Listing SEO 审计 + AI 元数据生成（规划中）。
复用 Listora 已验证的"免费审计钩子 + 邮件捕获 + freemium"漏斗，只换 marketplace schema（Etsy listing ↔ KDP book metadata）。

## 文件
```
booklisting-ai/
├─ index.html        落地页（英文）：Hero / 免费审计 / How / Why / FAQ
└─ assets/
   ├─ style.css      复用 Listora 样式（自包含）
   └─ audit.js       KDP 审计引擎（客户端，零成本）
```

## 审计评分维度（满分 100，对齐 Amazon COSMO 信号）
- **Title**（25）：标题+副标题长度（≥140 字符满分）与关键词前置
- **Keywords**（25）：7 个 backend 关键词填满 + 多词短语
- **Keyword coverage**（15）：目标词出现在 标题/关键词/描述
- **Description**（20）：描述深度（≥1000 字符满分）
- **Categories**（15）：选满 2–3 个类目

实测分化：优 = 81(B) / 中 = 34(D) / 弱 = 17(D)。

## 零成本部署
- GitHub Pages：仓库根放本目录，Settings → Pages → 选分支根目录。
- 或 CloudStudio / Vercel 静态托管。
- 邮件捕获：改为 Formspree 免费档（<https://formspree.io>，无付费），把 `assets/audit.js` 与 `index.html` 里的 `YOUR_FORMSPREE_FORM_ID` 换成免费表单 ID 即收真邮件；留 `YOUR_` 前缀则 demo 模式（localStorage 存线索，零成本先验证）。

## 验证门槛（对齐 Listora）
零成本跑 2 周：**≥200 次审计 + ≥50 邮箱订阅 → 进 MVP**（复用 `etsy-listing-ai/mvp/` Next.js 骨架）。
未达门槛则弃，不进开发。

## 下一步（多需 zc 操作，见 TASK.md WAITING_FOR_USER）
- zc 发英文获客内容（YouTube "KDP SEO" 教程 / Reddit r/selfpublish / Facebook KDP 群组 / PH）。
- 激活免费 Formspree 表单 ID 收真邮件（无需付费，见上「零成本部署」邮件捕获说明）。
- 达门槛后由 agent 复用 MVP 骨架进 Next.js 版。
