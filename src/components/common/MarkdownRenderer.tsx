/**
 * Markdown 渲染组件
 * 用于 LLM 对话Messages渲染
 * 支持 GFM、代码高亮、数学公式等
 */

import React, { useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import { useBoolean } from '@/hooks';
import { copyToClipboard } from '@/utils';

// KaTeX 样式
import 'katex/dist/katex.min.css';

// ==================== 类型定义 ====================

export interface MarkdownRendererProps {
  /** Markdown 内容 */
  content: string;
  /** Whether to enable GFM (GitHub Flavored Markdown) */
  gfm?: boolean;
  /** Whether to enable代码高亮 */
  highlight?: boolean;
  /** Whether to enable数学公式 */
  math?: boolean;
  /** 是否允许 HTML */
  allowHtml?: boolean;
  /** 是否显示代码复制按钮 */
  showCopyButton?: boolean;
  /** Custom类名 */
  className?: string;
  /** 链接点击回调 */
  onLinkClick?: (href: string, e: React.MouseEvent) => void;
}

// ==================== 代码块组件 ====================

interface CodeBlockProps {
  language?: string;
  code: string;
  showCopyButton?: boolean;
}

function CodeBlock({ language, code, showCopyButton = true }: CodeBlockProps) {
  const { value: copied, setTrue: setCopied } = useBoolean(false);

  const handleCopy = useCallback(async () => {
    const success = await copyToClipboard(code);
    if (success) {
      setCopied();
      setTimeout(() => setCopied(), 2000);
    }
  }, [code, setCopied]);

  return (
    <div className="relative group my-4">
      {/* LanguageLabel和复制按钮 */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 rounded-t-lg border-b border-gray-700">
        <span className="text-xs text-gray-400 font-mono">
          {language || 'text'}
        </span>
        {showCopyButton && (
          <Tooltip title={copied ? '已复制' : '复制代码'}>
            <Button
              type="text"
              size="small"
              icon={copied ? <CheckOutlined /> : <CopyOutlined />}
              onClick={handleCopy}
              className="text-gray-400 hover:text-white"
            />
          </Tooltip>
        )}
      </div>

      {/* 代码内容 */}
      <div className="overflow-x-auto">
        <pre className="!mt-0 !rounded-t-none p-4 bg-gray-900 text-sm">
          <code className={`language-${language || 'text'}`}>{code}</code>
        </pre>
      </div>
    </div>
  );
}

// ==================== Markdown 渲染器 ====================

export function MarkdownRenderer({
  content,
  gfm = true,
  highlight = true,
  math = true,
  allowHtml = true,
  showCopyButton = true,
  className = '',
  onLinkClick,
}: MarkdownRendererProps) {
  // 配置 remark 插件
  const remarkPlugins = useMemo(() => {
    const plugins = [];
    if (gfm) {
      plugins.push(remarkGfm);
    }
    if (math) {
      plugins.push(remarkMath);
    }
    return plugins;
  }, [gfm, math]) as React.ComponentProps<typeof ReactMarkdown>['remarkPlugins'];

  // 配置 rehype 插件
  const rehypePlugins = useMemo(() => {
    const plugins = [];
    if (highlight) {
      plugins.push(rehypeHighlight);
    }
    if (math) {
      plugins.push(rehypeKatex);
    }
    if (allowHtml) {
      plugins.push(rehypeRaw);
    }
    return plugins;
  }, [highlight, math, allowHtml]) as React.ComponentProps<typeof ReactMarkdown>['rehypePlugins'];

  // Custom组件
  const components = useMemo(
    () => ({
      // 代码块
      code: ({ inline, className: codeClassName, children, ...props }: any) => {
        if (inline) {
          return (
            <code
              className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono text-pink-600 dark:text-pink-400"
              {...props}
            >
              {children}
            </code>
          );
        }

        // 提取Language
        const match = /language-(\w+)/.exec(codeClassName || '');
        const language = match ? match[1] : undefined;
        const codeString = String(children).replace(/\n$/, '');

        return (
          <CodeBlock
            language={language}
            code={codeString}
            showCopyButton={showCopyButton}
          />
        );
      },

      // 链接
      a: ({ href, children, ...props }: any) => {
        const handleClick = (e: React.MouseEvent) => {
          if (onLinkClick) {
            e.preventDefault();
            onLinkClick(href, e);
          } else if (href && (href.startsWith('http') || href.startsWith('//'))) {
            // 外部链接在新窗口打开
            e.preventDefault();
            window.open(href, '_blank', 'noopener,noreferrer');
          }
        };

        return (
          <a
            href={href}
            onClick={handleClick}
            className="text-blue-600 dark:text-blue-400 hover:underline"
            target={href?.startsWith('http') ? '_blank' : undefined}
            rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
            {...props}
          >
            {children}
          </a>
        );
      },

      // 表格
      table: ({ children, ...props }: any) => (
        <div className="overflow-x-auto my-4">
          <table
            className="min-w-full border-collapse border border-gray-300 dark:border-gray-600"
            {...props}
          >
            {children}
          </table>
        </div>
      ),

      // 表头
      th: ({ children, ...props }: any) => (
        <th
          className="border border-gray-300 dark:border-gray-600 px-4 py-2 bg-gray-100 dark:bg-gray-800 font-semibold text-left"
          {...props}
        >
          {children}
        </th>
      ),

      // 表格单元格
      td: ({ children, ...props }: any) => (
        <td
          className="border border-gray-300 dark:border-gray-600 px-4 py-2"
          {...props}
        >
          {children}
        </td>
      ),

      // 引用块
      blockquote: ({ children, ...props }: any) => (
        <blockquote
          className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-4 italic text-gray-600 dark:text-gray-400"
          {...props}
        >
          {children}
        </blockquote>
      ),

      // Title
      h1: ({ children, ...props }: any) => (
        <h1 className="text-2xl font-bold my-4" {...props}>
          {children}
        </h1>
      ),
      h2: ({ children, ...props }: any) => (
        <h2 className="text-xl font-bold my-3" {...props}>
          {children}
        </h2>
      ),
      h3: ({ children, ...props }: any) => (
        <h3 className="text-lg font-semibold my-3" {...props}>
          {children}
        </h3>
      ),
      h4: ({ children, ...props }: any) => (
        <h4 className="text-base font-semibold my-2" {...props}>
          {children}
        </h4>
      ),

      // 列表
      ul: ({ children, ...props }: any) => (
        <ul className="list-disc list-inside my-2 space-y-1" {...props}>
          {children}
        </ul>
      ),
      ol: ({ children, ...props }: any) => (
        <ol className="list-decimal list-inside my-2 space-y-1" {...props}>
          {children}
        </ol>
      ),

      // 分割线
      hr: (props: any) => (
        <hr className="my-6 border-gray-300 dark:border-gray-600" {...props} />
      ),

      // 图片
      img: ({ src, alt, ...props }: any) => (
        <img
          src={src}
          alt={alt}
          className="max-w-full h-auto rounded my-2"
          loading="lazy"
          {...props}
        />
      ),

      // 段落
      p: ({ children, ...props }: any) => (
        <p className="my-2 leading-relaxed" {...props}>
          {children}
        </p>
      ),
    }),
    [showCopyButton, onLinkClick]
  );

  return (
    <div className={`markdown-body text-[var(--color-text-primary)] ${className}`}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default MarkdownRenderer;
