# 06 平台底座（Platform Foundation · PLAT 域）

> 支撑全部业务域的基础设施：Rust 同构后端、模型网关、数据引擎、桌面壳、可观测性。

## 域概览

| ID | 需求 | 优先级 | 里程碑 |
|----|------|--------|--------|
| PLAT-01 | 内嵌 Axum 后端（同构） | P0 | M1 |
| PLAT-02 | llm-gateway 模型网关 | P0 | M1 |
| PLAT-03 | 模型分层路由策略 | P1 | M2 |
| PLAT-04 | BYOK 密钥保险库 | P0 | M1 |
| PLAT-05 | 配额与余额管理 | P0 | M1 |
| PLAT-06 | 统一 Asset 数据模型 | P0 | M1 |
| PLAT-07 | SQLite 数据引擎 | P0 | M1 |
| PLAT-08 | 账号体系决策 | P0 | M1 |
| PLAT-09 | 存储空间管理 | P1 | M2 |
| PLAT-10 | 备份导入导出 | P1 | M3 |
| PLAT-11 | 桌面壳体验 | P1 | M1–M2 |
| PLAT-12 | ffmpeg sidecar 集成 | P1 | M2 |
| PLAT-13 | 全局导航 IA 规格 | P0 | M1 |
| PLAT-14 | 专家模式收纳 | P0 | M1 |
| PLAT-15 | 链路追踪与用量观测 | P1 | M1–M2 |
| PLAT-16 | 多端预留 | P2 | 持续 |

---

## PLAT-01 内嵌 Axum 后端（同构架构）
- **用户故事**：作为用户，我不装任何外部服务，打开应用一切功能可用。
- **功能描述**：`server-core` crate 以 Axum 实现 REST/SSE/WS 全量 API；桌面模式下由 Tauri 拉起监听 `127.0.0.1:<动态端口>`；同一 workspace 可编译 `mofa-server` 独立二进制（未来自托管/Web 版）。
- **约束**：前端永不直连厂商 API——统一经网关代理（密钥安全 + CORS + 计量）。
- **验收**：断网状态下本地功能（工作流编辑/画廊/设置）完整可用；独立二进制通过同一 OpenAPI 契约测试。

## PLAT-02 llm-gateway 模型网关
- **功能描述**：
  - 统一适配层：OpenAI 兼容归一化；130+ 厂商配置从前端 `providerConfigs.ts` 迁移为后端配置表
  - SSE 流式中继（对话/生成）；非流式代理（图像/视频等）
  - 用量计量：每次调用记录 model / tokens_in / tokens_out / cost / duration / status
- **选型说明**：自研而非集成 LiteLLM(Python)/One-API(Go)——避免外部运行时依赖，BYOK 直连无需复杂路由。论证见 09 §5。
- **验收**：新增一个 OpenAI 兼容厂商仅需一条配置记录；流式转发无缓冲卡顿。

## PLAT-03 模型分层路由策略
- 规划用强模型、执行用快模型的默认策略（对标 WorkBuddy 务实策略）；用户可改。
- **任务级手动切换**：会话/任务/项目均可下拉指定模型，未指定则继承上级默认。P1。

## PLAT-04 BYOK 密钥保险库
- 密钥写入 OS 钥匙串（keyring crate：macOS Keychain / Windows Credential Manager）。
- **硬性约束**：渲染层永不接触明文密钥；所有请求由 Rust 层注入凭证；日志脱敏。
- 验收：内存 dump 与前端 storage 中检索不到任何明文 Key。

## PLAT-05 配额与余额管理
- **用户故事**：Key 快用完或被限流时，我要提前知道而不是任务中途挂掉。
- **功能描述**：支持查询余额的厂商显示余量；用量告警阈值（默认 80%）；429/限流指数退避自动重试；多 Key 故障转移（同厂商备 Key 自动切换）；失败任务标记缺额原因。
- **验收**：模拟 429 时任务不中断且退避可见；主 Key 失效切换备用 Key ≤5s。

## PLAT-06 统一 Asset 数据模型
- **背景**：作品画廊/上传素材/任务交付物/Skills/SOP/灵感案例曾散落四处定义——落地必返工。
- **规格**：

```sql
Asset {
  id, type,        -- image|video|audio|doc|sheet|slide|skill|sop|case|file
  source,          -- chat|studio|task|flow|tool|import
  title, meta_json, ref_path, created_at, tags[]
}
```

- 单表索引 + 类型扩展表；全域能力挂接：画廊筛选(type×source 二维)、右键动作（压缩/转码/转 GIF/发送到对话）、灵感发布（case 类型绑定配置包）。
- **验收**：任一产物可在画廊按来源与类型组合检索；跨域流转（如任务产物发到对话）零拷贝引用。

## PLAT-07 SQLite 数据引擎
rusqlite 直连；WAL 模式；FTS5 全文检索（会话/文档）；sqlite-vec 向量检索（记忆/RAG）；向量后端 trait 抽象（远期云部署切 pgvector/Qdrant 不改上层）。大文件落盘 assets 目录 + DB 索引。

