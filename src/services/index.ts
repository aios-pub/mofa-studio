/**
 * 统一服务入口
 * 根据 enableMock 配置自动切换 mock 和真实 API
 */

// 导出所有智能服务（自动切换 mock/real）
export * from "./service";

// 导出 API 客户端
export * from "./api";
