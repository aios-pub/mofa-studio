/**
 * Text processing hook
 * Provides text selection and clipboard operations
 */

import { useState, useCallback, useEffect } from 'react';
import { message } from 'antd';

// ==================== Text selection ====================

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
 * Get text selection
 * @returns Currently selected text info
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
 * Listen to text selection within the element
 * @param ref Element reference
 * @returns Selected text info
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

    // Check whether the selection is inside the target element
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

// ==================== Enhanced clipboard ====================

export interface UseClipboardOptions {
  /** Success hint */
  successMessage?: string | false;
  /** Failure hint */
  errorMessage?: string | false;
  /** Copy success callback */
  onSuccess?: (text: string) => void;
  /** Copy failure callback */
  onError?: (error: Error) => void;
  /** Read success callback */
  onRead?: (text: string) => void;
}

export interface UseClipboardReturn {
  /** Copy text */
  copy: (text: string) => Promise<boolean>;
  /** Copy rich text (HTML) */
  copyHTML: (html: string, plainText?: string) => Promise<boolean>;
  /** Read clipboard text */
  read: () => Promise<string | null>;
  /** Read all clipboard items */
  readAll: () => Promise<ClipboardItems | null>;
  /** Last copied text */
  lastCopied: string | null;
  /** Whether an operation is in progress */
  loading: boolean;
  /** Whether the Clipboard API is supported */
  isSupported: boolean;
}

/**
 * Clipboard operations hook (enhanced)
 * @param options Configuration options
 * @returns Clipboard operation methods
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
          // Fallback: use execCommand
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
          // Fallback: copy plain text only
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

// ==================== Text statistics ====================

export interface TextStats {
  characters: number;
  charactersWithoutSpaces: number;
  words: number;
  lines: number;
  paragraphs: number;
}

/**
 * Compute text statistics
 * @param text Text
 * @returns Statistics info
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

// ==================== Text search highlighting ====================

export interface UseTextHighlightOptions {
  /** Case-sensitive */
  caseSensitive?: boolean;
  /** Whole-word match */
  wholeWord?: boolean;
  /** Highlight class name */
  highlightClassName?: string;
}

/**
 * Text search highlighting
 * @param text Raw text
 * @param search Search term
 * @param options Configuration options
 * @returns Array of highlighted text segments
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
    // Add the unmatched part
    if (index > lastIndex) {
      result.push({ text: text.slice(lastIndex, index), highlighted: false });
    }
    // Add the matched part
    result.push({ text: match, highlighted: true });
    lastIndex = index + match.length;
    return match;
  });

  // Add the remaining part
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
