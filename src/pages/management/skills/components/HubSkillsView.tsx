import { useTranslation } from "react-i18next";
/**
 * Skill hub browse page
 * With search, filtering and sorting
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Input,
  Select,
  Tag,
  Button,
  Space,
  Pagination,
  Empty,
  Spin,
  Typography,
  Checkbox,
} from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useSkillHubStore } from '@/stores/useSkillHubStore';
import type { HubSkill } from '@/types/skill';
import { HubSkillCard } from './HubSkillCard';

const { Search } = Input;
const { Text } = Typography;

export function HubSkillsView() {  const { t } = useTranslation();

  const navigate = useNavigate();

  const {
    searchQuery,
    selectedNamespace,
    selectedLabels,
    sortBy,
    searchResults,
    searchLoading,
    namespaces,
    namespaceLoading,
    labels,
    installingSkillIds,
    installedSkillIds,
    setSearchQuery,
    setSelectedNamespace,
    setSelectedLabels,
    setSortBy,
    search,
    loadNamespaces,
    loadLabels,
    installSkillFromHub,
  } = useSkillHubStore();

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    loadNamespaces();
    loadLabels('zh-CN');
    search();
  }, []);

  const handleSearch = () => {
    setCurrentPage(1);
    search();
  };

  const handleInstallSkill = async (skill: HubSkill) => {
    await installSkillFromHub(skill.namespace_slug, skill.slug, skill.id);
  };

  const handleLabelChange = (labelId: string, checked: boolean) => {
    const newLabels = checked
      ? [...selectedLabels, labelId]
      : selectedLabels.filter(l => l !== labelId);
    setSelectedLabels(newLabels);
  };

  const facets = searchResults?.facets;

  return (
    <div className="p-6">
      {/* Search Header */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-4">
          <Search
            placeholder={t("搜索技能名称、描述...")}
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onSearch={handleSearch}
            className="flex-1"
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={handleSearch}
            loading={searchLoading}
          >
            刷新
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-center flex-wrap">
          {/* Namespace Filter */}
          <div className="flex items-center gap-2">
            <Text type="secondary">{t("命名空间:")}</Text>
            <Select
              placeholder={t("全部")}
              allowClear
              style={{ width: 150 }}
              value={selectedNamespace || undefined}
              onChange={setSelectedNamespace}
              loading={namespaceLoading}
            >
              {namespaces.map(ns => (
                <Select.Option key={ns.id} value={ns.slug}>
                  {ns.display_name}
                </Select.Option>
              ))}
            </Select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2">
            <Text type="secondary">{t("排序:")}</Text>
            <Select
              value={sortBy}
              onChange={setSortBy}
              style={{ width: 120 }}
            >
              <Select.Option value="newest">{t("最新")}</Select.Option>
              <Select.Option value="popular">{t("最受欢迎")}</Select.Option>
              <Select.Option value="rating">{t("最高评分")}</Select.Option>
            </Select>
          </div>
        </div>

        {/* Label Filters */}
        {labels.length > 0 && (
          <div className="space-y-2">
            <Text type="secondary">{t("标签筛选:")}</Text>
            <Space wrap>
              {labels.map(label => (
                <Checkbox
                  key={label.id}
                  checked={selectedLabels.includes(label.id)}
                  onChange={e => handleLabelChange(label.id, e.target.checked)}
                >
                  <Tag
                    color={label.type === 'RECOMMENDED' ? 'blue' : 'purple'}
                    className="m-0"
                  >
                    {label.display_name}
                  </Tag>
                </Checkbox>
              ))}
            </Space>
          </div>
        )}
      </div>

      {/* Facets (optional) */}
      {facets && (facets.namespaces.length > 0 || facets.labels.length > 0) && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex gap-6">
            {facets.namespaces.length > 0 && (
              <div>
                <Text type="secondary" className="mr-2">{t("命名空间:")}</Text>
                <Space wrap>
                  {facets.namespaces.map(ns => (
                    <Tag key={ns.slug}>{ns.display_name} ({ns.count})</Tag>
                  ))}
                </Space>
              </div>
            )}
            {facets.labels.length > 0 && (
              <div>
                <Text type="secondary" className="mr-2">{t("相关标签:")}</Text>
                <Space wrap>
                  {facets.labels.map(l => (
                    <Tag key={l.id} color="blue">
                      {l.display_name} ({l.count})
                    </Tag>
                  ))}
                </Space>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {searchLoading ? (
        <div className="flex justify-center py-12">
          <Spin size="large" />
        </div>
      ) : searchResults?.skills && searchResults.skills.length > 0 ? (
        <>
          <div className="mb-4">
            <Text type="secondary">
              找到 {searchResults.total} 个结果
            </Text>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults.skills.map(skill => (
              <HubSkillCard
                key={skill.id}
                skill={skill}
                isInstalled={installedSkillIds.has(skill.id)}
                isInstalling={installingSkillIds.has(skill.id)}
                onInstall={() => handleInstallSkill(skill)}
                onClick={() => navigate(`/management/skills/hub/${skill.namespace_slug}/${skill.slug}`)}
              />
            ))}
          </div>

          {/* Pagination */}
          {searchResults.total > pageSize && (
            <div className="flex justify-center mt-6">
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={searchResults.total}
                onChange={page => {
                  setCurrentPage(page);
                  search(page - 1);
                }}
                showSizeChanger={false}
                showTotal={(total) => t("共 {{p0}} 个", { p0: total })}
              />
            </div>
          )}
        </>
      ) : (
        <Empty
          description={t("暂无技能")}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}
    </div>
  );
}
