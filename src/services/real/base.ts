/**
 * Real API base utilities
 * Provides generic API method generation
 *
 * Backend API style:
 * - List: GET /api/{resource}/list or /api/{resource}/fetch
 * - Detail: GET /api/{resource}/{id} (not available for some resources)
 * - Create: POST /api/{resource}/create
 * - Update: POST /api/{resource}/update (id in body)
 * - Delete: DELETE /api/{resource}/delete/{id}
 */

import { apiClient } from "../api/apiClient";

/**
 * Create standard RESTful API methods (kept for legacy compatibility)
 * @deprecated Use createActionApi instead
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
  /** List action name, defaults to "list"; some resources use "fetch" */
  listAction?: "list" | "fetch";
  /** Whether getById is supported, defaults to true */
  hasGetById?: boolean;
}

/**
 * Create action-based API methods (matching backend API style)
 * @param basePath - Base path, e.g. "/api/agent"
 * @param listActionOrOptions - List action name or configuration options
 */
export function createActionApi<T extends { id: string }>(
  basePath: string,
  listActionOrOptions?: "list" | "fetch" | CreateActionApiOptions
) {
  // Parse parameters
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

  // If the backend supports getById, add the method
  if (hasGetById) {
    return {
      ...baseMethods,
      getById: (id: string): Promise<T> =>
        apiClient.get<T>(`${basePath}/${id}`),
    };
  }

  // If the backend does not support getById, return a warning method
  return {
    ...baseMethods,
    getById: async (_id: string): Promise<T> => {
      console.warn(`getById: Backend does not support ${basePath}/{id} endpoint`);
      // Find from the list
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
 * Create custom API method
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
