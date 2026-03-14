/**
 * 提示词版本历史组件
 */

import { useState, useEffect } from 'react';
import {
  HistoryOutlined,
  ReloadOutlined,
  SwapOutlined,
  RightOutlined,
  ClockCircleOutlined,
  UserOutlined,
  MessageOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import type { Prompt, PromptVersion, VersionDiff } from '../../services/mock/prompts';
import { promptApi } from '../../services/mock/prompts';

interface PromptVersionHistoryProps {
  prompt: Prompt;
  onRollback: () => void;
}

export default function PromptVersionHistory({ prompt, onRollback }: PromptVersionHistoryProps) {
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<PromptVersion | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareFrom, setCompareFrom] = useState<PromptVersion | null>(null);
  const [compareTo, setCompareTo] = useState<PromptVersion | null>(null);
  const [diff, setDiff] = useState<VersionDiff | null>(null);
  const [rollbackConfirm, setRollbackConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadVersions();
  }, [prompt.id]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      const data = await promptApi.getVersions(prompt.id);
      setVersions(data);
    } catch (error) {
      console.error('Failed to load versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async () => {
    if (!compareFrom || !compareTo) return;

    try {
      const result = await promptApi.compareVersions(compareFrom.id, compareTo.id);
      setDiff(result);
    } catch (error) {
      console.error('Failed to compare versions:', error);
    }
  };

  const handleRollback = async (versionId: string) => {
    try {
      await promptApi.rollbackToVersion(prompt.id, versionId);
      setRollbackConfirm(null);
      onRollback();
      loadVersions();
    } catch (error) {
      console.error('Failed to rollback:', error);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-[var(--color-text-tertiary)]">加载版本历史...</div>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-[var(--color-text-tertiary)]">
        <HistoryOutlined className="text-3xl mb-2 opacity-50" />
        <p>暂无版本历史</p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* 版本列表 */}
      <div className="w-64 border-r border-[var(--color-border)] overflow-y-auto">
        <div className="p-3 border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-[var(--color-text-primary)]">版本列表</h4>
            <button
              onClick={() => {
                setCompareMode(!compareMode);
                setCompareFrom(null);
                setCompareTo(null);
                setDiff(null);
              }}
              className={`p-1.5 rounded transition-colors ${
                compareMode
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-tertiary)]'
              }`}
              title="版本对比"
            >
              <SwapOutlined />
            </button>
          </div>
          {compareMode && (
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
              选择两个版本进行对比
            </p>
          )}
        </div>

        <div className="p-2 space-y-1">
          {versions.map((version) => (
            <div
              key={version.id}
              onClick={() => {
                if (compareMode) {
                  if (!compareFrom) {
                    setCompareFrom(version);
                  } else if (!compareTo && version.id !== compareFrom.id) {
                    setCompareTo(version);
                  }
                } else {
                  setSelectedVersion(version);
                }
              }}
              className={`p-2 rounded-lg cursor-pointer transition-colors ${
                selectedVersion?.id === version.id || compareFrom?.id === version.id || compareTo?.id === version.id
                  ? 'bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30'
                  : 'hover:bg-[var(--color-bg-tertiary)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {compareFrom?.id === version.id && (
                    <span className="text-xs bg-blue-500 text-white px-1 rounded">A</span>
                  )}
                  {compareTo?.id === version.id && (
                    <span className="text-xs bg-green-500 text-white px-1 rounded">B</span>
                  )}
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">
                    v{version.version}
                  </span>
                </div>
                {version.version === prompt.version && (
                  <span className="text-xs bg-[var(--color-primary)] text-white px-1.5 py-0.5 rounded">
                    当前
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 mt-1 text-xs text-[var(--color-text-tertiary)]">
                <ClockCircleOutlined className="text-xs" />
                <span>{formatDate(version.createdAt)}</span>
              </div>
              <div className="flex items-center gap-1 mt-0.5 text-xs text-[var(--color-text-tertiary)]">
                <UserOutlined className="text-xs" />
                <span>{version.createdBy}</span>
              </div>
              {version.changeNote && (
                <p className="text-xs text-[var(--color-text-secondary)] mt-1 truncate">
                  {version.changeNote}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 版本详情/对比 */}
      <div className="flex-1 overflow-y-auto">
        {compareMode ? (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-[var(--color-text-primary)]">版本对比</h4>
              <button
                onClick={handleCompare}
                disabled={!compareFrom || !compareTo}
                className="px-3 py-1.5 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                开始对比
              </button>
            </div>

            {!compareFrom || !compareTo ? (
              <div className="text-center py-8 text-[var(--color-text-tertiary)]">
                <SwapOutlined className="text-3xl mx-auto mb-2 opacity-50" />
                <p>请在左侧选择两个版本进行对比</p>
                <p className="text-xs mt-1">先选择版本 A，再选择版本 B</p>
              </div>
            ) : diff ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-blue-500 rounded" />
                    <span className="text-[var(--color-text-secondary)]">
                      v{compareFrom.version} (A)
                    </span>
                  </div>
                  <RightOutlined className="text-[var(--color-text-tertiary)]" />
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-500 rounded" />
                    <span className="text-[var(--color-text-secondary)]">
                      v{compareTo.version} (B)
                    </span>
                  </div>
                </div>

                <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] overflow-hidden">
                  <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-bg-tertiary)]">
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                      变更摘要
                    </span>
                  </div>
                  <div className="p-3 space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-red-500 rounded" />
                      <span className="text-[var(--color-text-secondary)]">
                        删除: {diff.deletions.length} 行
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-green-500 rounded" />
                      <span className="text-[var(--color-text-secondary)]">
                        新增: {diff.additions.length} 行
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-yellow-500 rounded" />
                      <span className="text-[var(--color-text-secondary)]">
                        修改: {diff.modifications.length} 行
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] overflow-hidden">
                  <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-bg-tertiary)]">
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                      详细差异
                    </span>
                  </div>
                  <div className="p-3 font-mono text-sm">
                    {diff.deletions.map((d) => (
                      <div
                        key={`del-${d.line}`}
                        className="flex items-start gap-2 py-0.5 bg-red-500/10"
                      >
                        <span className="text-[var(--color-text-tertiary)] w-8 text-right">
                          {d.line}
                        </span>
                        <span className="text-red-500">-</span>
                        <span className="text-red-400">{d.content}</span>
                      </div>
                    ))}
                    {diff.additions.map((a) => (
                      <div
                        key={`add-${a.line}`}
                        className="flex items-start gap-2 py-0.5 bg-green-500/10"
                      >
                        <span className="text-[var(--color-text-tertiary)] w-8 text-right">
                          {a.line}
                        </span>
                        <span className="text-green-500">+</span>
                        <span className="text-green-400">{a.content}</span>
                      </div>
                    ))}
                    {diff.modifications.map((m) => (
                      <div key={`mod-${m.line}`} className="py-1">
                        <div className="flex items-start gap-2 py-0.5 bg-red-500/10">
                          <span className="text-[var(--color-text-tertiary)] w-8 text-right">
                            {m.line}
                          </span>
                          <span className="text-red-500">-</span>
                          <span className="text-red-400">{m.oldContent}</span>
                        </div>
                        <div className="flex items-start gap-2 py-0.5 bg-green-500/10">
                          <span className="text-[var(--color-text-tertiary)] w-8 text-right">
                            {m.line}
                          </span>
                          <span className="text-green-500">+</span>
                          <span className="text-green-400">{m.newContent}</span>
                        </div>
                      </div>
                    ))}
                    {diff.deletions.length === 0 &&
                      diff.additions.length === 0 &&
                      diff.modifications.length === 0 && (
                        <div className="text-center text-[var(--color-text-tertiary)] py-4">
                          两个版本内容相同
                        </div>
                      )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-[var(--color-text-tertiary)]">
                <p>已选择版本 v{compareFrom.version} 和 v{compareTo.version}</p>
                <p className="text-xs mt-1">点击"开始对比"查看差异</p>
              </div>
            )}
          </div>
        ) : selectedVersion ? (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-[var(--color-text-primary)]">
                版本 v{selectedVersion.version}
              </h4>
              {selectedVersion.version !== prompt.version && (
                <div>
                  {rollbackConfirm === selectedVersion.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRollback(selectedVersion.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600"
                      >
                        <CheckOutlined />
                        确认回滚
                      </button>
                      <button
                        onClick={() => setRollbackConfirm(null)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg-tertiary)]"
                      >
                        <CloseOutlined />
                        取消
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRollbackConfirm(selectedVersion.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg-tertiary)]"
                    >
                      <ReloadOutlined />
                      回滚到此版本
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-3 bg-[var(--color-bg-secondary)] rounded-lg">
                <div className="flex items-center gap-2">
                  <ClockCircleOutlined className="text-[var(--color-text-tertiary)]" />
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    {formatDate(selectedVersion.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <UserOutlined className="text-[var(--color-text-tertiary)]" />
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    {selectedVersion.createdBy}
                  </span>
                </div>
              </div>

              {selectedVersion.changeNote && (
                <div className="p-3 bg-[var(--color-bg-secondary)] rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageOutlined className="text-[var(--color-text-tertiary)]" />
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                      变更说明
                    </span>
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    {selectedVersion.changeNote}
                  </p>
                </div>
              )}

              <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] overflow-hidden">
                <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-bg-tertiary)]">
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">
                    提示词内容
                  </span>
                </div>
                <pre className="p-4 text-sm text-[var(--color-text-primary)] whitespace-pre-wrap font-mono overflow-x-auto">
                  {selectedVersion.content}
                </pre>
              </div>

              {selectedVersion.variables.length > 0 && (
                <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] overflow-hidden">
                  <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-bg-tertiary)]">
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                      变量 ({selectedVersion.variables.length})
                    </span>
                  </div>
                  <div className="p-3">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--color-border)]">
                          <th className="text-left py-2 text-[var(--color-text-tertiary)]">
                            变量名
                          </th>
                          <th className="text-left py-2 text-[var(--color-text-tertiary)]">
                            类型
                          </th>
                          <th className="text-left py-2 text-[var(--color-text-tertiary)]">
                            默认值
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedVersion.variables.map((variable) => (
                          <tr
                            key={variable.name}
                            className="border-b border-[var(--color-border)]/50"
                          >
                            <td className="py-2">
                              <code className="text-[var(--color-primary)]">{`{{${variable.name}}}`}</code>
                            </td>
                            <td className="py-2 text-[var(--color-text-secondary)]">
                              {variable.type}
                            </td>
                            <td className="py-2 text-[var(--color-text-secondary)]">
                              {variable.defaultValue || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-[var(--color-text-tertiary)]">
              <HistoryOutlined className="text-3xl mx-auto mb-2 opacity-50" />
              <p>选择一个版本查看详情</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
