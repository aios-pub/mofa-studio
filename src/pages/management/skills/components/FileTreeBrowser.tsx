/**
 * File tree browser component
 */

import { Tree } from 'antd';
import type { DataNode } from 'antd/es/tree';
import {
  FileOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  FileTextOutlined,
  FileMarkdownOutlined,
  CodeOutlined,
  FileImageOutlined,
} from '@ant-design/icons';
import type { HubSkillFile } from '@/types/skill';

interface FileTreeBrowserProps {
  files: HubSkillFile[];
  onFileSelect: (path: string) => void;
}

function getFileIcon(filename: string): React.ReactNode {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext) return <FileOutlined />;

  switch (ext) {
    case 'md':
      return <FileMarkdownOutlined />;
    case 'txt':
      return <FileTextOutlined />;
    case 'json':
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
    case 'rs':
    case 'go':
    case 'py':
      return <CodeOutlined />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return <FileImageOutlined />;
    default:
      return <FileOutlined />;
  }
}

function buildTree(files: HubSkillFile[]): DataNode[] {
  const tree: Record<string, DataNode> = {};

  files.forEach(file => {
    const parts = file.filePath.split('/');
    let currentPath = '';

    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      const key = currentPath ? `${currentPath}/${part}` : part;

      if (!tree[key]) {
        tree[key] = {
          title: part,
          key,
          icon: isFile ? getFileIcon(part) : <FolderOutlined />,
          children: isFile ? undefined : [],
          isLeaf: isFile,
        };
      }

      if (currentPath && tree[currentPath] && tree[currentPath].children) {
        if (!tree[currentPath].children!.some(child => child.key === key)) {
          tree[currentPath].children!.push(tree[key]);
        }
      }

      currentPath = key;
    });
  });

  // Get root nodes (those without parent in the tree)
  const roots = Object.values(tree).filter(node => {
    const key = node.key as string;
    return !Object.values(tree).some(parent =>
      parent.children?.some(child => child.key === key)
    );
  });

  return roots;
}

export function FileTreeBrowser({ files, onFileSelect }: FileTreeBrowserProps) {
  const treeData = buildTree(files);

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <h3 className="text-sm font-semibold mb-3 text-gray-700">文件列表</h3>
      <Tree
        showIcon
        defaultExpandAll
        switcherIcon={{ open: <FolderOpenOutlined />, close: <FolderOutlined /> }}
        treeData={treeData}
        onSelect={keys => {
          if (keys.length > 0) {
            const path = keys[0] as string;
            onFileSelect(path);
          }
        }}
      />
    </div>
  );
}
