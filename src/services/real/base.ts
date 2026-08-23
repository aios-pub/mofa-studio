/**
 * 真实 API 基础工具
 * 提供通用的 API 方法生成
 *
 * 后端 API 风格：
 * - 列表: GET  /api/{resource}/list 或 /api/{resource}/fetch
 * - 详情: GET  /api/{resource}/{id} (部分资源没有)
 * - 创建: POST /api/{resource}/create
 * - 更新: POST /api/{resource}/update (id 在 body 中)
 * - 删除: DELETE /api/{resource}/delete/{id}
 */

import { apiClient } from "../api/apiClient";

/**
 * 创建标准的 RESTful API 方法 (保留兼容旧代码)
 * @deprecated 使用 createActionApi 替代
 */
export function createRestApi<T extends { id: string }>(basePath: string) {
  return {
    getAll: (): Promise<T[]> => apiClient.get<T[]>(basePath),

    getById: (id: string): Promise<T> =>
      apiClient.get<T>(`${basePath}/${id}`),

    create: (data: Partial<T>): Promise<T> =>
      apiClient.post<T>(basePath, data),

    update: (id: string, data: Partial<T>): Promise<T> =>
      apiClient.put<T>(`${basePath}/${id}`, data),

    delete: (id: string): Promise<void> =>
      apiClient.delete(`${basePath}/${id}`),
  };
}

/**
 * createActionApi Configuration options
 */
interface CreateActionApiOptions {
  /** 列表动作名，默认 "list"，某些资源使用 "fetch" */
  listAction?: "list" | "fetch";
  /** 是否支持 getById，默认 true */
  hasGetById?: boolean;
}

/**
 * 创建基于 Action 的 API 方法 (匹配后端 API 风格)
 * @param basePath - 基础路径，e.g. "/api/agent"
 * @param listActionOrOptions - 列表动作名或Configuration options
 */
export function createActionApi<T extends { id: string }>(
  basePath: string,
  listActionOrOptions?: "list" | "fetch" | CreateActionApiOptions
) {
  // 解析参数
  let listAction: "list" | "fetch" = "list";
  let hasGetById = true;

  if (typeof listActionOrOptions === "string") {
    listAction = listActionOrOptions;
  } else if (listActionOrOptions) {
    listAction = listActionOrOptions.listAction || "list";
    hasGetById = listActionOrOptions.hasGetById !== false;
  }

  const baseMethods = {
    getAll: (): Promise<T[]> =>
      apiClient.get<T[]>(`${basePath}/${listAction}`),

    create: (data: Partial<T>): Promise<T> =>
      apiClient.post<T>(`${basePath}/create`, data),

    update: (id: string, data: Partial<T>): Promise<T> =>
      apiClient.post<T>(`${basePath}/update`, { id, ...data }),

    delete: async (id: string): Promise<boolean> => {
      await apiClient.delete(`${basePath}/delete/${id}`);
      return true;
    },
  };

  // e.g.果后端支持 getById，添加该方法
  if (hasGetById) {
    return {
      ...baseMethods,
      getById: (id: string): Promise<T> =>
        apiClient.get<T>(`${basePath}/${id}`),
    };
  }

  // e.g.果后端不支持 getById，返回一个警告方法
  return {
    ...baseMethods,
    getById: async (_id: string): Promise<T> => {
      console.warn(`getById: Backend does not support ${basePath}/{id} endpoint`);
      // 从列表中查找
      const all = await baseMethods.getAll();
      const item = all.find((item: T) => item.id === _id);
      if (!item) {
        throw new Error(`Item with id ${_id} not found`);
      }
      return item;
    },
  };
}

/**
 * 创建Custom API 方法
 */
export function createApiMethod<T = unknown, R = unknown>(
  method: "get" | "post" | "put" | "patch" | "delete",
  path: string
) {
  return (data?: T): Promise<R> => {
    switch (method) {
      case "get":
        return apiClient.get<R>(path);
      case "post":
        return apiClient.post<R>(path, data);
      case "put":
        return apiClient.put<R>(path, data);
      case "patch":
        return apiClient.patch<R>(path, data);
      case "delete":
        return apiClient.delete<R>(path);
    }
  };
}
