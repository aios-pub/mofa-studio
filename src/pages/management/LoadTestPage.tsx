/**
 * 压测配置页面
 * 用于配置和执行负载测试
 */

import { useState, useEffect, useRef } from "react";
import {
  Card,
  Form,
  Input,
  InputNumber,
  Button,
  Table,
  Tag,
  Space,
  Typography,
  Progress,
  Statistic,
  Row,
  Col,
  Modal,
  message,
  Divider,
  Select,
} from "antd";
import {
  PlayCircleOutlined,
  StopOutlined,
  EyeOutlined,
  PlusOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { loadTestRealApi } from "@/services/real/loadtest";
import type { LoadTest, LoadTestConfig, LoadTestMetric } from "@/services/real/loadtest";
import { testSetApi } from "@/services";
import type { TestSet } from "@/types/testset";
import ResizableSidebar from "@/components/layout/ResizableSidebar";

const { Title, Text } = Typography;

interface LoadTestTask extends LoadTest {
  testSetName?: string;
  startedAt?: string;
  completedAt?: string;
  results?: LoadTestResult;
  runtimeMetrics?: LoadTestMetric[];
}

interface LoadTestResult {
  totalRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  rps: number;
  errorRate: number;
}

export default function LoadTestPage() {
  const [form] = Form.useForm();
  const [tasks, setTasks] = useState<LoadTestTask[]>([]);
  const [creating, setCreating] = useState(false);
  const [selectedTask, setSelectedTask] = useState<LoadTestTask | null>(null);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [monitorModalOpen, setMonitorModalOpen] = useState(false);
  const [monitoringTaskId, setMonitoringTaskId] = useState<string | null>(null);
  const [currentMetrics, setCurrentMetrics] = useState<LoadTestMetric[]>([]);
  const [testSets, setTestSets] = useState<TestSet[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const tasksRequestIdRef = useRef(0);
  const testSetsRequestIdRef = useRef(0);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const taskPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 当前时间定时器（用于计算已运行时间）
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 实时指标轮询（替代Socket.IO，后端暂未实现广播）
  useEffect(() => {
    if (monitoringTaskId) {
      // 立即获取一次
      loadTestRealApi.getMetrics(monitoringTaskId).then((metrics) => {
        setCurrentMetrics(metrics);
        setTasks((prev) =>
          prev.map((t) => (t.id === monitoringTaskId ? { ...t, runtimeMetrics: metrics } : t))
        );
      }).catch(() => {});

      // 每1秒轮询一次
      pollIntervalRef.current = setInterval(() => {
        loadTestRealApi.getMetrics(monitoringTaskId).then((metrics) => {
          setCurrentMetrics(metrics);
          setTasks((prev) =>
            prev.map((t) => (t.id === monitoringTaskId ? { ...t, runtimeMetrics: metrics } : t))
          );
        }).catch(() => {});
      }, 1000);

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };
    } else {
      setCurrentMetrics([]);
    }
  }, [monitoringTaskId]);

  // 加载压测任务列表
  useEffect(() => {
    loadTasks();
    loadTestSets();
  }, []);

  // 轮询运行中任务的状态
  useEffect(() => {
    const hasRunningTask = tasks.some((t) => t.status === "running");
    if (hasRunningTask) {
      taskPollIntervalRef.current = setInterval(() => {
        loadTasks();
      }, 5000);

      return () => {
        if (taskPollIntervalRef.current) {
          clearInterval(taskPollIntervalRef.current);
          taskPollIntervalRef.current = null;
        }
      };
    } else {
      if (taskPollIntervalRef.current) {
        clearInterval(taskPollIntervalRef.current);
        taskPollIntervalRef.current = null;
      }
    }
  }, [tasks]);

  const loadTestSets = async () => {
    const requestId = ++testSetsRequestIdRef.current;
    try {
      const data = await testSetApi.getAll();
      if (requestId !== testSetsRequestIdRef.current) return;
      setTestSets(data);
    } catch (error) {
      if (requestId !== testSetsRequestIdRef.current) return;
      console.error("Failed to load test sets:", error);
    }
  };

  const loadTasks = async () => {
    const requestId = ++tasksRequestIdRef.current;
    try {
      const rawTasks = await loadTestRealApi.getAll();
      if (requestId !== tasksRequestIdRef.current) return;
      // 保留现有任务的运行时数据，从后端name获取testSetName
      setTasks((prevTasks) =>
        rawTasks.map((task) => {
          const prev = prevTasks.find((p) => p.id === task.id);
          return {
            ...task,
            testSetName: task.name || prev?.testSetName,
            startedAt: prev?.startedAt,
            results: prev?.results,
            runtimeMetrics: task.metrics || prev?.runtimeMetrics,
          };
        })
      );
    } catch (error) {
      if (requestId !== tasksRequestIdRef.current) return;
      console.error("Failed to load tasks:", error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadTasks(), loadTestSets()]);
    setRefreshing(false);
  };

  const handleCreate = async (values: {
    name: string;
    testSetId: string;
    targetUrl: string;
    concurrentUsers: number;
    duration: number;
    rampUpTime: number;
    targetRps?: number;
  }) => {
    setCreating(true);
    try {
      const config: LoadTestConfig = {
        test_set_id: values.testSetId,
        name: values.name,
        concurrent_users: values.concurrentUsers,
        duration: values.duration,
        ramp_up: values.rampUpTime,
        target_rps: values.targetRps,
      };
      const newTask = await loadTestRealApi.create(config, values.targetUrl);
      setTasks((prev) => [
        ...prev,
        {
          ...newTask,
          testSetName: newTask.name,
          startedAt: new Date().toISOString(),
        },
      ]);
      form.resetFields();
      message.success("压测任务已创建");
    } catch (error) {
      message.error("创建失败");
    } finally {
      setCreating(false);
    }
  };

  const handleStart = async (taskId: string) => {
    try {
      await loadTestRealApi.start(taskId);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, status: "running" as const, startedAt: new Date().toISOString() }
            : t
        )
      );
      message.success("压测任务已启动");
    } catch (error) {
      message.error("启动失败");
    }
  };

  const handleStop = async (taskId: string) => {
    Modal.confirm({
      title: "确认停止",
      content: "停止后当前压测数据将保留，是否继续？",
      okText: "停止",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          await loadTestRealApi.stop(taskId);
          setTasks((prev) =>
            prev.map((t) =>
              t.id === taskId ? { ...t, status: "stopped" as const } : t
            )
          );
          message.success("压测任务已停止");
        } catch (error) {
          message.error("停止失败");
        }
      },
    });
  };

  const handleDelete = async (taskId: string) => {
    Modal.confirm({
      title: "确认删除",
      content: "删除后无法恢复，是否继续？",
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          await loadTestRealApi.delete(taskId);
          setTasks((prev) => prev.filter((t) => t.id !== taskId));
          message.success("压测任务已删除");
        } catch (error) {
          console.error("Failed to delete load test:", error);
          message.error("删除失败");
        }
      },
    });
  };

  const handleViewResults = async (task: LoadTestTask) => {
    if (!task.results && task.metrics && task.metrics.length > 0) {
      const results = computeResultsFromMetrics(task.metrics);
      if (results) {
        const updatedTask = { ...task, results };
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? updatedTask : t))
        );
        setSelectedTask(updatedTask);
      } else {
        setSelectedTask(task);
      }
    } else {
      setSelectedTask(task);
    }
    setResultModalOpen(true);
  };

  const handleMonitor = (task: LoadTestTask) => {
    setMonitoringTaskId(task.id);
    setCurrentMetrics(task.runtimeMetrics || task.metrics || []);
    setMonitorModalOpen(true);
  };

  const getStatusTag = (status: LoadTestTask["status"]) => {
    switch (status) {
      case "pending":
        return <Tag color="default">待执行</Tag>;
      case "running":
        return <Tag color="processing" icon={<PlayCircleOutlined />}>运行中</Tag>;
      case "completed":
        return <Tag color="success">已完成</Tag>;
      case "stopped":
      case "paused":
        return <Tag color="warning">已停止</Tag>;
      case "failed":
        return <Tag color="error">错误</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  // 计算当前指标
  const getCurrentMetrics = () => {
    if (currentMetrics.length === 0) return null;
    return currentMetrics[currentMetrics.length - 1];
  };

  // 从指标数据计算结果汇总
  const computeResultsFromMetrics = (metrics: LoadTestMetric[]): LoadTestResult | null => {
    if (metrics.length === 0) return null;
    const totalRequests = metrics[metrics.length - 1].total_requests;
    const failedRequests = metrics[metrics.length - 1].failed_requests;
    const avgResponseTime =
      metrics.reduce((sum, m) => sum + m.avg_response_time, 0) / metrics.length;
    const p95ResponseTime = Math.max(...metrics.map((m) => m.p95_response_time));
    const p99ResponseTime = Math.max(...metrics.map((m) => m.p99_response_time));
    const avgRps = metrics.reduce((sum, m) => sum + m.requests_per_second, 0) / metrics.length;
    const errorRate =
      totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0;
    return {
      totalRequests,
      failedRequests,
      avgResponseTime: Math.round(avgResponseTime),
      p95ResponseTime: Math.round(p95ResponseTime),
      p99ResponseTime: Math.round(p99ResponseTime),
      rps: Math.round(avgRps * 100) / 100,
      errorRate,
    };
  };

  // 格式化运行时长
  const formatElapsed = (startedAt?: string) => {
    if (!startedAt) return "-";
    const elapsed = Math.floor((currentTime - new Date(startedAt).getTime()) / 1000);
    if (elapsed < 60) return `${elapsed}秒`;
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes}分${seconds}秒`;
  };

  const columns: ColumnsType<LoadTestTask> = [
    {
      title: "任务名称",
      dataIndex: "name",
      key: "name",
      width: 200,
    },
    {
      title: "测试集",
      dataIndex: "testSetName",
      key: "testSetName",
      width: 150,
    },
    {
      title: "配置",
      key: "config",
      width: 250,
      render: (_, record) => (
        <div className="space-y-1">
          <div className="text-xs">
            <Tag>{record.config.concurrent_users} 并发</Tag>
            <Tag>{record.config.duration}秒</Tag>
            <Tag>Ramp-up {record.config.ramp_up}秒</Tag>
            {record.config.target_rps && <Tag>目标 {record.config.target_rps} RPS</Tag>}
          </div>
        </div>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status, record: LoadTestTask) => {
        const progress =
          status === "running" && record.startedAt
            ? Math.min(
                100,
                Math.round(
                  ((currentTime - new Date(record.startedAt).getTime()) / 1000 / record.config.duration) * 100
                )
              )
            : null;
        return (
          <div className="space-y-1">
            {getStatusTag(status)}
            {status === "running" && record.startedAt && (
              <>
                <div className="text-xs text-gray-500">{formatElapsed(record.startedAt)}</div>
                {progress !== null && (
                  <Progress percent={progress} size="small" showInfo={false} strokeColor="#3b82f6" />
                )}
              </>
            )}
          </div>
        );
      },
    },
    {
      title: "启动时间",
      key: "start_time",
      width: 150,
      render: (_, record) =>
        record.startedAt ? new Date(record.startedAt).toLocaleString() : "-",
    },
    {
      title: "操作",
      key: "actions",
      width: 250,
      render: (_, record) => (
        <Space>
          {record.status === "pending" || record.status === "stopped" || record.status === "paused" ? (
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleStart(record.id)}
            >
              启动
            </Button>
          ) : record.status === "running" ? (
            <>
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => handleMonitor(record)}
              >
                实时监控
              </Button>
              <Button
                danger
                size="small"
                icon={<StopOutlined />}
                onClick={() => handleStop(record.id)}
              >
                停止
              </Button>
            </>
          ) : (
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewResults(record)}
            >
              查看结果
            </Button>
          )}
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
            disabled={record.status === "running"}
            onClick={() => handleDelete(record.id)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="flex h-full">
      <ResizableSidebar storageKey="sidebar:load-test">
        <div className="p-4">
          {/* 创建压测任务 */}
          <Card title="创建压测任务" size="small">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleCreate}
              autoComplete="off"
            >
              <Form.Item
                name="name"
                label="任务名称"
                rules={[{ required: true, message: "请输入任务名称" }]}
              >
                <Input placeholder="例如：API性能基准测试" />
              </Form.Item>

              <Form.Item
                name="testSetId"
                label="测试集"
                rules={[{ required: true, message: "请选择测试集" }]}
              >
                <Select
                  placeholder="选择要压测的测试集"
                  loading={testSets.length === 0}
                  options={testSets.map((ts) => ({
                    label: ts.name,
                    value: ts.id,
                  }))}
                />
              </Form.Item>

              <Form.Item
                name="targetUrl"
                label="目标 URL"
                rules={[{ required: true, message: "请输入目标 URL" }]}
              >
                <Input placeholder="例如：https://api.example.com/v1/users" />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="concurrentUsers"
                    label="并发用户数"
                    rules={[{ required: true, message: "请输入并发用户数" }]}
                  >
                    <InputNumber min={1} max={10000} style={{ width: "100%" }} placeholder="10" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="duration"
                    label="持续时间（秒）"
                    rules={[{ required: true, message: "请输入持续时间" }]}
                  >
                    <InputNumber min={10} max={3600} style={{ width: "100%" }} placeholder="60" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="rampUpTime"
                    label="Ramp-up时间（秒）"
                    rules={[
                      { required: true, message: "请输入Ramp-up时间" },
                      {
                        validator: (_, value) => {
                          const duration = form.getFieldValue("duration");
                          if (value && duration && value > duration) {
                            return Promise.reject(new Error("Ramp-up时间不能超过持续时间"));
                          }
                          return Promise.resolve();
                        },
                      },
                    ]}
                  >
                    <InputNumber min={1} max={300} style={{ width: "100%" }} placeholder="10" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="targetRps" label="目标RPS（可选）">
                    <InputNumber min={1} max={10000} style={{ width: "100%" }} placeholder="100" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={creating} icon={<PlusOutlined />}>
                  创建任务
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </div>
      </ResizableSidebar>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <Title level={4} style={{ margin: 0 }}>
            负载测试
          </Title>
        </div>

        {/* 压测任务列表 */}
        <Card
          title="压测任务列表"
          size="small"
          extra={
            <Button
              size="small"
              icon={<ReloadOutlined spin={refreshing} />}
              loading={refreshing}
              onClick={handleRefresh}
            >
              刷新
            </Button>
          }
        >
          <Table
            columns={columns}
            dataSource={tasks}
            rowKey="id"
            pagination={false}
            size="small"
            locale={{ emptyText: "暂无压测任务，请在左侧创建" }}
            rowClassName={(record) =>
              record.status === "running" ? "bg-blue-50" : ""
            }
          />
        </Card>
      </div>

      {/* 结果详情弹窗 */}
      <Modal
        title="压测结果详情"
        open={resultModalOpen}
        onCancel={() => setResultModalOpen(false)}
        footer={null}
        width={800}
      >
        {!selectedTask?.results ? (
          <div className="text-center py-8 text-gray-400">
            <div className="mb-2">暂无结果数据</div>
            <div className="text-sm">该任务可能没有产生任何指标数据</div>
          </div>
        ) : (
          <div className="space-y-4">
            <Row gutter={16}>
              <Col span={6}>
                <Statistic title="总请求数" value={selectedTask.results.totalRequests} />
              </Col>
              <Col span={6}>
                <Statistic
                  title="失败请求数"
                  value={selectedTask.results.failedRequests}
                  valueStyle={{ color: "#ef4444" }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="平均响应时间"
                  value={selectedTask.results.avgResponseTime}
                  suffix="ms"
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="错误率"
                  value={selectedTask.results.errorRate}
                  suffix="%"
                  precision={2}
                  valueStyle={{ color: selectedTask.results.errorRate > 5 ? "#ef4444" : "#22c55e" }}
                />
              </Col>
            </Row>

            <Divider />

            <Row gutter={16}>
              <Col span={12}>
                <div className="mb-4">
                  <Text strong>响应时间分布</Text>
                  <div className="mt-2 space-y-2">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>P95:</span>
                        <span>{selectedTask.results.p95ResponseTime} ms</span>
                      </div>
                      <Progress percent={95} showInfo={false} strokeColor="#3b82f6" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>P99:</span>
                        <span>{selectedTask.results.p99ResponseTime} ms</span>
                      </div>
                      <Progress percent={99} showInfo={false} strokeColor="#8b5cf6" />
                    </div>
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div>
                  <Text strong>吞吐量</Text>
                  <div className="mt-2">
                    <Statistic
                      title="实际RPS"
                      value={selectedTask.results.rps}
                      suffix="请求/秒"
                    />
                  </div>
                </div>
              </Col>
            </Row>
          </div>
        )}
      </Modal>

      {/* 实时监控弹窗 */}
      <Modal
        title="压测实时监控"
        open={monitorModalOpen}
        onCancel={() => {
          setMonitorModalOpen(false);
          setMonitoringTaskId(null);
          setCurrentMetrics([]);
        }}
        footer={null}
        width={900}
      >
        {monitoringTaskId && (
          <div className="space-y-4">
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="活跃用户"
                  value={getCurrentMetrics()?.active_users || 0}
                  valueStyle={{ color: "#3b82f6" }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="当前RPS"
                  value={getCurrentMetrics()?.requests_per_second.toFixed(2) || "0.00"}
                  suffix="请求/秒"
                  valueStyle={{ color: "#22c55e" }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="平均响应时间"
                  value={getCurrentMetrics()?.avg_response_time.toFixed(2) || "0.00"}
                  suffix="ms"
                  valueStyle={{ color: getCurrentMetrics()?.avg_response_time && getCurrentMetrics()!.avg_response_time > 500 ? "#ef4444" : "#f59e0b" }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="错误率"
                  value={getCurrentMetrics()?.error_rate.toFixed(2) || "0.00"}
                  suffix="%"
                  precision={2}
                  valueStyle={{ color: getCurrentMetrics()?.error_rate && getCurrentMetrics()!.error_rate > 5 ? "#ef4444" : "#22c55e" }}
                />
              </Col>
            </Row>

            <Divider />

            <Row gutter={16}>
              <Col span={12}>
                <div className="mb-4">
                  <Text strong>响应时间分布</Text>
                  <div className="mt-2 space-y-2">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>P50:</span>
                        <span>{getCurrentMetrics()?.p50_response_time.toFixed(2) || "0.00"} ms</span>
                      </div>
                      <Progress percent={50} showInfo={false} strokeColor="#22c55e" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>P95:</span>
                        <span>{getCurrentMetrics()?.p95_response_time.toFixed(2) || "0.00"} ms</span>
                      </div>
                      <Progress percent={95} showInfo={false} strokeColor="#f59e0b" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>P99:</span>
                        <span>{getCurrentMetrics()?.p99_response_time.toFixed(2) || "0.00"} ms</span>
                      </div>
                      <Progress percent={99} showInfo={false} strokeColor="#ef4444" />
                    </div>
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div>
                  <Text strong>请求统计</Text>
                  <div className="mt-2 space-y-2">
                    <Row gutter={8}>
                      <Col span={12}>
                        <Statistic
                          title="总请求数"
                          value={getCurrentMetrics()?.total_requests || 0}
                          valueStyle={{ fontSize: "20px" }}
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title="失败请求数"
                          value={getCurrentMetrics()?.failed_requests || 0}
                          valueStyle={{ color: "#ef4444", fontSize: "20px" }}
                        />
                      </Col>
                    </Row>
                  </div>
                </div>
              </Col>
            </Row>

            <Divider />

            <div>
              <Text strong>数据更新</Text>
              <div className="mt-2">
                {(() => {
                  const task = tasks.find((t) => t.id === monitoringTaskId);
                  if (task?.status === "running") {
                    return (
                      <>
                        <Tag color="processing">HTTP 轮询</Tag>
                        <Text type="secondary" className="ml-2">
                          每 1 秒自动刷新
                        </Text>
                      </>
                    );
                  }
                  return (
                    <>
                      <Tag color={task?.status === "completed" ? "success" : "warning"}>
                        {task?.status === "completed" ? "已完成" : "已停止"}
                      </Tag>
                      <Text type="secondary" className="ml-2">
                        数据保留至关闭窗口
                      </Text>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
