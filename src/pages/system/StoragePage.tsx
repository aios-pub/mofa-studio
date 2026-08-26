import { useTranslation } from "react-i18next";
/**
 * Storage management page (PLAT-09): category usage breakdown, one-click
 * cache cleanup, and a recoverable recycle bin.
 */

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Popconfirm, Progress, Spin, Table, Tag, message } from "antd";
import { DatabaseOutlined, DeleteOutlined, UndoOutlined } from "@ant-design/icons";
import {
  CLEANABLE,
  formatBytes,
  storageService,
  type StorageUsage,
  type TrashItem,
} from "@/services/api/storage";

export default function StoragePage() {  const { t } = useTranslation();

  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setUsage(await storageService.usage());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const clean = useCallback(
    async (category: string) => {
      const freed = await storageService.clean(category);
      message.success(`已清理 ${formatBytes(freed)}`);
      await load();
    },
    [load],
  );

  const restore = useCallback(
    async (item: TrashItem) => {
      const restored = await storageService.restore(item.id);
      if (restored) {
        message.success(t("已恢复到媒体目录"));
      } else {
        message.error(t("恢复失败"));
      }
      await load();
    },
    [load],
  );

  const emptyTrash = useCallback(async () => {
    const freed = await storageService.emptyTrash();
    message.success(`回收站已清空（${formatBytes(freed)}）`);
    await load();
  }, [load]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }
  if (!usage) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--color-text-tertiary)]">
        存储信息不可用
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 max-w-4xl">
      <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--color-text-primary)]">
        <DatabaseOutlined className="text-[var(--color-primary)]" />
        存储管理
        <span className="text-sm font-normal text-[var(--color-text-tertiary)]">
          共占用 {formatBytes(usage.total_bytes)}
        </span>
      </h2>

      {/* Category cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {usage.categories.map((category) => {
          const percent =
            usage.total_bytes === 0
              ? 0
              : Math.round((category.bytes / usage.total_bytes) * 100);
          const cleanable = CLEANABLE.includes(category.key);
          return (
            <Card key={category.key} size="small" title={category.label}>
              <p className="text-xl font-semibold text-[var(--color-text-primary)]">
                {formatBytes(category.bytes)}
              </p>
              <p className="text-xs text-[var(--color-text-tertiary)] mb-2">
                {category.files} 个文件 · 占比 {percent}%
              </p>
              <Progress percent={percent} showInfo={false} size="small" />
              {cleanable ? (
                <Popconfirm
                  title={t("确定清理「{{p0}}」全部文件？", { p0: category.label })}
                  description={t("清理后不可恢复（不走回收站）")}
                  onConfirm={() => void clean(category.key)}
                  okText={t("清理")}
                  cancelText={t("取消")}
                >
                  <Button size="small" danger icon={<DeleteOutlined />} className="mt-2">
                    一键清理
                  </Button>
                </Popconfirm>
              ) : (
                <Tag className="mt-2">{t("不可清理")}</Tag>
              )}
            </Card>
          );
        })}
      </div>

      {/* Recycle bin */}
      <Card
        size="small"
        title={t("回收站（{{p0}} 项）", { p0: usage.trash.length })}
        extra={
          usage.trash.length > 0 && (
            <Popconfirm
              title={t("确定清空回收站？")}
              onConfirm={() => void emptyTrash()}
              okText={t("清空")}
              cancelText={t("取消")}
            >
              <Button size="small" danger>
                清空回收站
              </Button>
            </Popconfirm>
          )
        }
      >
        <Table
          size="small"
          dataSource={usage.trash}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: "回收站为空" }}
          columns={[
            {
              title: t("条目"),
              dataIndex: "id",
              key: "id",
              render: (id: string) => <span className="text-xs">{id}</span>,
            },
            {
              title: t("大小"),
              dataIndex: "size",
              key: "size",
              render: (size: number) => formatBytes(size),
            },
            {
              title: t("删除时间"),
              dataIndex: "trashed_at",
              key: "trashed_at",
              render: (at: string) => at.replace("T", " ").slice(0, 19),
            },
            {
              title: t("操作"),
              key: "actions",
              render: (_: unknown, item: TrashItem) => (
                <Button
                  size="small"
                  icon={<UndoOutlined />}
                  onClick={() => void restore(item)}
                  aria-label={t("恢复 {{p0}}", { p0: item.id })}
                >
                  恢复
                </Button>
              ),
            },
          ]}
        />
      </Card>

      <p className="text-xs text-[var(--color-text-tertiary)]">
        回收站文件可随时恢复到媒体目录；「一键清理」直接删除缓存类文件（媒体产物/播客成品/语音/上传），数据库不可清理。
      </p>
    </div>
  );
}
