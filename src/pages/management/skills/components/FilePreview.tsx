import { useTranslation } from "react-i18next";
/**
 * File preview component
 */

import { Card, Empty, Spin } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface FilePreviewProps {
  fileName: string;
  content: string | null;
  loading: boolean;
}

export function FilePreview({ fileName, content, loading }: FilePreviewProps) {  const { t } = useTranslation();

  if (loading) {
    return (
      <Card>
        <div className="flex justify-center py-8">
          <Spin />
        </div>
      </Card>
    );
  }

  if (!content) {
    return (
      <Card>
        <Empty description={t("选择一个文件以预览内容")} />
      </Card>
    );
  }

  const ext = fileName.split('.').pop()?.toLowerCase();
  const isMarkdown = ext === 'md';

  return (
    <Card
      title={fileName}
      className="h-full"
      bodyStyle={{ maxHeight: '600px', overflow: 'auto' }}
    >
      {isMarkdown ? (
        <div className="prose prose-slate max-w-none dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </div>
      ) : (
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm">
          <code>{content}</code>
        </pre>
      )}
    </Card>
  );
}
