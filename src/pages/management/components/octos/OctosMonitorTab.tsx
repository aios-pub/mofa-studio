/**
 * Octos 监控配置
 * 看门狗和告警开关控制
 */

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  Switch,
  Space,
  Typography,
  Alert,
  Spin,
  Row,
  Col,
  Divider,
} from "antd";
import {
  EyeOutlined,
  BellOutlined,
  SafetyOutlined,
} from "@ant-design/icons";
import type { OctosMonitorStatus } from "@/types/octos";
import { OctosApiClient } from "@/services/real/octos";

const { Title, Text } = Typography;

interface Props {
  apiClient: OctosApiClient | any;
}

export default function OctosMonitorTab({ apiClient }: Props) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<OctosMonitorStatus>({
    watchdog_enabled: false,
    alerts_enabled: false,
  });
  const [updating, setUpdating] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.getMonitorStatus();
      setStatus(data);
    } catch (e: any) {
      console.error("加载监控状态失败:", e);
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleToggleWatchdog = async (checked: boolean) => {
    try {
      setUpdating(true);
      const result = await apiClient.toggleWatchdog(checked);
      if (result.ok) {
        setStatus((prev) => ({ ...prev, watchdog_enabled: result.watchdog_enabled }));
      }
    } catch (e: any) {
      console.error("切换失败:", e);
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleAlerts = async (checked: boolean) => {
    try {
      setUpdating(true);
      const result = await apiClient.toggleAlerts(checked);
      if (result.ok) {
        setStatus((prev) => ({ ...prev, alerts_enabled: result.alerts_enabled }));
      }
    } catch (e: any) {
      console.error("切换失败:", e);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spin tip="加载中..." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Alert
        type="info"
        showIcon
        title="系统级监控配置"
        description="看门狗会自动重启异常退出的 Profile，告警会在检测到问题时发送通知。"
        className="text-xs"
      />

      <Row gutter={16}>
        {/* 看门狗 */}
        <Col span={12}>
          <Card
            title={
              <Space>
                <SafetyOutlined />
                <span>看门狗</span>
              </Space>
            }
            size="small"
          >
            <Space orientation="vertical" size={16} className="w-full">
              <div>
                <Text type="secondary">自动重启异常退出的 Profile</Text>
              </div>
              <Switch
                checked={status.watchdog_enabled}
                onChange={handleToggleWatchdog}
                loading={updating}
                checkedChildren="开启"
                unCheckedChildren="关闭"
              />
              <div>
                {status.watchdog_enabled ? (
                  <Text type="success">
                    <EyeOutlined /> 看门狗正在运行
                  </Text>
                ) : (
                  <Text type="secondary">看门狗已禁用</Text>
                )}
              </div>
            </Space>
          </Card>
        </Col>

        {/* 告警 */}
        <Col span={12}>
          <Card
            title={
              <Space>
                <BellOutlined />
                <span>告警</span>
              </Space>
            }
            size="small"
          >
            <Space orientation="vertical" size={16} className="w-full">
              <div>
                <Text type="secondary">在检测到问题时发送通知</Text>
              </div>
              <Switch
                checked={status.alerts_enabled}
                onChange={handleToggleAlerts}
                loading={updating}
                checkedChildren="开启"
                unCheckedChildren="关闭"
              />
              <div>
                {status.alerts_enabled ? (
                  <Text type="success">
                    <BellOutlined /> 告警已启用
                  </Text>
                ) : (
                  <Text type="secondary">告警已禁用</Text>
                )}
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      <Divider className="my-4" />

      <div>
        <Title level={5} className="mb-2">
          关于监控功能
        </Title>
        <Space orientation="vertical" size={8}>
          <Text type="secondary" className="text-xs">
            • <strong>看门狗</strong>：检测到 Profile 进程异常退出时，自动重新启动
          </Text>
          <Text type="secondary" className="text-xs">
            • <strong>告警</strong>：在检测到连续失败、高错误率等问题时发送通知
          </Text>
          <Text type="secondary" className="text-xs">
            • 监控状态是全局配置，对所有 Profile 生效
          </Text>
        </Space>
      </div>
    </div>
  );
}