## PLAT-08 账号体系决策
- **决策**：M1 完全免登录纯本地运行，无游客/正式之分；现有 Auth 页面与 RouteGuard 收入专家模式。
- **数据归属**：本地单机数据即用户资产，随备份包迁移。
- **云账号预留**：仅当未来启用云同步/团队功能时引入；鉴权契约按 Bearer Token/PAT 设计（见 PLAT-16），本期不实现登录 UI。
- **代码处置**：`src/pages/auth/` 冻结保留；`useUserStore` 简化为本地 profile。

## PLAT-09 存储空间管理
容量统计面板（分类占比：素材/模型缓存/数据库/日志）；一键清理（缓存/回收站）；自定义存储位置（外置盘场景常见于创作者）；删除进回收站可恢复。P1。

## PLAT-10 备份导入导出
配置+索引导出为备份包（密钥默认**不含**，单独显式勾选）；导入恢复。同步原则预告（远期云同步）：仅配置与索引上云，大文件素材不同步；冲突策略=最后写入胜出+本地版本留痕。

## PLAT-11 桌面壳体验
- **浮窗助手强化**：截图提问（screenshots crate 选区捕获→自动带入对话识图）；划词唤起（全局快捷键触发选中文本问答）。
- **托盘常驻**：显示主窗 / 浮窗 / 自动化运行状态 / 退出；关窗最小化到托盘，自动化任务续跑。
- **全局快捷键**：呼出/隐藏主窗、截图提问、快速输入（现有 floating.html 浮球体系升级）。
- **代码映射**：`src-tauri/src/tray.rs` 已有托盘菜单、`src/floating/FloatingApp.tsx`（944 行浮球）。

## PLAT-12 ffmpeg sidecar 集成
播客合成/视频转 GIF/转码共用；macOS universal 与 Windows NSIS 内置打包（体积可控），低配渠道按需下载备选（08 风险 R3）。版本锁定与完整性校验。

## PLAT-13 全局导航 IA 规格
七入口结构见 01 §4；实现约束：
- 能力双入口单实例（路由复用，不复制页面状态）
- 三模式导航徽标引导成熟度漏斗（助理有未读灵感、项目可从对话一键升级）
- 专家模式开关持久化于设置 store

## PLAT-14 专家模式收纳
- **收纳范围**：组织架构、角色权限、审计日志、渠道管理、压测、监控告警、系统设置等存量 B 端页面整体挂载至 `/expert/*` 路由组，入口由设置开关控制。
- **处置原则**：功能冻结迭代，仅保障可用；Providers 管理页改造为 C 端「模型服务」设置（BYOK 主界面）。
- **验收**：默认视图无任何 B 端入口；开启后原功能全部可达。

### 附录 · API Domain 处置清单
`src/services/` 下约 30 个 mock/real 双轨域的处置分类：

| 处置 | 域 | 说明 |
|------|-----|------|
| 保留改造 | conversations, chat, providers, knowledge, prompts, skills, workflows, scheduler | C 端主线，逐步切真实内嵌 API |
| 收入专家模式 | agents(admin), skillHub(admin), testsets, load-test, channels, octos, organization, system, audit, monitoring, evaluation | 冻结迭代 |
| 废弃 | 其余纯管理向 mock 域 | 随专家模式边界确认后清理 |

## PLAT-15 链路追踪与用量观测
- **用户故事**：作为 BYOK 用户，我想看到每次 AI 调用的完整链路——哪个会话/任务触发了什么模型、耗时多少、花了多少钱、成败与否——以便诊断问题、核算成本。
- **Span 模型**：

```
trace(root: 一次用户动作)
 ├─ span: llm_call      {model, tokens_in/out, cost, duration, status}
 ├─ span: tool_call     {connector, action, args_summary, result_status}
 ├─ span: node_exec     {flow_id, node_id, cache_hit, duration}
 └─ span: retrieval     {source_count, top_k, latency}   # RAG/搜索
```

- **三域埋点**：CHAT 对话轮次 / TASK 任务步骤（agent-runtime 事件溯源天然产出）/ FLOW 节点执行。trace_id 贯穿会话→任务→工作流跨域调用。
- **用户面板「用量与日志」**：按时间/来源/模型过滤；成本汇总仪表（日/周/月 + 按模型分列）；失败请求详情（错误原因/重试建议）；点击 span 查看请求摘要。
- **隐私分级**：默认仅记录元数据（不含提示词与生成原文）；全文记录需设置中显式开启并二次确认。
- **留存策略**：本地 SQLite 存储，默认保留 90 天可配置；到期自动清理。
- **导出**：OpenTelemetry OTLP 可选导出（默认关闭，面向高级用户对接自有观测栈）；JSON/CSV 手动导出。
- **代码映射**：升级 `src/tracing/` 会话级雏形与 `/tracing` 页面为上述完整形态；后端埋点在 llm-gateway 与 flow-engine 统一注入。
- **优先级**：P1；M1 交付 span 数据层，M2 交付用户面板。
- **验收**：一次项目任务可在面板还原完整调用树；成本汇总与厂商账单误差 ±5% 内。

## PLAT-16 多端预留
API 全部 REST/SSE/WS 无 Cookie 依赖 → Bearer Token/PAT 鉴权契约；CORS 白名单；接口幂等与游标分页规范纳入 OpenAPI 契约。
**桌面专属能力清单**（Web 版不可用，走 Tauri command 隔离）：浮窗/截图/划词/全局快捷键/托盘/文件白名单写入/钥匙串。
