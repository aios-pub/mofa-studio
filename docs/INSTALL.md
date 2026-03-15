# 安装指南

## 环境要求

- Node.js >= 18
- pnpm

## 安装方式

### 使用 pnpm（推荐）

```bash
# 安装 pnpm（如未安装）
npm install -g pnpm

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

## 注意事项

- 如果是 Tauri 开发，还需要安装 Rust：https://tauri.app/zh-cn/start/prerequisites
- `.env.example` 文件中包含环境变量配置，复制为 `.env` 并按需修改
