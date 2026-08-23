/**
 * Security Audit Section Component
 * Show the skill package security scan results
 */

import { ShieldAlert, Shield, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Card, Badge, Collapse, Tag, Space, Tooltip, Alert } from "antd";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/api/apiClient";
import type {
  SecurityAuditRecord,
  FindingSeverity,
  SecurityVerdict,
} from "@/types/skill";

const SEVERITY_CONFIG: Record<
  FindingSeverity,
  { color: string; text: string }
> = {
  CRITICAL: { color: "error", text: "严重" },
  HIGH: { color: "warning", text: "高危" },
  MEDIUM: { color: "processing", text: "中危" },
  LOW: { color: "default", text: "低危" },
  INFO: { color: "default", text: "信息" },
};

const VERDICT_CONFIG: Record<
  SecurityVerdict,
  { color: string; text: string; icon: string }
> = {
  SAFE: { color: "success", text: "安全", icon: "✓" },
  SUSPICIOUS: { color: "warning", text: "可疑", icon: "!" },
  DANGEROUS: { color: "error", text: "危险", icon: "⚠" },
  BLOCKED: { color: "error", text: "已阻止", icon: "✕" },
};

interface SecurityAuditSectionProps {
  skillId: string;
  versionId: string;
  versionStatus?: string;
  bare?: boolean;
}

async function fetchSecurityAudits(
  skillId: string,
  versionId: string,
): Promise<SecurityAuditRecord[]> {
  try {
    return await apiClient.get<SecurityAuditRecord[]>(
      `/api/skill-hub/skills/${skillId}/versions/${versionId}/security-audit`,
    );
  } catch (error: any) {
    // Treat 404 as empty array
    if (error?.status === 404) {
      return [];
    }
    throw error;
  }
}

export function SecurityAuditSection({
  skillId,
  versionId,
  versionStatus,
  bare = false,
}: SecurityAuditSectionProps) {
  const { data: audits, isLoading } = useQuery({
    queryKey: ["security-audits", skillId, versionId],
    queryFn: () => fetchSecurityAudits(skillId, versionId),
    enabled: !!skillId && !!versionId,
    staleTime: 30000,
    retry: false,
  });

  if (isLoading || !audits || audits.length === 0) {
    return null;
  }

  const content = (
    <div className="space-y-4">
      {audits.map((audit) => (
        <ScannerCard
          key={audit.id}
          audit={audit}
          versionStatus={versionStatus}
        />
      ))}
    </div>
  );

  if (bare) {
    return <div className="space-y-6">{content}</div>;
  }

  return (
    <Card
      title={
        <Space>
          <Shield className="w-5 h-5" />
          <span>安全审计</span>
        </Space>
      }
      className="security-audit-section"
    >
      {content}
    </Card>
  );
}

function ScannerCard({
  audit,
  versionStatus,
}: {
  audit: SecurityAuditRecord;
  versionStatus?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const sortedFindings = [...audit.findings].sort(
    (a, b) =>
      (a.severity === "CRITICAL"
        ? 0
        : a.severity === "HIGH"
          ? 1
          : a.severity === "MEDIUM"
            ? 2
            : 3) -
      (b.severity === "CRITICAL"
        ? 0
        : b.severity === "HIGH"
          ? 1
          : b.severity === "MEDIUM"
            ? 2
            : 3),
  );

  const verdict = VERDICT_CONFIG[audit.verdict];

  return (
    <div className="rounded-lg border bg-gray-50 p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Space>
          <span className="font-mono text-sm">{audit.scannerType}</span>
          <Badge
            color={verdict.color}
            text={`${verdict.icon} ${verdict.text}`}
          />
        </Space>
        <Space className="text-sm text-gray-500">
          <span>{audit.findingsCount} 个发现</span>
          {audit.scanDurationSeconds != null && (
            <span>{audit.scanDurationSeconds}s</span>
          )}
        </Space>
      </div>

      {sortedFindings.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full text-left text-gray-500 hover:text-gray-700 flex items-center justify-between py-1"
          >
            <span>查看详情</span>
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          <Collapse activeKey={expanded ? ["findings"] : []}>
            <Collapse.Panel key="findings" header="">
              <div className="space-y-3">
                {sortedFindings.map((finding, idx) => (
                  <FindingItem
                    key={`${finding.ruleId}-${idx}`}
                    finding={finding}
                  />
                ))}
              </div>
            </Collapse.Panel>
          </Collapse>
        </>
      )}

      {sortedFindings.length === 0 && audit.isSafe && (
        <Alert
          type="success"
          title="安全扫描通过"
          description="未发现安全问题"
          showIcon
        />
      )}
    </div>
  );
}

function FindingItem({
  finding,
}: {
  finding: SecurityAuditRecord["findings"][number];
}) {
  const severity = SEVERITY_CONFIG[finding.severity];

  return (
    <div
      className="bg-white p-3 rounded border-l-4"
      style={{ borderLeftColor: severity.color }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <Space>
          <Tag color={severity.color}>{severity.text}</Tag>
          <span className="font-medium">{finding.category}</span>
        </Space>
        <span className="text-xs text-gray-500 font-mono">
          {finding.ruleId}
        </span>
      </div>
      <div className="font-medium mb-1">{finding.title}</div>
      {finding.message && (
        <div className="text-sm text-gray-600 mb-2">{finding.message}</div>
      )}
      {finding.codeSnippet && (
        <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto mb-2">
          <code>{finding.codeSnippet}</code>
        </pre>
      )}
      {finding.filePath && (
        <div className="text-xs text-gray-500">
          位置: {finding.filePath}
          {finding.lineNumber != null && `:${finding.lineNumber}`}
        </div>
      )}
      {finding.remediation && (
        <div className="text-sm text-blue-600 mt-2">
          <strong>修复建议：</strong> {finding.remediation}
        </div>
      )}
    </div>
  );
}
