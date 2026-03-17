/**
 * 复制到剪贴板 Hook
 */

import { useState, useCallback } from "react";
import { message } from "antd";
import { copyToClipboard } from "@/utils";

export interface UseCopyToClipboardOptions {
  /** 成功提示文字 */
  successText?: string;
  /** 失败提示文字 */
  errorText?: string;
  /** 是否显示提示 */
  showMessage?: boolean;
  /** 复制成功回调 */
  onSuccess?: () => void;
  /** 复制失败回调 */
  onError?: () => void;
}

export interface UseCopyToClipboardReturn {
  /** 复制状态 */
  copied: boolean;
  /** 正在复制中 */
  copying: boolean;
  /** 复制函数 */
  copy: (text: string) => Promise<void>;
  /** 重置状态 */
  reset: () => void;
}

/**
 * 复制到剪贴板 Hook
 * @param options 配置选项
 * @returns 复制函数和状态
 */
export function useCopyToClipboard(
  options: UseCopyToClipboardOptions = {},
): UseCopyToClipboardReturn {
  const {
    successText = "复制成功",
    errorText = "复制失败",
    showMessage = true,
    onSuccess,
    onError,
  } = options;

  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);

  const copy = useCallback(
    async (text: string) => {
      setCopying(true);

      try {
        const success = await copyToClipboard(text);

        if (success) {
          setCopied(true);
          if (showMessage) {
            message.success(successText);
          }
          onSuccess?.();

          // 自动重置状态
          setTimeout(() => {
            setCopied(false);
          }, 2000);
        } else {
          if (showMessage) {
            message.error(errorText);
          }
          onError?.();
        }
      } catch (error) {
        if (showMessage) {
          message.error(errorText);
        }
        onError?.();
      } finally {
        setCopying(false);
      }
    },
    [successText, errorText, showMessage, onSuccess, onError],
  );

  const reset = useCallback(() => {
    setCopied(false);
    setCopying(false);
  }, []);

  return { copied, copying, copy, reset };
}

export default useCopyToClipboard;
