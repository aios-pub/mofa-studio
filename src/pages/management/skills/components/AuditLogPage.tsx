/**
 * Audit Log Page
 * Audit log page
 */

import { useEffect, useState } from "react";
import {
  Table,
  Space,
  Typography,
  Tag,
  Input,
  Select,
  Button,
  DatePicker,
  Descriptions,
} from "antd";
import { SearchOutlined, ExportOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

const { Title, Text, RangePicker } = Typography;
const { Option } = Select;

interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
}

export function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [actionFilter, setActionFilter] = useState<string | undefined>();
  const [resourceFilter, setResourceFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(
    null,
  );
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      // Mock data - replace with actual API call
      const mockLogs: AuditLogEntry[] = [
        {
          id: "1",
          timestamp: "2024-04-19T10:30:00Z",
          userId: "user1",
          username: "admin",
          action: "CREATE",
          resourceType: "SKILL",
          resourceId: "skill123",
          details: { namespace: "global", slug: "my-skill", version: "1.0.0" },
          ipAddress: "192.168.1.1",
          userAgent: "Mozilla/5.0...",
        },
        {
          id: "2",
          timestamp: "2024-04-19T11:15:00Z",
          userId: "user2",
          username: "user1",
          action: "UPDATE",
          resourceType: "LABEL",
          resourceId: "label456",
          details: { labelId: "recommended", action: "assign" },
          ipAddress: "192.168.1.2",
          userAgent: "Mozilla/5.0...",
        },
      ];
      setLogs(mockLogs);
    } catch (error) {
      console.error("Failed to load audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const getActionColor = (action: string) => {
    switch (action) {
      case "CREATE":
        return "green";
      case "UPDATE":
        return "blue";
      case "DELETE":
        return "red";
      case "LOGIN":
        return "cyan";
      case "LOGOUT":
        return "default";
      default:
        return "default";
    }
  };

  const columns: ColumnsType<AuditLogEntry> = [
    {
      title: "时间",
      dataIndex: "timestamp",
      key: "timestamp",
      width: 180,
      sorter: (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      render: (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleString("zh-CN");
      },
    },
    {
      title: "用户",
      dataIndex: "username",
      key: "username",
      width: 120,
    },
    {
      title: "操作",
      dataIndex: "action",
      key: "action",
      width: 100,
      filters: [
        { text: "创建", value: "CREATE" },
        { text: "更新", value: "UPDATE" },
        { text: "删除", value: "DELETE" },
        { text: "登录", value: "LOGIN" },
        { text: "登出", value: "LOGOUT" },
      ],
      render: (action: string) => (
        <Tag color={getActionColor(action)}>{action}</Tag>
      ),
    },
    {
      title: "资源类型",
      dataIndex: "resourceType",
      key: "resourceType",
      width: 120,
    },
    {
      title: "资源ID",
      dataIndex: "resourceId",
      key: "resourceId",
      ellipsis: true,
    },
    {
      title: "IP地址",
      dataIndex: "ipAddress",
      key: "ipAddress",
      width: 140,
    },
  ];

  const filteredLogs = logs.filter((log) => {
    const matchSearch =
      !searchText ||
      log.username.toLowerCase().includes(searchText.toLowerCase()) ||
      log.resourceId.toLowerCase().includes(searchText.toLowerCase());
    const matchAction = !actionFilter || log.action === actionFilter;
    const matchResource =
      !resourceFilter || log.resourceType === resourceFilter;
    const matchDate =
      !dateRange ||
      (() => {
        const logDate = new Date(log.timestamp);
        return (
          logDate >= dateRange[0].toDate() && logDate <= dateRange[1].toDate()
        );
      })();
    return matchSearch && matchAction && matchResource && matchDate;
  });

  const handleExport = () => {
    // Mock export - implement actual export logic
    console.log("Exporting audit logs...");
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={3} className="m-0">
          审计日志
        </Title>
        <Text type="secondary">查看系统操作记录和安全审计</Text>
      </div>

      <div className="mb-4 flex flex-wrap gap-4">
        <Input
          placeholder="搜索用户名或资源ID"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 250 }}
          allowClear
        />
        <Select
          placeholder="筛选操作类型"
          value={actionFilter}
          onChange={setActionFilter}
          style={{ width: 150 }}
          allowClear
        >
          <Option value="CREATE">创建</Option>
          <Option value="UPDATE">更新</Option>
          <Option value="DELETE">删除</Option>
          <Option value="LOGIN">登录</Option>
          <Option value="LOGOUT">登出</Option>
        </Select>
        <Select
          placeholder="筛选资源类型"
          value={resourceFilter}
          onChange={setResourceFilter}
          style={{ width: 150 }}
          allowClear
        >
          <Option value="SKILL">技能</Option>
          <Option value="NAMESPACE">命名空间</Option>
          <Option value="LABEL">标签</Option>
          <Option value="USER">用户</Option>
        </Select>
        <DatePicker.RangePicker
          value={dateRange}
          onChange={(dates) =>
            setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)
          }
          format="YYYY-MM-DD"
        />
        <Button icon={<ExportOutlined />} onClick={handleExport}>
          导出
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <Table
            columns={columns}
            dataSource={filteredLogs}
            loading={loading}
            rowKey="id"
            pagination={{
              total: filteredLogs.length,
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
            onRow={(record) => ({
              onClick: () => setSelectedLog(record),
              style: {
                cursor: "pointer",
                background:
                  selectedLog?.id === record.id ? "#f0f0f0" : undefined,
              },
            })}
          />
        </div>

        {selectedLog && (
          <div className="w-96">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <Title level={5}>日志详情</Title>
              <Descriptions column={1} size="small" variant>
                <Descriptions.Item label="时间">
                  {new Date(selectedLog.timestamp).toLocaleString("zh-CN")}
                </Descriptions.Item>
                <Descriptions.Item label="用户">
                  {selectedLog.username} ({selectedLog.user_id})
                </Descriptions.Item>
                <Descriptions.Item label="操作">
                  <Tag color={getActionColor(selectedLog.action)}>
                    {selectedLog.action}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="资源类型">
                  {selectedLog.resourceType}
                </Descriptions.Item>
                <Descriptions.Item label="资源ID">
                  <code>{selectedLog.resourceId}</code>
                </Descriptions.Item>
                <Descriptions.Item label="IP地址">
                  {selectedLog.ipAddress}
                </Descriptions.Item>
                <Descriptions.Item label="User Agent">
                  <Text ellipsis={{ tooltip: selectedLog.userAgent }}>
                    {selectedLog.userAgent}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="详情">
                  <pre className="text-xs bg-gray-50 p-2 rounded">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </Descriptions.Item>
              </Descriptions>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
