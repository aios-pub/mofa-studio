# Mofa Studio 产品需求文档（PRD）

> **Mofa Studio** —— 本地优先的创作者一站式 AI 创作工作站。
> 融合三种产品形态：**聊天即创作**（对标豆包）、**任务即交付**（对标 WorkBuddy）、**工作流即产线**（对标 ComfyUI）。
>
> 本目录为中英文双语版本：中文为源版本（`zh/`），英文为镜像翻译（`en/`），内容保持一致。

---

## 目录索引 / Index

| # | 文档 | 内容 | Document |
|---|---|---|---|
| 01 | [产品总览](zh/01-product-overview.md) | 定位宣言、用户画像、竞品矩阵、全局 IA、成熟度漏斗、资产飞轮、Onboarding | [Product Overview](en/01-product-overview.md) |
| 02 | [对话助手底座](zh/02-assistant-chat.md) | 流式对话、深度思考、联网搜索、识图、语音通话、内生图/视频 | [Assistant Chat](en/02-assistant-chat.md) |
| 03 | [创作工具箱](zh/03-creation-toolbox.md) | 16 个创作工具：豆包 10 主功能 + 媒体处理 3 件套等 | [Creation Toolbox](en/03-creation-toolbox.md) |
| 04 | [任务工作台](zh/04-task-workbench.md) | 五概念体系、三模式、路由引擎、连接器/Skill/专家团/评审流/SOP/灵感 | [Task Workbench](en/04-task-workbench.md) |
| 05 | [创作工作流](zh/05-creation-workflow.md) | 节点画布、执行队列与增量缓存、模型管理中心、App Mode、WASM SDK | [Creation Workflow](en/05-creation-workflow.md) |
| 06 | [平台底座](zh/06-platform.md) | 内嵌后端、llm-gateway、BYOK 密钥、统一 Asset 模型、链路追踪、专家模式 | [Platform Foundation](en/06-platform.md) |
| 07 | [非功能需求](zh/07-non-functional.md) | 性能预算、隐私安全、合规（AI 标识/拟人新规）、i18n、更新策略 | [Non-Functional Requirements](en/07-non-functional.md) |
| 08 | [路线图](zh/08-roadmap.md) | M1–M4 里程碑、量化验收指标、风险登记册 | [Roadmap](en/08-roadmap.md) |
| 09 | [技术选型](zh/09-tech-selection.md) | Rust 同构全栈架构、crates 划分、组件选型对照、评估记录 | [Tech Selection](en/09-tech-selection.md) |

---

## 核心决策登记簿 / Decision Register

| ID | 决策项 | 结论 |
|----|--------|------|
| D1 | 目标用户 | 创作者为主（自媒体图文 / 设计插画 / 短视频），兼顾轻办公人群 |
| D2 | 商业与技术路线 | 本地优先 BYOK（Bring Your Own Key），密钥入 OS 钥匙串，无付费墙 |
| D3 | 存量 B 端模块 | 收纳进「专家模式」，默认隐藏，代码复用 |
| D4 | 功能范围 | 豆包 10 主功能 + 对话底座；WorkBuddy 全量；ComfyUI 全量；播客工坊；媒体工具 3 件套；链路追踪 |
| D5 | 后端形态 | Rust 同构：Tauri 内嵌 Axum 服务（同一 crate 可编译为独立服务端），预留 Web/移动端 |
| D6 | 办公组件 | Univer 全家桶（Sheets/Docs/Slides，Apache-2.0）；长文写作用 TipTap；MIT 导出库兜底 |
| D7 | 信息架构 | 全局三模式主线：助理 / 项目 / 自动化 ＋ 创作 / 工作流 / 资产 / 专家模式 |
| D8 | Agent 架构 | 路由引擎四层（意图分类→Skill 检索调度→子路由→沙箱执行）；Skill = 自包含 mini-Agent |
| D9 | 多 Agent 策略 | 单 Agent 创作 / 专家团协作 / 评审团校验 三分法；编排引擎 Rust 自研（借鉴 AgentScope 抽象） |
| D10 | 概念体系 | 连接器 / 技能 / 专家 / 专家团 / 灵感 五概念分层建模（NLP 六级映射） |
| D11 | 护城河 | 资产飞轮：Skills + SOP 一键沉淀 + 连接器配置 + 灵感「做同款」UGC 闭环 |
| D12 | 媒体工具 | 视频转 GIF / 图片压缩 / 视频转码，基于 ffmpeg sidecar |
| D13 | 可观测性 | 链路追踪：对话/任务/工作流三级 Span 埋点 + 用量日志面板 + 可选 OTLP 导出 |

---

## 术语表 / Glossary

### 五大概念（源自 WorkBuddy 产品哲学，NLP 思维层级映射）

| 层级 | 概念 | 回答的问题 | 工程本质 |
|------|------|-----------|---------|
| L1 | **连接器 Connector** | 能访问什么系统与数据？ | API / OAuth / MCP |
| L2–3 | **技能 Skill** | 这件事具体怎么干？ | Workflow / Prompt / Tool Calling 封装 |
| L3–5 | **专家 Expert** | 以什么身份、什么范式干？ | System Prompt / 领域知识 / 方法论 |
| L3–5 | **专家团 Expert Team** | 多角色如何协作交付？ | Multi-Agent Orchestration |
| 全层 | **灵感 Inspiration** | 别人做成什么样了？能否直接复刻？ | Prompt+Skill+Expert 配置包的分发形态 |

> L6（价值观与最终决策）始终属于人与组织。

### 其他术语

- **BYOK**：Bring Your Own Key，用户自备各厂商 API Key，平台不经手、不计费
- **三模式**：助理（一句话一事）/ 项目（立项—规划—执行—评审—交付）/ 自动化（无人值守流水线）
- **统一 Asset 模型**：全部产物与素材的单表数据模型 `{type} × {source}` 二维归类
- **专家模式**：收纳现有组织/审计/压测/监控等 B 端模块的隐藏入口

---

## 需求条目统一格式

```
ID / 用户故事 / 功能描述 / 交互要点 / 现有代码映射 / 优先级(P0-P2) / 验收标准
```

优先级定义：
- **P0**：产品成立所必需，随对应里程碑首发
- **P1**：显著提升竞争力与体验，紧随其后迭代
- **P2**：生态扩展与远期能力，验证后投入
