/**
 * Copy to clipboard hook
 */

import { useState, useCallback } from "react";
import { message } from "antd";
import { copyToClipboard } from "@/utils";

export interface UseCopyToClipboardOptions {
  /** Success hint text */
  successText?: string;
  /** Failure hint text */
  errorText?: string;
  /** Whether to show hints */
  showMessage?: boolean;
  /** Copy success callback */
  onSuccess?: () => void;
  /** Copy failure callback */
  onError?: () => void;
}

export interface UseCopyToClipboardReturn {
  /** Copy state */
  copied: boolean;
  /** Copying */
  copying: boolean;
  /** Copy function */
  copy: (text: string) => Promise<void>;
  /** Reset state */
  reset: () => void;
}

/**
 * Copy to clipboard hook
 * @param options Configuration options
 * @returns Copy function and state
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

          // Auto-reset state
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
