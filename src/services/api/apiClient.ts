/**
 * API 客户端封装
 * 基于 axios 的 HTTP 客户端
 * 参考 slash-admin 的实现
 */

import axios, {
  type AxiosRequestConfig,
  type AxiosResponse,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import { message } from 'antd';

// ==================== 类型定义 ====================

export interface ApiResponse<T = unknown> {
  code: number;
  data: T;
  message: string;
}

export interface ApiError {
  code: number;
  message: string;
  details?: Record<string, unknown>;
}

export type RequestConfig = AxiosRequestConfig & {
  showError?: boolean;
  errorMessage?: string;
};

// ==================== 配置 ====================

const DEFAULT_CONFIG: AxiosRequestConfig = {
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 50000,
  headers: {
    'Content-Type': 'application/json;charset=utf-8',
  },
};

// ==================== 创建实例 ====================

const axiosInstance = axios.create(DEFAULT_CONFIG);

// ==================== 请求拦截器 ====================

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 添加 Token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 添加语言
    const language = localStorage.getItem('language') || 'zh-CN';
    config.headers['Accept-Language'] = language;

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
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
    if ('code' in data) {
      if (data.code === 0 || data.code === 200) {
        return data.data;
      }

      // 业务错误
      const errorMsg = data.message || '请求失败';
      message.error(errorMsg);
      return Promise.reject(new Error(errorMsg));
    }

    // 直接返回数据
    return data;
  },
  (error: AxiosError<ApiResponse>) => {
    const { response } = error;

    let errorMessage = '网络请求失败';

    if (response) {
      switch (response.status) {
        case 400:
          errorMessage = '请求参数错误';
          break;
        case 401:
          errorMessage = '未授权，请重新登录';
          // 清除 token 并跳转登录页
          localStorage.removeItem('token');
          window.location.href = '/login';
          break;
        case 403:
          errorMessage = '拒绝访问';
          break;
        case 404:
          errorMessage = '请求的资源不存在';
          break;
        case 500:
          errorMessage = '服务器内部错误';
          break;
        case 502:
          errorMessage = '网关错误';
          break;
        case 503:
          errorMessage = '服务不可用';
          break;
        case 504:
          errorMessage = '网关超时';
          break;
        default:
          errorMessage = response.data?.message || `请求失败 (${response.status})`;
      }
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = '请求超时';
    } else if (error.message === 'Network Error') {
      errorMessage = '网络连接失败';
    }

    message.error(errorMessage);
    return Promise.reject(error);
  }
);

// ==================== API 客户端类 ====================

class ApiClient {
  /**
   * GET 请求
   */
  get<T = unknown>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  /**
   * POST 请求
   */
  post<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  /**
   * PUT 请求
   */
  put<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  /**
   * PATCH 请求
   */
  patch<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'PATCH', url, data });
  }

  /**
   * DELETE 请求
   */
  delete<T = unknown>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'DELETE', url });
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
    config?: RequestConfig
  ): Promise<T> {
    const formData = file instanceof FormData ? file : new FormData();
    if (file instanceof File) {
      formData.append('file', file);
    }

    return this.request<T>({
      ...config,
      method: 'POST',
      url,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent: { loaded: number; total?: number }) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
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
    config?: RequestConfig
  ): Promise<void> {
    return this.request<Blob>({
      ...config,
      method: 'GET',
      url,
      responseType: 'blob',
    }).then((blob) => {
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    });
  }
}

// ==================== 导出 ====================

export const apiClient = new ApiClient();

export default apiClient;

// 便捷方法
export const get = apiClient.get.bind(apiClient);
export const post = apiClient.post.bind(apiClient);
export const put = apiClient.put.bind(apiClient);
export const patch = apiClient.patch.bind(apiClient);
export const del = apiClient.delete.bind(apiClient);
export const upload = apiClient.upload.bind(apiClient);
export const download = apiClient.download.bind(apiClient);
