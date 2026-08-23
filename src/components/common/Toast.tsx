/**
 * Toast 通知组件
 * 基于 sonner 实现
 */

import { Toaster, toast as sonnerToast } from "sonner";
import type { ExternalToast } from "sonner";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  LoadingOutlined,
} from "@ant-design/icons";

type ToastPosition =
  | "top-left"
  | "top-right"
  | "top-center"
  | "bottom-left"
  | "bottom-right"
  | "bottom-center";

/**
 * Toast 通知系统
 */
export const toast = {
  /**
   * 成功通知
   */
  success: (message: string, options?: ExternalToast) => {
    return sonnerToast.success(message, {
      icon: <CheckCircleOutlined className="text-green-500 text-lg" />,
      ...options,
    });
  },

  /**
   * 错误通知
   */
  error: (message: string, options?: ExternalToast) => {
    return sonnerToast.error(message, {
      icon: <CloseCircleOutlined className="text-red-500 text-lg" />,
      ...options,
    });
  },

  /**
   * 信息通知
   */
  info: (message: string, options?: ExternalToast) => {
    return sonnerToast.info(message, {
      icon: <InfoCircleOutlined className="text-blue-500 text-lg" />,
      ...options,
    });
  },

  /**
   * 警告通知
   */
  warning: (message: string, options?: ExternalToast) => {
    return sonnerToast.warning(message, {
      icon: <WarningOutlined className="text-orange-500 text-lg" />,
      ...options,
    });
  },

  /**
   * 基础通知
   */
  message: (message: string, options?: ExternalToast) => {
    return sonnerToast(message, options);
  },

  /**
   * 加载通知
   */
  loading: (message: string, options?: ExternalToast) => {
    return sonnerToast.loading(message, {
      icon: <LoadingOutlined className="text-lg" spin />,
      ...options,
    });
  },

  /**
   * 承诺通知（异步操作完成时自动更新状态）
   */
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    },
    options?: ExternalToast,
  ) => {
    return sonnerToast.promise(promise, {
      ...messages,
      ...options,
    });
  },

  /**
   * Custom通知
   */
  custom: (
    jsx: (id: string | number) => React.ReactElement,
    options?: ExternalToast,
  ) => {
    return sonnerToast.custom(jsx, options);
  },

  /**
   * 关闭指定通知
   */
  dismiss: (toastId?: string | number) => {
    return sonnerToast.dismiss(toastId);
  },

  /**
   * 关闭所有通知
   */
  dismissAll: () => {
    sonnerToast.dismiss();
  },
};

/**
 * Toast 提供者组件
 * 需要在应用根组件中使用
 */
export function ToastProvider({
  position = "top-right",
  richColors = true,
  closeButton = true,
  duration = 3000,
  expand = true,
}: {
  position?: ToastPosition;
  richColors?: boolean;
  closeButton?: boolean;
  duration?: number;
  expand?: boolean;
} = {}) {
  return (
    <Toaster
      position={position}
      richColors={richColors}
      closeButton={closeButton}
      duration={duration}
      expand={expand}
      toastOptions={{
        style: {
          backgroundColor: "var(--color-bg-secondary)",
          color: "var(--color-text-primary)",
          border: "1px solid var(--color-border)",
          borderRadius: "8px",
        },
        classNames: {
          toast: "group",
          title: "text-sm font-medium",
          description: "text-xs text-[var(--color-text-secondary)]",
          actionButton: "bg-[var(--color-primary)] text-white",
          cancelButton:
            "bg-(--color-bg-tertiary) text-[var(--color-text-secondary)]",
          closeButton:
            "!bg-(--color-bg-tertiary) !border-(--color-border) !text-[var(--color-text-secondary)] hover:!bg-[var(--color-bg-base)]",
        },
      }}
    />
  );
}

export default ToastProvider;
