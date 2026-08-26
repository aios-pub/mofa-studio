import { useTranslation } from "react-i18next";
/**
 * Visual API documentation page
 * Swagger UI-like interface for browsing API docs and testing online
 */

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button, Space, Tag, Breadcrumb, Empty, Spin } from "antd";
import {
  ApiOutlined,
  BookOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import type { ApiDocumentation, EndpointDocumentation } from "@/types/documentation";
import { ApiEndpointCard } from "@/components/docs/ApiEndpointCard";
import { InlineTestPanel } from "@/components/docs/InlineTestPanel";
import { DocsSearch } from "@/components/docs/DocsSearch";
import { testSetRealApi } from "@/services/real/testsets";

interface InteractiveDocsProps {
  testSetId?: string;
}

export function InteractiveDocs({ testSetId: propTestSetId }: InteractiveDocsProps) {  const { t } = useTranslation();

  const { testSetId: routeTestSetId } = useParams<{ testSetId: string }>();
  const testSetId = propTestSetId || routeTestSetId;
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<ApiDocumentation | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointDocumentation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!testSetId) return;

    // Reset related state when switching test sets to avoid stale data
    setSelectedEndpoint(null);
    setSearchQuery("");
    setSelectedTag("all");

    let ignore = false;
    const load = async () => {
      setLoading(true);
      try {
        const response = await testSetRealApi.getDocumentation(testSetId);
        if (!ignore) {
          setDocs(response);
        }
      } catch (error) {
        if (!ignore) {
          console.error("Failed to load docs:", error);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };
    load();

    return () => {
      ignore = true;
    };
  }, [testSetId]);

  const filteredEndpoints = docs?.endpoints.filter((endpoint) => {
    const matchesSearch =
      !searchQuery ||
      endpoint.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      endpoint.path.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTag =
      selectedTag === "all" || endpoint.tags.includes(selectedTag);

    return matchesSearch && matchesTag;
  });

  const groupedEndpoints = filteredEndpoints?.reduce(
    (acc, endpoint) => {
      const tag = endpoint.tags[0] || "default";
      if (!acc[tag]) {
        acc[tag] = [];
      }
      acc[tag].push(endpoint);
      return acc;
    },
    {} as Record<string, EndpointDocumentation[]>
  );

  const uniqueTags = Array.from(
    new Set(
      docs?.endpoints.flatMap((e) => e.tags).filter(Boolean) || ["all"]
    )
  );

  return (
    <div className="flex h-full bg-gray-50">
      {/* Sidebar */}
      {!sidebarCollapsed && (
        <div className="w-72 border-r border-gray-200 bg-white flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <Space>
                <ApiOutlined className="text-blue-600" />
                <span className="font-semibold">{t("API 文档")}</span>
              </Space>
              <Button
                type="text"
                size="small"
                icon={<MenuOutlined />}
                onClick={() => setSidebarCollapsed(true)}
              />
            </div>
            <DocsSearch
              value={searchQuery}
              onChange={setSearchQuery}
              endpoints={docs?.endpoints || []}
            />
          </div>

          {/* Tab filtering */}
          <div className="px-4 py-2 border-b border-gray-200">
            <div className="flex flex-wrap gap-1">
              <Tag
                color={selectedTag === "all" ? "blue" : "default"}
                className="cursor-pointer"
                onClick={() => setSelectedTag("all")}
              >
                全部 ({docs?.endpoints.length || 0})
              </Tag>
              {uniqueTags.map((tag) => (
                <Tag
                  key={tag}
                  color={selectedTag === tag ? "blue" : "default"}
                  className="cursor-pointer"
                  onClick={() => setSelectedTag(tag)}
                >
                  {tag}
                </Tag>
              ))}
            </div>
          </div>

          {/* API list */}
          <div className="flex-1 overflow-y-auto p-2">
            {groupedEndpoints ? (
              Object.entries(groupedEndpoints).map(([tag, endpoints]) => (
                <div key={tag} className="mb-2">
                  <div className="text-xs text-gray-500 font-medium mb-1 px-2">
                    {tag}
                  </div>
                  {endpoints.map((endpoint) => (
                    <div
                      key={endpoint.id}
                      className={`px-2 py-1.5 rounded cursor-pointer hover:bg-gray-100 transition-colors ${
                        selectedEndpoint?.id === endpoint.id ? "bg-blue-50" : ""
                      }`}
                      onClick={() => setSelectedEndpoint(endpoint)}
                    >
                      <div className="flex items-center gap-2">
                        <MethodTag method={endpoint.method} />
                        <span className="text-sm truncate">{endpoint.name}</span>
                      </div>
                      <div className="text-xs text-gray-400 truncate ml-6">
                        {endpoint.path}
                      </div>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <div className="p-4">
                {loading ? (
                  <Spin />
                ) : (
                  <Empty description={t("暂无API文档")} />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header navigation */}
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <Space>
              {sidebarCollapsed && (
                <Button
                  type="text"
                  icon={<MenuOutlined />}
                  onClick={() => setSidebarCollapsed(false)}
                >
                  目录
                </Button>
              )}
              <Breadcrumb>
                <Breadcrumb.Item>{t("API文档")}</Breadcrumb.Item>
                {docs && (
                  <Breadcrumb.Item>{docs.info.title}</Breadcrumb.Item>
                )}
                {selectedEndpoint && (
                  <Breadcrumb.Item>{selectedEndpoint.name}</Breadcrumb.Item>
                )}
              </Breadcrumb>
            </Space>
            <Space>
              <Button
                icon={<BookOutlined />}
                href="https://swagger.io/docs/"
                target="_blank"
              >
                Swagger UI
              </Button>
            </Space>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedEndpoint ? (
            // Overview page
            docs && (
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                  <h1 className="text-2xl font-bold mb-2">{docs.info.title}</h1>
                  {docs.info.description && (
                    <p className="text-gray-600 mb-4">{docs.info.description}</p>
                  )}
                  <div className="flex gap-4">
                    <div>
                      <div className="text-2xl font-bold">{docs.endpoints.length}</div>
                      <div className="text-sm text-gray-500">{t("API数量")}</div>
                    </div>
                  </div>
                </div>

                {/* Server information */}
                {docs.servers && docs.servers.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4">{t("服务器")}</h2>
                    <div className="space-y-2">
                      {docs.servers.map((server, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded">
                          <code className="text-sm">{server.url}</code>
                          {server.description && (
                            <p className="text-sm text-gray-600 mt-1">{server.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* API list */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-lg font-semibold mb-4">{t("API列表")}</h2>
                  <div className="space-y-3">
                    {filteredEndpoints?.map((endpoint) => (
                      <div
                        key={endpoint.id}
                        className="border border-gray-200 rounded p-4 hover:shadow-sm transition-shadow cursor-pointer"
                        onClick={() => setSelectedEndpoint(endpoint)}
                      >
                        <div className="flex items-center justify-between">
                          <Space>
                            <MethodTag method={endpoint.method} />
                            <span className="font-semibold">{endpoint.name}</span>
                          </Space>
                          <code className="text-sm text-gray-500">{endpoint.path}</code>
                        </div>
                        {endpoint.description && (
                          <p className="text-sm text-gray-600 mt-2">{endpoint.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          ) : (
            // Endpoint detail page
            <div className="max-w-5xl mx-auto">
              <ApiEndpointCard
                endpoint={selectedEndpoint}
              />

              {/* Test panel */}
              <div className="mt-6">
                <InlineTestPanel
                  endpoint={selectedEndpoint}
                  onSaveRequest={() => console.log("Save as test case")}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// HTTP method tag component
function MethodTag({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "blue",
    POST: "green",
    PUT: "orange",
    DELETE: "red",
    PATCH: "purple",
  };

  return <Tag color={colors[method] || "default"}>{method}</Tag>;
}
