/**
 * Test set tree component
 * Use Ant Design DirectoryTree to show the category/test set tree
 */

import { useMemo, useCallback } from "react";
import { Tree, Dropdown, Input, Button } from "antd";
import type { TreeProps, DataNode } from "antd/es/tree";
import {
  FolderOutlined,
  ExperimentOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderAddOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import type { TestSet, TestCategory } from "@/types/testset";
import { convertFlatToTree } from "@/utils/tree";

const { DirectoryTree } = Tree;

interface TestSetTreeProps {
  testSets: TestSet[];
  categories: TestCategory[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedTestSetId: string | null;
  onSelectTestSet: (testSet: TestSet) => void;
  onCreateTestSet: (categoryId?: string) => void;
  onCreateCategory: (parentId?: string) => void;
  onEditCategory: (category: TestCategory) => void;
  onDeleteCategory: (category: TestCategory) => void;
}

export function TestSetTree({
  testSets,
  categories,
  searchQuery,
  onSearchChange,
  selectedTestSetId,
  onSelectTestSet,
  onCreateTestSet,
  onCreateCategory,
  onEditCategory,
  onDeleteCategory,
}: TestSetTreeProps) {
  // Build tree data
  const treeData = useMemo(() => {
    // Filter
    const filteredTestSets = testSets.filter((t) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q)
      );
    });

    // Category tree
    const categoryNodes = categories.map((cat) => ({
      id: cat.id,
      parentId: cat.parentId || "",
      name: cat.name,
    }));
    const categoryTree = convertFlatToTree(categoryNodes);

    // Convert the category tree to DataNode
    function buildCategoryNodes(
      cats: (typeof categoryTree)[number][],
    ): DataNode[] {
      return cats.map((cat) => {
        // Test sets under this category
        const childTestSets = filteredTestSets.filter(
          (ts) => ts.categoryId === cat.id,
        );

        // Subcategory nodes
        const childCategoryNodes = cat.children
          ? buildCategoryNodes(cat.children as any[])
          : [];

        // Test set leaf nodes
        const testSetNodes: DataNode[] = childTestSets.map((ts) => ({
          key: `testset-${ts.id}`,
          title: ts.name,
          icon: <ExperimentOutlined style={{ fontSize: 12 }} />,
          isLeaf: true,
        }));

        return {
          key: `category-${cat.id}`,
          title: cat.name,
          icon: <FolderOutlined style={{ fontSize: 12 }} />,
          children: [...childCategoryNodes, ...testSetNodes],
        };
      });
    }

    const rootNodes = buildCategoryNodes(categoryTree);

    // Uncategorized test sets
    const uncategorizedTestSets = filteredTestSets.filter(
      (ts) => !ts.categoryId,
    );

    if (uncategorizedTestSets.length > 0) {
      const uncategorizedNode: DataNode = {
        key: "uncategorized",
        title: "未分类",
        icon: <FolderOutlined style={{ fontSize: 12 }} />,
        children: uncategorizedTestSets.map((ts) => ({
          key: `testset-${ts.id}`,
          title: ts.name,
          icon: <ExperimentOutlined style={{ fontSize: 12 }} />,
          isLeaf: true,
        })),
      };
      rootNodes.push(uncategorizedNode);
    }

    return rootNodes;
  }, [testSets, categories, searchQuery]);

  // key -> data mapping
  const keyMap = useMemo(() => {
    const map: Record<
      string,
      { type: "testset" | "category"; data: TestSet | TestCategory }
    > = {};

    testSets.forEach((ts) => {
      map[`testset-${ts.id}`] = { type: "testset", data: ts };
    });

    categories.forEach((cat) => {
      map[`category-${cat.id}`] = { type: "category", data: cat };
    });

    return map;
  }, [testSets, categories]);

  const handleSelect: TreeProps["onSelect"] = useCallback(
    (keys: React.Key[]) => {
      if (keys.length === 0) return;
      const key = keys[0] as string;
      const entry = keyMap[key];
      if (entry && entry.type === "testset") {
        onSelectTestSet(entry.data as TestSet);
      }
    },
    [keyMap, onSelectTestSet],
  );

  // Context menu
  const getContextMenu = useCallback(
    (nodeKey: string) => {
      const entry = keyMap[nodeKey];
      if (!entry || entry.type !== "category") return undefined;

      const cat = entry.data as TestCategory;
      const isUncategorized = nodeKey === "uncategorized";
      if (isUncategorized) {
        return {
          items: [
            {
              key: "createTestSet",
              label: "新建测试集",
              icon: <PlusOutlined />,
              onClick: () => onCreateTestSet(),
            },
            {
              key: "createSubCategory",
              label: "新建分类",
              icon: <FolderAddOutlined />,
              onClick: () => onCreateCategory(),
            },
          ],
        };
      }

      return {
        items: [
          {
            key: "createTestSet",
            label: "新建测试集",
            icon: <PlusOutlined />,
            onClick: () => onCreateTestSet(cat.id),
          },
          {
            key: "createSubCategory",
            label: "新建子分类",
            icon: <FolderAddOutlined />,
            onClick: () => onCreateCategory(cat.id),
          },
          { type: "divider" as const },
          {
            key: "rename",
            label: "重命名",
            icon: <EditOutlined />,
            onClick: () => onEditCategory(cat),
          },
          {
            key: "delete",
            label: "删除",
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => onDeleteCategory(cat),
          },
        ],
      };
    },
    [
      keyMap,
      onCreateTestSet,
      onCreateCategory,
      onEditCategory,
      onDeleteCategory,
    ],
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header search */}
      <div className="p-3 space-y-2 border-b border-(--color-border)">
        <div className="flex items-center gap-2">
          <Input
            placeholder="搜索测试集..."
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            allowClear
            size="small"
          />
          <Button
            type="text"
            size="small"
            icon={<FolderAddOutlined />}
            onClick={() => onCreateCategory()}
            title="新建分类"
          />
        </div>
      </div>

      {/* Tree list */}
      <div className="flex-1 overflow-y-auto p-2">
        {treeData.length === 0 ? (
          <div className="text-center py-8">
            <ExperimentOutlined
              style={{
                fontSize: 24,
                opacity: 0.5,
                marginBottom: 8,
                display: "block",
              }}
            />
            <span className="text-[var(--color-text-tertiary)] text-sm">
              暂无测试集
            </span>
          </div>
        ) : (
          <DirectoryTree
            treeData={treeData}
            onSelect={handleSelect}
            selectedKeys={
              selectedTestSetId ? [`testset-${selectedTestSetId}`] : []
            }
            defaultExpandAll
            showIcon
            className="bg-transparent test-set-tree"
            titleRender={(nodeData) => {
              const nodeKey = nodeData.key as string;
              const entry = keyMap[nodeKey];
              const isCategory =
                entry?.type === "category" || nodeKey === "uncategorized";
              const menu = getContextMenu(nodeKey);

              const categoryId =
                entry?.type === "category"
                  ? (entry.data as TestCategory).id
                  : undefined;

              const titleEl = (
                <span className="text-[13px]">{nodeData.title as string}</span>
              );

              if (isCategory) {
                const inner = (
                  <div className="flex items-center w-full">
                    {titleEl}
                    <PlusOutlined
                      className="tree-node-add text-[11px]"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateTestSet(categoryId);
                      }}
                    />
                  </div>
                );

                if (menu) {
                  return (
                    <Dropdown menu={menu} trigger={["contextMenu"]}>
                      {inner}
                    </Dropdown>
                  );
                }
                return inner;
              }

              if (menu) {
                return (
                  <Dropdown menu={menu} trigger={["contextMenu"]}>
                    {titleEl}
                  </Dropdown>
                );
              }
              return titleEl;
            }}
          />
        )}
      </div>
    </div>
  );
}
