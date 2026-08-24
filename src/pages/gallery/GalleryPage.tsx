/**
 * Asset gallery (PLAT-06): every produced artifact retrievable by
 * type × source, with cross-domain actions — download, send-to-chat
 * (zero-copy reference), delete.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Empty, Select, Spin, message, Tooltip, Popconfirm } from "antd";
import {
  PictureOutlined,
  DownloadOutlined,
  SendOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import {
  ASSET_SOURCES,
  ASSET_TYPES,
  assetService,
  filterAssets,
  type Asset,
  type AssetSource,
  type AssetType,
} from "@/services/api/assets";
import { exportFilename } from "@/services/api/image";

export default function GalleryPage() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<AssetType | "all">("all");
  const [source, setSource] = useState<AssetSource | "all">("all");

  const load = useCallback(async () => {
    setLoading(true);
    setAssets(await assetService.list());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () => filterAssets(assets, type, source),
    [assets, type, source],
  );

  const download = (asset: Asset) => {
    const link = document.createElement("a");
    link.href = asset.ref_path;
    const prompt = String(asset.meta_json?.prompt ?? asset.title);
    link.download = exportFilename(prompt, String(asset.meta_json?.size ?? "1024x1024"), 1);
    link.click();
  };

  const sendToChat = (asset: Asset) => {
    // Zero-copy cross-domain reference: the conversation picks the asset up
    // by id and attaches the existing ref_path.
    navigate(`/conversation?attach=${asset.id}`);
  };

  const remove = async (asset: Asset) => {
    const ok = await assetService.remove(asset.id);
    if (ok) {
      setAssets((prev) => prev.filter((a) => a.id !== asset.id));
      message.success("已删除");
    } else {
      message.error("删除失败");
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-6 py-3 border-b border-(--color-border)">
        <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--color-text-primary)]">
          <PictureOutlined className="text-[var(--color-primary)]" />
          作品画廊
        </h2>
        <div className="flex-1" />
        <Select
          value={type}
          onChange={setType}
          options={ASSET_TYPES}
          style={{ width: 130 }}
          aria-label="类型筛选"
        />
        <Select
          value={source}
          onChange={setSource}
          options={ASSET_SOURCES}
          style={{ width: 130 }}
          aria-label="来源筛选"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Spin size="large" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <Empty description="还没有作品——去对话或创作页生成第一个吧" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl">
            {filtered.map((asset) => (
              <figure
                key={asset.id}
                className="group relative rounded-xl overflow-hidden border border-(--color-border) bg-[var(--color-bg-secondary)]"
              >
                {asset.type === "image" && asset.ref_path.startsWith("data:") ? (
                  <img
                    src={asset.ref_path}
                    alt={asset.title}
                    className="w-full aspect-square object-cover"
                  />
                ) : (
                  <div className="w-full aspect-square flex flex-col items-center justify-center text-[var(--color-text-tertiary)]">
                    <span className="text-3xl">📄</span>
                    <span className="mt-2 text-xs px-2 truncate max-w-full">
                      {asset.title}
                    </span>
                  </div>
                )}
                <figcaption className="absolute inset-x-0 bottom-0 p-2 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="text-xs text-white truncate mb-1.5">
                    {asset.title}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-white/70 mb-1.5">
                    <span>{asset.source}</span>·<span>{asset.type}</span>
                  </div>
                  <div className="flex justify-end gap-1">
                    <Tooltip title="发送到对话">
                      <Button
                        size="small"
                        icon={<SendOutlined />}
                        onClick={() => sendToChat(asset)}
                        aria-label={`发送到对话 ${asset.title}`}
                      />
                    </Tooltip>
                    {asset.ref_path.startsWith("data:") && (
                      <Tooltip title="下载">
                        <Button
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={() => download(asset)}
                          aria-label={`下载 ${asset.title}`}
                        />
                      </Tooltip>
                    )}
                    <Popconfirm
                      title="确定删除这个作品？"
                      onConfirm={() => void remove(asset)}
                      okText="删除"
                      cancelText="取消"
                    >
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        aria-label={`删除 ${asset.title}`}
                      />
                    </Popconfirm>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
