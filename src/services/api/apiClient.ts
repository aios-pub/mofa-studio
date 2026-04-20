/**
 * API 客户端封装
 * 基于 axios 的 HTTP 客户端
 */

import axios, {
  type AxiosRequestConfig,
  type AxiosResponse,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import { message } from "antd";
import { GLOBAL_CONFIG, isMockEnabled } from "@/config";

// ==================== 类型定义 ====================

export interface ApiResponse<T = unknown> {
  code: number;
  data: T;
  msg: string;
}

export interface ApiError {
  code: number;
  message: string;
  details?: Record<string, unknown>;
}

export type RequestConfig = AxiosRequestConfig & {
  showError?: boolean;
  errorMessage?: string;
  useMock?: boolean; // 单独请求是否使用 mock
};

// ==================== 配置 ====================

const DEFAULT_CONFIG: AxiosRequestConfig = {
  baseURL: GLOBAL_CONFIG.serverURL || "/api",
  timeout: GLOBAL_CONFIG.apiTimeout || 50000,
  headers: {
    "Content-Type": "application/json;charset=utf-8",
  },
};

// ==================== 创建实例 ====================

const axiosInstance = axios.create(DEFAULT_CONFIG);

// ==================== 工具函数 ====================

/**
 * 生成 UUID v4
 */
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ==================== 请求拦截器 ====================

/**
 * 从 zustand persist storage 获取 token
 */
function getAccessToken(): string | null {
  try {
    const stored = localStorage.getItem("AMOS-claw-user-store");
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.state?.userToken?.accessToken || null;
    }
  } catch (e) {
    console.error("Failed to parse token from storage:", e);
  }
  return null;
}

/**
 * 清除用户认证信息
 */
function clearAuth() {
  localStorage.removeItem("AMOS-claw-user-store");
  // 同时也清除旧格式的 token（如果有）
  localStorage.removeItem("token");
}

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 添加 Token - 从 zustand persist storage 读取
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 添加语言
    const language = localStorage.getItem("language") || "zh-CN";
    config.headers["Accept-Language"] = language;

    // 添加链路追踪 ID (X_REQUEST_ID)
    config.headers["X_REQUEST_ID"] = generateUUID();

    // FormData 请求不要设置 Content-Type，让浏览器自动设置带 boundary 的值
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
      // Debug: Log FormData requests
      console.log('[apiClient] FormData request:', {
        url: config.url,
        method: config.method,
        entries: Array.from(config.data.entries()).map(([key, value]) => {
          if (value instanceof File) {
            return [key, `File: ${value.name}, size: ${value.size}, type: ${value.type}`];
          }
          return [key, value];
        }),
      });
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

// ==================== 响应拦截器 ====================

axiosInstance.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>): any => {
    const { data } = response;

    // 如果响应直接是数据，返回
    if (data === undefined || data === null) {
      return response.data;
    }

    // 如果有 code 字段，检查业务状态码
    if ("code" in data) {
      if (data.code === 0 || data.code === 200) {
        return data.data;
      }

      // 业务错误 — 使用后端返回的 msg
      const errorMsg = data.msg || "请求失败";
      return Promise.reject(new Error(errorMsg));
    }

    // 直接返回数据
    return data;
  },
  (error: AxiosError<ApiResponse>) => {
    const { response } = error;

    let errorMessage = "网络请求失败";

    if (response) {
      switch (response.status) {
        case 400:
          errorMessage = "请求参数错误";
          break;
        case 401:
          errorMessage = "未授权，请重新登录";
          // 清除认证信息并跳转登录页
          clearAuth();
          window.location.href = "/auth/login";
          break;
        case 403:
          errorMessage = "拒绝访问";
          break;
        case 404:
          errorMessage = "请求的资源不存在";
          break;
        case 500:
          errorMessage = "服务器内部错误";
          break;
        case 502:
          errorMessage = "网关错误";
          break;
        case 503:
          errorMessage = "服务不可用";
          break;
        case 504:
          errorMessage = "网关超时";
          break;
        default:
          errorMessage =
            response.data?.msg || `请求失败 (${response.status})`;
      }
    } else if (error.code === "ECONNABORTED") {
      errorMessage = "请求超时";
    } else if (error.message === "Network Error") {
      errorMessage = "网络连接失败";
    }

    message.error(errorMessage);
    return Promise.reject(error);
  },
);

// ==================== API 客户端类 ====================

class ApiClient {
  /**
   * 获取基础 URL
   */
  getBaseUrl(): string {
    return axiosInstance.defaults.baseURL || "";
  }

  /**
   * 获取当前 Token
   */
  getToken(): string | null {
    return getAccessToken();
  }

  /**
   * GET 请求
   */
  get<T = unknown>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: "GET", url });
  }

  /**
   * POST 请求
   */
  post<T = unknown>(
    url: string,
    data?: unknown,
    config?: RequestConfig,
  ): Promise<T> {
    return this.request<T>({ ...config, method: "POST", url, data });
  }

  /**
   * PUT 请求
   */
  put<T = unknown>(
    url: string,
    data?: unknown,
    config?: RequestConfig,
  ): Promise<T> {
    return this.request<T>({ ...config, method: "PUT", url, data });
  }

  /**
   * PATCH 请求
   */
  patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: RequestConfig,
  ): Promise<T> {
    return this.request<T>({ ...config, method: "PATCH", url, data });
  }

  /**
   * DELETE 请求
   */
  delete<T = unknown>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: "DELETE", url });
  }

  /**
   * 通用请求方法
   */
  request<T = unknown>(config: RequestConfig): Promise<T> {
    return axiosInstance.request<any, T>(config);
  }

  /**
   * 上传文件
   */
  upload<T = unknown>(
    url: string,
    file: File | FormData,
    onProgress?: (percent: number) => void,
    config?: RequestConfig,
  ): Promise<T> {
    const formData = file instanceof FormData ? file : new FormData();
    if (file instanceof File) {
      formData.append("file", file);
    }

    return this.request<T>({
      ...config,
      method: "POST",
      url,
      data: formData,
      onUploadProgress: (progressEvent: { loaded: number; total?: number }) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          onProgress(percent);
        }
      },
    });
  }

  /**
   * 下载文件
   */
  download(
    url: string,
    filename?: string,
    config?: RequestConfig,
  ): Promise<void> {
    return this.request<Blob>({
      ...config,
      method: "GET",
      url,
      responseType: "blob",
    }).then((blob) => {
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    });
  }
}

// ==================== 导出 ====================

export const apiClient = new ApiClient();

// 导出认证辅助函数
export { getAccessToken, clearAuth };

export default apiClient;

// 便捷方法
export const get = apiClient.get.bind(apiClient);
export const post = apiClient.post.bind(apiClient);
export const put = apiClient.put.bind(apiClient);
export const patch = apiClient.patch.bind(apiClient);
export const del = apiClient.delete.bind(apiClient);
export const upload = apiClient.upload.bind(apiClient);
export const download = apiClient.download.bind(apiClient);

// 导出 mock 开关状态，方便其他模块使用
export { isMockEnabled };
