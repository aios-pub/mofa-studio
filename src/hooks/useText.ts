/**
 * 文本处理 Hook
 * 提供文本选择和剪贴板操作
 */

import { useState, useCallback, useEffect } from 'react';
import { message } from 'antd';

// ==================== 文本选择 ====================

export interface TextSelection {
  text: string;
  start: number;
  end: number;
  range: Range | null;
}

const emptySelection: TextSelection = {
  text: '',
  start: 0,
  end: 0,
  range: null,
};

/**
 * 获取文本选择
 * @returns 当前选择的文本信息
 */
export function useTextSelection(): TextSelection {
  const [selection, setSelection] = useState<TextSelection>(emptySelection);

  const handleSelectionChange = useCallback(() => {
    const domSelection = window.getSelection();
    if (!domSelection || domSelection.rangeCount === 0) {
      setSelection(emptySelection);
      return;
    }

    const text = domSelection.toString();
    const range = domSelection.getRangeAt(0);

    setSelection({
      text,
      start: range.startOffset,
      end: range.endOffset,
      range,
    });
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  return selection;
}

/**
 * 监听元素内的文本选择
 * @param ref 元素引用
 * @returns 选择的文本信息
 */
export function useElementTextSelection<T extends HTMLElement>(
  ref: React.RefObject<T | null>
): TextSelection {
  const [selection, setSelection] = useState<TextSelection>(emptySelection);

  const handleMouseUp = useCallback(() => {
    if (!ref.current) return;

    const domSelection = window.getSelection();
    if (!domSelection || domSelection.rangeCount === 0) {
      setSelection(emptySelection);
      return;
    }

    const range = domSelection.getRangeAt(0);

    // 检查选择是否在目标元素内
    if (!ref.current.contains(range.commonAncestorContainer)) {
      setSelection(emptySelection);
      return;
    }

    const text = domSelection.toString();

    setSelection({
      text,
      start: range.startOffset,
      end: range.endOffset,
      range,
    });
  }, [ref]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.addEventListener('mouseup', handleMouseUp);
    return () => {
      element.removeEventListener('mouseup', handleMouseUp);
    };
  }, [ref, handleMouseUp]);

  return selection;
}

// ==================== 剪贴板增强版 ====================

export interface UseClipboardOptions {
  /** 成功提示 */
  successMessage?: string | false;
  /** Failed提示 */
  errorMessage?: string | false;
  /** 复制成功回调 */
  onSuccess?: (text: string) => void;
  /** 复制Failed回调 */
  onError?: (error: Error) => void;
  /** 读取成功回调 */
  onRead?: (text: string) => void;
}

export interface UseClipboardReturn {
  /** 复制文本 */
  copy: (text: string) => Promise<boolean>;
  /** 复制Rich text（HTML） */
  copyHTML: (html: string, plainText?: string) => Promise<boolean>;
  /** 读取剪贴板文本 */
  read: () => Promise<string | null>;
  /** 读取剪贴板所有项目 */
  readAll: () => Promise<ClipboardItems | null>;
  /** 最后复制的文本 */
  lastCopied: string | null;
  /** 是否正在操作 */
  loading: boolean;
  /** 是否支持剪贴板 API */
  isSupported: boolean;
}

/**
 * 剪贴板操作 Hook（增强版）
 * @param options Configuration options
 * @returns 剪贴板操作方法
 */
export function useClipboard(options: UseClipboardOptions = {}): UseClipboardReturn {
  const {
    successMessage = '已复制到剪贴板',
    errorMessage = '复制失败',
    onSuccess,
    onError,
    onRead,
  } = options;

  const [lastCopied, setLastCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSupported = typeof navigator !== 'undefined' && !!navigator.clipboard;

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      setLoading(true);

      try {
        if (isSupported && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          // Fallback: 使用 execCommand
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.position = 'fixed';
          textarea.style.left = '-9999px';
          textarea.style.top = '-9999px';
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();

          const successful = document.execCommand('copy');
          document.body.removeChild(textarea);

          if (!successful) {
            throw new Error('execCommand copy failed');
          }
        }

        setLastCopied(text);
        if (successMessage !== false) {
          message.success(successMessage);
        }
        onSuccess?.(text);
        setLoading(false);
        return true;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        if (errorMessage !== false) {
          message.error(errorMessage);
        }
        onError?.(err);
        setLoading(false);
        return false;
      }
    },
    [isSupported, successMessage, errorMessage, onSuccess, onError]
  );

  const copyHTML = useCallback(
    async (html: string, plainText?: string): Promise<boolean> => {
      setLoading(true);

      try {
        if (isSupported && navigator.clipboard.write) {
          const clipboardItems: ClipboardItems = [
            new ClipboardItem({
              'text/html': new Blob([html], { type: 'text/html' }),
              ...(plainText ? { 'text/plain': new Blob([plainText], { type: 'text/plain' }) } : {}),
            }),
          ];
          await navigator.clipboard.write(clipboardItems);
        } else {
          // Fallback: 只复制纯文本
          const textToCopy = plainText || html.replace(/<[^>]*>/g, '');
          return copy(textToCopy);
        }

        setLastCopied(html);
        if (successMessage !== false) {
          message.success(successMessage);
        }
        onSuccess?.(html);
        setLoading(false);
        return true;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        if (errorMessage !== false) {
          message.error(errorMessage);
        }
        onError?.(err);
        setLoading(false);
        return false;
      }
    },
    [isSupported, copy, successMessage, errorMessage, onSuccess, onError]
  );

  const read = useCallback(async (): Promise<string | null> => {
    setLoading(true);

    try {
      if (isSupported && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        onRead?.(text);
        setLoading(false);
        return text;
      }
      setLoading(false);
      return null;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
      setLoading(false);
      return null;
    }
  }, [isSupported, onRead, onError]);

  const readAll = useCallback(async (): Promise<ClipboardItems | null> => {
    setLoading(true);

    try {
      if (isSupported && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        setLoading(false);
        return items;
      }
      setLoading(false);
      return null;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
      setLoading(false);
      return null;
    }
  }, [isSupported, onError]);

  return {
    copy,
    copyHTML,
    read,
    readAll,
    lastCopied,
    loading,
    isSupported,
  };
}

