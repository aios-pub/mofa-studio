# 09 技术选型（Tech Selection）

> 前后端分离契约不变；单机场景后端以「内嵌 Axum」形态存在，同一代码库可编译独立服务端。

## 1. 总体架构：Rust 同构全栈

```
┌─ Tauri 2 桌面壳 ─────────────────────────────────────┐
│  React 19 前端 (WebView)                              │
│      │ REST / SSE / WebSocket（OpenAPI 契约）          │
│      ▼                                                │
│  内嵌 server-core (Axum, 127.0.0.1:<动态端口>)          │
│  ┌──────────────────────────────────────────────┐    │
│  │ llm-gateway · agent-runtime · flow-engine     │    │
│  │ media-adapters · rag-pipeline · mcp-host      │    │
│  └──────────────────────────────────────────────┘    │
│  SQLite(+FTS5/sqlite-vec) · Keyring · ffmpeg sidecar  │
│  浮窗/托盘/快捷键/截图（Tauri command，桌面专属隔离）      │
└───────────────┬───────────────────────────────────────┘
                │ BYOK 直连（Rust 层注入凭证）
   LLM/图像/视频/音乐/TTS/ASR 厂商 API ＋ 本地 Ollama / ComfyUI
```

**同构策略**：`server-core` 未来编译为 `mofa-server` 独立二进制供 Web/移动端；一套代码两种形态。前端永不直连厂商 API。

## 2. Rust Workspace 划分

```
crates/
├── server-core      # Axum 路由与领域服务（可独立编译）
├── llm-gateway      # 厂商归一化、SSE 中继、用量计量、分层路由策略
├── agent-runtime    # 任务状态机：事件溯源 + 断点续跑 + 执行策略三分法
├── flow-engine      # 图执行：拓扑调度 + 签名缓存增量执行 + 队列
├── media-adapters   # Seedream/Seedance/Kling/音乐/TTS/ASR 各厂商适配
├── rag-pipeline     # pdf-extract/calamine 解析 → chunk → embedding → 检索
├── mcp-host         # rmcp 官方 SDK，MCP Client + 连接器管理
└── storage          # rusqlite + FTS5 + sqlite-vec（向量后端 trait 抽象）
```

## 3. 类型安全链路

utoipa 自动生成 OpenAPI → `openapi-typescript` 生成 TS 类型 → 前端 services 层消费；契约测试双向校验。替代手写 mock/real 双轨的类型漂移。

## 4. 前端组件选型对照

| 领域 | 选型 | 备选与理由 |
|------|------|-----------|
| 节点画布 | @xyflow/react（已用） | 已有 10 种节点基础 |
| AI 表格 | Univer Sheets（Apache-2.0） | Luckysheet 停更；Handsontable 商用收费 |
| Word 产物渲染 | **Univer Docs** | TASK-17 交付物预览/编辑 |
| PPT 渲染导出 | **Univer Slides** + pptxgenjs(MIT) 导出 | Plan B 见 08-R2；规避 PPTist 的 AGPL（本项目为商业源码许可，AGPL 组件不可引入） |
| 长文写作编辑器 | **TipTap 3**（MIT） | 与 Univer Docs 分工：写作=创作体验（Markdown 优先/AI 续写），Docs=办公产物渲染；中间格式 Markdown/docx 互通 |
| 图表 | ECharts | 表格图表/研究报告 |
| 音频波形/录音 | wavesurfer.js + AudioWorklet | 播客工坊/转写 |
| 图片重绘蒙版 | react-konva | TOOL-01 inpainting |
| 文档导出兜底 | docx / exceljs / pptxgenjs（均 MIT） | 客户端轻量导出 |
| 报告 PDF 排版 | Typst（Rust 服务端） | 深入研究报告高质量输出 |

> 写作 vs 办公的边界：TOOL-06 AI 写作用 TipTap；TASK-17 Word 产物用 Univer Docs——二者通过格式转换互通，不互相替代。

## 5. 关键选型评估记录

### 5.1 LLM 网关：自研 vs LiteLLM / One-API
**结论：自研 Rust 适配层。** 理由：LiteLLM 引入 Python 运行时、One-API 为 Go 栈，均破坏零外部依赖的单二进制目标；BYOK 直连为主无需复杂计费路由；130+ 厂商配置可直接迁移。

### 5.2 Agent 编排：自研 vs LangGraph / AgentScope
**结论：Rust 自研（借鉴 AgentScope 消息传递/Pipeline/msghub 抽象）。**
- LangGraph(Python)、AgentScope(Python) 均需 sidecar，带来打包体积、进程管理、双栈维护成本，与 D5 决策冲突
- 自研核心=事件溯源状态机（SQLite WAL），天然支撑断点续跑/追踪埋点/评审回放
- 专家团编排（团长拆解→并行→整合）在 M3–M4 以 tokio task 并行实现
- 风险对冲：三分法默认策略是单 Agent 直执行，编排引擎延期不阻塞主线（08-R6）

### 5.3 向量检索：sqlite-vec vs 独立向量库
本地 sqlite-vec 嵌入式；storage crate 定义 trait，云部署切换 pgvector/Qdrant 不改上层。

### 5.4 搜索聚合（联网搜索/深入研究）
BYOK 可配：博查 / Zhipu 搜索 API（国内优先）/ Tavily / SearXNG；正文抓取 readability + scraper crate。

## 6. 媒体处理编码器选型

| 能力 | 方案 | 论证 |
|------|------|------|
| 视频转 GIF / 视频转码 / BGM 合成 | **ffmpeg sidecar**（统一运行时） | palettegen/paletteuse 高质量 GIF；profile 库覆盖平台预设；已在播客链路引入，零新增依赖 |
| 图片压缩 | **Rust 原生 mozjpeg(JPEG) + ravif(AVIF) + libwebp**，ffmpeg 兜底冷门格式 | 原生编码器质量调优粒度优于 ffmpeg 通用封装；批量场景内存可控；目标体积模式走二分质量搜索 |

## 7. 实时语音通话技术路线

| 阶段 | 路线 | 说明 |
|------|------|------|
| MVP（CHAT-07） | **ASR→LLM→TTS 管道串联** | BYOK 友好（三段均可选厂商）；延迟 ≤3s 可接受；VAD 打断 |
| 远期 | 全双工 RTC（火山实时语音等） | 自然打断/情绪语调，依赖厂商 SDK 授权模式再评估 |

## 8. 工程化

- 前端：Vitest + Testing Library；Playwright E2E（web 模式跑通核心旅程）；ESLint9 + Prettier；`deno task` 统一编排
- 后端：cargo test + clippy；集成测试以 OpenAPI 契约为准
- CI/CD：GitHub Actions + tauri-action 出包（macOS universal / Windows NSIS）；updater 灰度
- 技术债：移除 @tanstack/react-router、socket.io-client→原生 WS（适配器已有）

## 9. 安全架构要点

密钥仅存钥匙串、Rust 层注入凭证；授权目录白名单沙箱（任务级显式授权）；WASM 插件能力最小授权（FLOW-11）；外部内容 Prompt 注入隔离（07 §2.3）；AI 内容元数据标识。
