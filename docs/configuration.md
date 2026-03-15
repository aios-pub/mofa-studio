# 应用配置说明

## 环境变量配置

项目支持通过 `.env` 文件配置不同环境。支持以下配置文件：

| 文件 | 说明 |
|------|------|
| `.env` | 默认配置，所有环境共享 |
| `.env.development` | 开发环境配置 (`deno task dev`) |
| `.env.production` | 生产环境配置 (`deno task build`) |
| `.env.local` | 本地覆盖配置，不会被 git 跟踪 |
| `.env.*.local` | 各环境本地覆盖配置 |

## 可配置项

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `VITE_APP_TITLE` | 应用标题 | `Amos-Claw` |
| `VITE_APP_VERSION` | 应用版本 | `0.1.0` |
| `VITE_APP_DEFAULT_ROUTE` | 默认路由 | `/workbench` |
| `VITE_APP_API_BASE_URL` | API 基础地址 | `/api` |
| `VITE_APP_API_TIMEOUT` | API 请求超时 (ms) | `30000` |
| `VITE_APP_ROUTER_MODE` | 路由模式 | `frontend` |
| `VITE_APP_FLOATING_MODE` | 悬浮球模式 | `window` |
| `VITE_APP_ENABLE_ANALYTICS` | 启用分析 | `false` |
| `VITE_APP_ENABLE_DEBUG` | 启用调试模式 | `true` (dev) |

## 悬浮球模式配置

`VITE_APP_FLOATING_MODE` 和 `src-tauri/app-config.json` 中的 `floatingMode` 支持两种模式：

### `floating` - 悬浮球模式

- 应用启动时显示 64x64 的悬浮球
- 悬浮球始终置顶
- 支持边缘吸附
- 点击展开快速操作菜单

### `window` - 普通窗口模式 (默认)

- 应用启动时显示标准桌面窗口
- 窗口有正常标题栏和装饰
- 窗口可以调整大小
- 悬浮球被隐藏

## 切换悬浮球模式

需要同时修改两处配置：

### 1. 前端配置

修改 `.env` 或 `.env.production` 文件：

```env
# 使用悬浮球模式
VITE_APP_FLOATING_MODE=floating

# 或使用普通窗口模式
VITE_APP_FLOATING_MODE=window
```

### 2. 后端配置

修改 `src-tauri/app-config.json` 文件：

```json
{
  "floatingMode": "floating"
}
```

或

```json
{
  "floatingMode": "window"
}
```

## 使用配置

在前端代码中使用配置：

```typescript
import { GLOBAL_CONFIG } from "@/config/global-config";

// 访问配置
console.log(GLOBAL_CONFIG.appTitle);
console.log(GLOBAL_CONFIG.isFloatingMode);
console.log(GLOBAL_CONFIG.apiBaseUrl);
```

## 配置文件位置

```
amos-claw/
├── .env                    # 默认环境变量
├── .env.development        # 开发环境变量
├── .env.production         # 生产环境变量
├── .env.example            # 示例配置
└── src-tauri/
    └── app-config.json     # Rust 端配置
```
