/**
 * Toast notification component
 * Implemented with sonner
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
 * Toast notification system
 */
export const toast = {
  /**
   * Success notification
   */
  success: (message: string, options?: ExternalToast) => {
    return sonnerToast.success(message, {
      icon: <CheckCircleOutlined className="text-green-500 text-lg" />,
      ...options,
    });
  },

  /**
   * Error notification
   */
  error: (message: string, options?: ExternalToast) => {
    return sonnerToast.error(message, {
      icon: <CloseCircleOutlined className="text-red-500 text-lg" />,
      ...options,
    });
  },

  /**
   * Info notification
   */
  info: (message: string, options?: ExternalToast) => {
    return sonnerToast.info(message, {
      icon: <InfoCircleOutlined className="text-blue-500 text-lg" />,
      ...options,
    });
  },

  /**
   * Warning notification
   */
  warning: (message: string, options?: ExternalToast) => {
    return sonnerToast.warning(message, {
      icon: <WarningOutlined className="text-orange-500 text-lg" />,
      ...options,
    });
  },

  /**
   * Base notification
   */
  message: (message: string, options?: ExternalToast) => {
    return sonnerToast(message, options);
  },

  /**
   * Load notifications
   */
  loading: (message: string, options?: ExternalToast) => {
    return sonnerToast.loading(message, {
      icon: <LoadingOutlined className="text-lg" spin />,
      ...options,
    });
  },

  /**
   * Promise notifications (state auto-updates when the async op completes)
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
   * Custom notification
   */
  custom: (
    jsx: (id: string | number) => React.ReactElement,
    options?: ExternalToast,
  ) => {
    return sonnerToast.custom(jsx, options);
  },

  /**
   * Close a specific notification
   */
  dismiss: (toastId?: string | number) => {
    return sonnerToast.dismiss(toastId);
  },

  /**
   * Close all notifications
   */
  dismissAll: () => {
    sonnerToast.dismiss();
  },
};

/**
 * Toast provider component
 * Must be used in the app root component
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
