/**
 * 压测 API 服务
 * 后端端点: /api/testset/load-test/...
 */

import { apiClient } from "../api/apiClient";

// ==================== 类型定义 ====================

interface LoadTestConfig {
  test_set_id: string;
  name: string;
  concurrent_users: number;
  duration: number;
  ramp_up: number;
  target_rps?: number;
}

interface LoadTestMetric {
  timestamp: number;
  active_users: number;
  requests_per_second: number;
  avg_response_time: number;
  p50_response_time: number;
  p95_response_time: number;
  p99_response_time: number;
  error_rate: number;
  total_requests: number;
  failed_requests: number;
}

interface LoadTest {
  id: string;
  test_set_id: string;
  name: string;
  status: "pending" | "running" | "paused" | "stopped" | "completed" | "failed";
  config: {
    concurrent_users: number;
    duration: number;
    ramp_up: number;
    target_rps?: number;
  };
  metrics?: LoadTestMetric[];
  start_time?: number;
}

// 后端实际返回的 LoadTestRuntimeStateDTO
interface BackendLoadTestRuntimeState {
  load_test_id: string;
  test_set_id: string;
  name: string;
  status: string;
  config: {
    concurrent_users: number;
    duration: number;
    ramp_up_time: number;
    target_rps?: number;
  };
  metrics: BackendLoadTestMetric[];
  start_time?: number;
}

interface BackendLoadTestMetric {
  timestamp: string;
  active_users: number;
  requests_per_second: number;
  avg_response_time: number;
  p50_response_time: number;
  p95_response_time: number;
  p99_response_time: number;
  error_rate: number;
  total_requests: number;
  failed_requests: number;
}

// ==================== 数据映射 ====================

function mapLoadTest(raw: BackendLoadTestRuntimeState): LoadTest {
  return {
    id: raw.load_test_id,
    test_set_id: raw.test_set_id,
    name: raw.name,
    status: raw.status as LoadTest["status"],
    config: {
      concurrent_users: raw.config.concurrent_users,
      duration: raw.config.duration,
      ramp_up: raw.config.ramp_up_time,
      target_rps: raw.config.target_rps,
    },
    metrics: raw.metrics?.map(mapLoadTestMetric),
    start_time: raw.start_time,
  };
}

function mapLoadTestMetric(raw: BackendLoadTestMetric): LoadTestMetric {
  return {
    timestamp: new Date(raw.timestamp).getTime(),
    active_users: raw.active_users,
    requests_per_second: raw.requests_per_second,
    avg_response_time: raw.avg_response_time,
    p50_response_time: raw.p50_response_time,
    p95_response_time: raw.p95_response_time,
    p99_response_time: raw.p99_response_time,
    error_rate: raw.error_rate,
    total_requests: raw.total_requests,
    failed_requests: raw.failed_requests,
  };
}

// ==================== API ====================

const loadTestRealApi = {
  // ==================== LoadTest CRUD ====================

  create: async (data: LoadTestConfig, targetUrl: string): Promise<LoadTest> => {
    const raw = await apiClient.post<{ id: string; result: string }>("/api/testset/load-test/create", {
      test_set_id: data.test_set_id,
      name: data.name,
      concurrent_users: data.concurrent_users,
      duration: data.duration,
      ramp_up_time: data.ramp_up,
      target_rps: data.target_rps,
      target_url: targetUrl,
    });
    // 后端创建后直接启动，构造本地状态
    return {
      id: raw.id,
      test_set_id: data.test_set_id,
      name: data.name,
      status: "running",
      config: {
        concurrent_users: data.concurrent_users,
        duration: data.duration,
        ramp_up: data.ramp_up,
        target_rps: data.target_rps,
      },
    };
  },

  getById: async (id: string): Promise<LoadTest> => {
    const raw = await apiClient.get<BackendLoadTestRuntimeState>(`/api/testset/load-test/${id}`);
    return mapLoadTest(raw);
  },

  start: async (id: string): Promise<void> => {
    await apiClient.post(`/api/testset/load-test/${id}/start`, {});
  },

  stop: async (id: string): Promise<void> => {
    await apiClient.post(`/api/testset/load-test/${id}/stop`, {});
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/testset/load-test/${id}/delete`);
  },

  getMetrics: async (id: string): Promise<LoadTestMetric[]> => {
    const rawList = await apiClient.get<BackendLoadTestMetric[]>(
      `/api/testset/load-test/${id}/metrics`,
    );
    return rawList.map(mapLoadTestMetric);
  },

  // ==================== 获取测试集的压测列表 ====================

  getByTestSet: async (_testSetId: string): Promise<LoadTest[]> => {
    const rawList = await apiClient.get<BackendLoadTestRuntimeState[]>(
      "/api/testset/load-test/all",
    );
    return rawList.map(mapLoadTest);
  },

  // ==================== 获取所有压测任务 ====================

  getAll: async (): Promise<LoadTest[]> => {
    const rawList = await apiClient.get<BackendLoadTestRuntimeState[]>(
      "/api/testset/load-test/all",
    );
    return rawList.map(mapLoadTest);
  },
};

export { loadTestRealApi };
export type { LoadTest, LoadTestConfig, LoadTestMetric };