// ==================== 文本统计 ====================

export interface TextStats {
  characters: number;
  charactersWithoutSpaces: number;
  words: number;
  lines: number;
  paragraphs: number;
}

/**
 * 计算文本统计信息
 * @param text 文本
 * @returns 统计信息
 */
export function useTextStats(text: string): TextStats {
  return {
    characters: text.length,
    charactersWithoutSpaces: text.replace(/\s/g, '').length,
    words: text.trim() ? text.trim().split(/\s+/).length : 0,
    lines: text.split('\n').length,
    paragraphs: text.split(/\n\s*\n/).filter(Boolean).length,
  };
}

// ==================== 文本搜索高亮 ====================

export interface UseTextHighlightOptions {
  /** 是否区分大小写 */
  caseSensitive?: boolean;
  /** 是否全词匹配 */
  wholeWord?: boolean;
  /** 高亮类名 */
  highlightClassName?: string;
}

/**
 * 文本搜索高亮
 * @param text 原始文本
 * @param search 搜索词
 * @param options Configuration options
 * @returns 高亮后的文本片段数组
 */
export function useTextHighlight(
  text: string,
  search: string,
  options: UseTextHighlightOptions = {}
): Array<{ text: string; highlighted: boolean }> {
  const { caseSensitive = false, wholeWord = false } = options;

  if (!search) {
    return [{ text, highlighted: false }];
  }

  const flags = caseSensitive ? 'g' : 'gi';
  let pattern = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  if (wholeWord) {
    pattern = `\\b${pattern}\\b`;
  }

  const regex = new RegExp(pattern, flags);
  const result: Array<{ text: string; highlighted: boolean }> = [];
  let lastIndex = 0;

  text.replace(regex, (match, index) => {
    // 添加未匹配的部分
    if (index > lastIndex) {
      result.push({ text: text.slice(lastIndex, index), highlighted: false });
    }
    // 添加匹配的部分
    result.push({ text: match, highlighted: true });
    lastIndex = index + match.length;
    return match;
  });

  // 添加剩余部分
  if (lastIndex < text.length) {
    result.push({ text: text.slice(lastIndex), highlighted: false });
  }

  return result;
}

export default {
  useTextSelection,
  useElementTextSelection,
  useClipboard,
  useTextStats,
  useTextHighlight,
};
