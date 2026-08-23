# mofa-studio

<!-- lang-toggle -->
[English](./README.md) | 🇨🇳 中文
<!-- /lang-toggle -->

mofa-studio 是一款基于 Tauri 与 Rust 同构后端构建的**本地优先创作者一站式 AI 创作工作站**，将三种产品形态融合进同一个桌面应用：

- **聊天即创作** —— 多模态对话入口：问答、识图、图像/视频生成、写作一站完成
- **任务即交付** —— 一句话任务自动规划、执行、评审，交付文档/演示/成片
- **工作流即产线** —— 节点式可视化管线，批量生产图文视频内容

全部模型访问采用 **BYOK（自带密钥）** 模式：密钥存入系统钥匙串、数据不出本机、无订阅付费墙。

> 📋 产品需求文档（中英双语）：[`docs/prd/`](docs/prd/README.zh-CN.md)

## 功能特性

### 三模式工作台
- **助理** —— 默认首页：多模型流式对话、深度思考、联网搜索溯源、识图理解、对话内生图/视频、语音输入与播报
- **项目** —— 立项 → 自动规划 → 单 Agent 逐步执行 → 多专家评审团 → 验收交付，支持断点续跑
- **自动化** —— 定时流水线无人值守；关窗后托盘常驻续跑

### 创作工具箱（16 个工具）
- **图像生成** —— 文生图/图生图/蒙版局部重绘、多参考一致性；批量生产与平台尺寸预设（小红书 3:4 / 抖音 9:16 / B站 16:9）
- **视频生成与媒体处理** —— 文/图生视频；视频转 GIF、批量图片压缩、平台预设转码（ffmpeg）
- **文档** —— AI 写作（个人风格库，TipTap）、PPT 生成、AI 表格、深入研究（成本预估+引用报告）
- **音频** —— 音乐生成、会议录音转写（说话人分离）、完整播客工坊（脚本→多音色 TTS→波形剪辑→MP3 导出）

### 任务工作台
- 五概念体系：**连接器**（OAuth/MCP）、**技能**（自包含 mini-Agent 包）、**专家**、**专家团**、**灵感市场**（「做同款」一键复刻）
- 产物中心：Word/Excel/PPT 统一预览（Univer 渲染可直接编辑）、文件树与变更 diff
- 授权目录本地文件操作、长期记忆系统、SOP 一键沉淀

### 创作工作流（对标 ComfyUI，低门槛化)
- 节点画布 + 生成类节点库；执行队列 + 签名缓存增量执行
- 模型管理中心（云端 API + 本地 Ollama 双轨）；模板市场 + 缺依赖检测下载
- App Mode：专家搭流程，普通用户填参数

### 平台底座
- 内嵌 Axum 后端（同一代码库可编译为独立服务端，预留 Web/移动端）
- llm-gateway 归一化 130+ 模型厂商，含用量计量、配额告警、多 Key 故障转移
- 链路追踪可观测：对话/任务/工作流三级 Span 埋点 + 用量成本面板

### 桌面伴侣
- 可拖拽悬浮球、截图提问、划词问答、全局快捷键、托盘常驻
- 存量 B 端管理模块（组织/审计/压测/监控）收纳于可选的**专家模式**

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Tauri 2.x + React 19 |
| 语言 | TypeScript 5.8 / Rust |
| 构建工具 | Vite 8 |
| UI 组件 | Ant Design 6 |
| 样式 | Tailwind CSS 4 |
| 状态管理 | Zustand 5 |
| 路由 | React Router 7 |
| 工作流图形 | XYFlow |
| 办公套件 | Univer (Sheets/Docs/Slides) |
| 后端（内嵌） | Axum · SQLite (+FTS5/sqlite-vec) · ffmpeg sidecar · 系统钥匙串 |
| 国际化 | i18next |

## 项目结构

```
mofa-studio/
├── src/                    # 前端源代码
│   ├── components/         # 可复用组件
│   ├── pages/              # 页面组件
│   ├── hooks/              # 自定义 Hooks
│   ├── stores/             # Zustand 状态管理
│   ├── services/           # API 服务（mock/real 双轨）
│   ├── types/              # TypeScript 类型定义
│   ├── theme/              # 主题配置
│   ├── i18n/               # 国际化配置
│   ├── floating/           # 悬浮窗口组件
│   └── tracing/            # 会话链路追踪
├── src-tauri/              # Tauri 壳层（托盘/悬浮球/窗口管理）
├── docs/
│   └── prd/                # 产品需求文档（中英双语）
└── public/                 # 静态资源
```

> [PRD](docs/prd/README.zh-CN.md) 中描述的内嵌 Axum 后端（server-core）为规划项；当前壳层保持轻量，业务逻辑经由服务层运行。

## 快速开始

### 环境要求

- Node.js 18+
- Deno (推荐) 或 pnpm/npm
- Rust 1.90+
- 系统依赖参考 [Tauri 官方文档](https://tauri.app/start/prerequisites/)

### 安装依赖

```bash
deno install
```

### 开发模式

```bash
# 启动前端开发服务器
deno task dev

# 启动 Tauri 开发模式（包含前端）
deno task tauri-dev
```

### 构建发布

```bash
# 构建前端
deno task build

# 构建 Tauri 应用
deno task tauri-build
```

## 配置

### 环境变量

复制 `.env.example` 为 `.env` 并配置：

```bash
cp .env.example .env
```

主要配置项：
- `VITE_APP_SERVER_URL` - 后端服务地址
- `VITE_APP_ENABLE_MOCK` - Mock 数据开关
- `VITE_APP_FLOATING_MODE` - 启动模式（`floating` 悬浮球 / `window` 窗口）
- `VITE_APP_TITLE` - 应用标题

## 许可证

本项目采用商业源代码许可协议。详见 [LICENSE](LICENSE) 文件。

**重要提示：**
- 本软件仅授权查看源代码，用于个人学习或研究目的
- 禁止复制、修改、分发或商业使用
- 如需商业许可，请联系版权持有者

## 致谢

我们衷心感谢以下人士和团队对本项目的支持与贡献：

- **吴博士** - 在项目开发过程中提供了宝贵的指导、支持与启发。
- **mofa-org 团队** - 感谢他们的专注、协作与贡献，使本项目得以实现。
