/**
 * API client wrapper
 * HTTP client based on axios
 */

import axios, {
  type AxiosRequestConfig,
  type AxiosResponse,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import { message } from "antd";
import { GLOBAL_CONFIG, isLocalMode, isMockEnabled } from "@/config";
import { silentRelogin } from "@/services/localAuth";

// ==================== Type definitions ====================

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
  useMock?: boolean; // whether this request uses mock
};

// ==================== Configuration ====================

const DEFAULT_CONFIG: AxiosRequestConfig = {
  // No static baseURL: the embedded Tauri server address is only known
  // after the local-server bootstrap resolves, so it is applied per
  // request in the interceptor below
  timeout: GLOBAL_CONFIG.apiTimeout || 50000,
  headers: {
    "Content-Type": "application/json;charset=utf-8",
  },
};

// ==================== Instance creation ====================

const axiosInstance = axios.create(DEFAULT_CONFIG);

// ==================== Utilities ====================

/**
 * Generate UUID v4
 */
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Recursively convert time strings in an object to Date objects
 * Match common datetime field names (created_at, updated_at, published_at, etc.)
 * and fields ending with _at, _time, _on
 */
function convertDateFields<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(convertDateFields) as T;
  }

  // Only handle plain objects
  if (typeof data !== "object") {
    return data;
  }

  const result: any = {};
  for (const key in data) {
    if (!Object.prototype.hasOwnProperty.call(data, key)) {
      continue;
    }

    const value = (data as any)[key];
    const lowerKey = key.toLowerCase();

    // Determine whether the field is a datetime field
    const isDateField =
      lowerKey.endsWith("_at") ||
      lowerKey.endsWith("_time") ||
      lowerKey.endsWith("_on") ||
      lowerKey === "createdat" ||
      lowerKey === "updatedat" ||
      lowerKey === "publishedat" ||
      lowerKey === "timestamp";

    if (isDateField && typeof value === "string" && value) {
      // Handle PostgreSQL time format: "2026-04-21 08:36:02.753513"
      // Replace the space with T to conform to ISO 8601
      let dateStr = value;
      if (dateStr.includes(' ') && !dateStr.includes('T')) {
        dateStr = dateStr.replace(' ', 'T');
        // If no timezone info, append Z for UTC
        if (!dateStr.includes('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
          dateStr += 'Z';
        }
      }

      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        result[key] = parsed;
      } else {
        result[key] = convertDateFields(value);
      }
    } else {
      result[key] = convertDateFields(value);
    }
  }
  return result;
}


// ==================== Request interceptor ====================

/**
 * Get token from zustand persist storage
 */
function getAccessToken(): string | null {
  try {
    const stored = localStorage.getItem("mofa-studio-user-store");
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
 * Clear user authentication info
 */
function clearAuth() {
  localStorage.removeItem("mofa-studio-user-store");
  // Also clear the legacy token format (if any)
  localStorage.removeItem("token");
}

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Resolve the base URL per request: the embedded server URL may be set
    // after module load by the local-server bootstrap
    if (!config.baseURL) {
      config.baseURL = GLOBAL_CONFIG.serverURL || "/api";
    }

    // Add token - read from zustand persist storage
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add language
    const language = localStorage.getItem("language") || "zh-CN";
    config.headers["Accept-Language"] = language;

    // Add trace ID header (X_REQUEST_ID)
    config.headers["X_REQUEST_ID"] = generateUUID();

    // Do not set Content-Type for FormData requests; let the browser set it with the boundary
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

// ==================== Response interceptor ====================

axiosInstance.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>): any => {
    const { data } = response;

    // Blob / ArrayBuffer responses are returned as-is without JSON key/date conversion
    if (
      response.config.responseType === "blob" ||
      response.config.responseType === "arraybuffer"
    ) {
      return data;
    }

    // Debug: Log publish endpoint response
    if (response.config.url?.includes('/publish')) {
      console.log('[apiClient] Raw publish response:', data);
      console.log('[apiClient] Response data field:', data.data);
    }

    // If the response is the data itself, return it
    if (data === undefined || data === null) {
      return response.data;
    }

    // If there is a code field, check the business status code
    if ("code" in data) {
      if (data.code === 0 || data.code === 200) {
        const converted = convertDateFields(data.data);
        if (response.config.url?.includes('/publish')) {
          console.log('[apiClient] Converted publish result:', converted);
        }
        return converted;
      }

      // Business error - use the msg returned by the backend
      const errorMsg = data.msg || "请求失败";
      return Promise.reject(new Error(errorMsg));
    }

    // Return the data directly, only converting time fields
    return convertDateFields(data);
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
          if (isLocalMode()) {
            // Local-first mode has no login screen: silently re-mint the
            // local session (e.g. after the JWT secret rotated)
            errorMessage = "本地会话已续期，请重试";
            void silentRelogin();
          } else {
            errorMessage = "未授权，请重新登录";
            // Clear auth info and redirect to the login page
            clearAuth();
            window.location.href = "/auth/login";
          }
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

// ==================== API client class ====================

class ApiClient {
  /**
   * Get base URL (dynamic: may point at the embedded Tauri server)
   */
  getBaseUrl(): string {
    return GLOBAL_CONFIG.serverURL || axiosInstance.defaults.baseURL || "";
  }

  /**
   * Get the current token
   */
  getToken(): string | null {
    return getAccessToken();
  }

  /**
   * GET request
   */
  get<T = unknown>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: "GET", url });
  }

  /**
   * POST request
   */
  post<T = unknown>(
    url: string,
    data?: unknown,
    config?: RequestConfig,
  ): Promise<T> {
    return this.request<T>({ ...config, method: "POST", url, data });
  }

  /**
   * PUT request
   */
  put<T = unknown>(
    url: string,
    data?: unknown,
    config?: RequestConfig,
  ): Promise<T> {
    return this.request<T>({ ...config, method: "PUT", url, data });
  }

  /**
   * PATCH request
   */
  patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: RequestConfig,
  ): Promise<T> {
    return this.request<T>({ ...config, method: "PATCH", url, data });
  }

  /**
   * DELETE request
   */
  delete<T = unknown>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: "DELETE", url });
  }

  /**
   * Generic request method
   */
  request<T = unknown>(config: RequestConfig): Promise<T> {
    return axiosInstance.request<any, T>(config);
  }

  /**
   * Upload file
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
   * Download file
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

// ==================== Export ====================

export const apiClient = new ApiClient();

// Export auth helpers
export { getAccessToken, clearAuth };

export default apiClient;

// Convenience methods
export const get = apiClient.get.bind(apiClient);
export const post = apiClient.post.bind(apiClient);
export const put = apiClient.put.bind(apiClient);
export const patch = apiClient.patch.bind(apiClient);
export const del = apiClient.delete.bind(apiClient);
export const upload = apiClient.upload.bind(apiClient);
export const download = apiClient.download.bind(apiClient);

// Export mock flag for use by other modules
export { isMockEnabled };
