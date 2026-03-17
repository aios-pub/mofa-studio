# AmosClaw

AmosClaw 是一款基于 Tauri 构建的桌面 AI 助手应用，集成了智能体管理、对话交互、工作流编排等功能，并提供了独特的悬浮桌宠交互体验。

## 功能特性

### 桌面悬浮助手
- 可拖拽的悬浮球，支持边缘自动吸附
- 可爱的桌宠互动（喂食、玩耍、睡觉）
- 气泡消息提示
- 快速输入，一键发起对话
- 右键菜单快捷操作

### 工作台
- 仪表盘概览
- AI 对话界面
- 历史记录管理

### 资源管理
- **智能体管理** - 创建和配置 AI 智能体
- **提示词管理** - 管理和版本化提示词模板
- **技能管理** - 定义智能体可使用的技能
- **测试集管理** - 管理测试用例
- **提供者管理** - 配置 AI 模型提供者
- **渠道管理** - 管理模型调用渠道
- **定时任务** - 配置计划任务

### 监控与分析
- 使用分析统计
- 实时监控面板
- 追踪记录查看
- 评估测试报告

### 工作流
- 可视化工作流编辑器
- 工作流列表管理

### 知识库
- 知识库创建与管理

### 组织与系统
- 用户管理
- 部门管理
- 角色权限管理
- 菜单配置
- 审计日志
- 系统设置
- 资源管理

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Tauri 2.x + React 19 |
| 语言 | TypeScript 5.8 |
| 构建工具 | Vite 7 |
| UI 组件 | Ant Design 5 |
| 样式 | Tailwind CSS 4 |
| 状态管理 | Zustand 5 |
| 路由 | React Router 7 |
| 国际化 | i18next |
| 动画 | Framer Motion |
| 工作流图形 | XYFlow |
| HTTP 客户端 | Axios |

## 项目结构

```
amos-claw/
├── src/                    # 前端源代码
│   ├── components/         # 可复用组件
│   ├── pages/              # 页面组件
│   ├── hooks/              # 自定义 Hooks
│   ├── stores/             # Zustand 状态管理
│   ├── services/           # API 服务
│   ├── types/              # TypeScript 类型定义
│   ├── utils/              # 工具函数
│   ├── theme/              # 主题配置
│   ├── i18n/               # 国际化配置
│   ├── floating/           # 悬浮窗口组件
│   └── tauri/              # Tauri 相关功能
├── src-tauri/              # Tauri 后端代码
│   ├── src/                # Rust 源代码
│   ├── icons/              # 应用图标
│   └── tauri.conf.json     # Tauri 配置
├── docs/                   # 文档
└── public/                 # 静态资源
```

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
- `VITE_API_BASE_URL` - API 基础地址
- `VITE_APP_TITLE` - 应用标题

## 许可证

本项目采用商业源代码许可协议。详见 [LICENSE](LICENSE) 文件。

**重要提示：**
- 本软件仅授权查看源代码，用于个人学习或研究目的
- 禁止复制、修改、分发或商业使用
- 如需商业许可，请联系版权持有者
