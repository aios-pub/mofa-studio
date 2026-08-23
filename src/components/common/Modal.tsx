/**
 * Modal component wrapper
 * Provides unified modal styling and interaction patterns
 */

import React from 'react';
import { Modal, Drawer, Button, Alert, App } from 'antd';
import type { ModalProps, DrawerProps } from 'antd';
import {
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

// ==================== Base modal ====================

export interface BaseModalProps extends Omit<ModalProps, 'footer'> {
  /** Submit button text */
  submitText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Whether to show the cancel button */
  showCancel?: boolean;
  /** Whether to show the submit button */
  showSubmit?: boolean;
  /** Submit button type */
  submitButtonType?: 'primary' | 'default' | 'dashed' | 'text' | 'link';
  /** Whether the submit button is dangerous */
  submitDanger?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Submit callback */
  onSubmit?: () => void;
  /** Cancel callback */
  onCancel?: () => void;
  /** Bottom button alignment */
  footerAlign?: 'left' | 'center' | 'right';
  /** Form error message, displayed below the form */
  error?: string | null;
  /** Error close callback */
  onClearError?: () => void;
}

/**
 * Base modal component
 */
export const BaseModal: React.FC<BaseModalProps> = ({
  submitText,
  cancelText,
  showCancel = true,
  showSubmit = true,
  submitButtonType = 'primary',
  submitDanger = false,
  loading = false,
  disabled = false,
  onSubmit,
  onCancel,
  footerAlign = 'right',
  error,
  onClearError,
  children,
  className = '',
  ...modalProps
}) => {
  const { t } = useTranslation();

  const footerAlignClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  }[footerAlign];

  const footer = (
    <div className={`flex items-center gap-3 ${footerAlignClass}`}>
      {showCancel && (
        <Button onClick={onCancel} disabled={loading}>
          {cancelText || t('common.cancel', '取消')}
        </Button>
      )}
      {showSubmit && (
        <Button
          type={submitButtonType}
          danger={submitDanger}
          loading={loading}
          disabled={disabled}
          onClick={onSubmit}
        >
          {submitText || t('common.confirm', '确定')}
        </Button>
      )}
    </div>
  );

  return (
    <Modal
      footer={footer}
      onCancel={onCancel}
      className={`base-modal ${className}`}
      {...modalProps}
    >
      {children}
      {error && (
        <Alert
          type="error"
          title={error}
          showIcon
          closable
          onClose={onClearError}
          className="mt-3"
        />
      )}
    </Modal>
  );
};

// ==================== Form modal ====================

export interface FormModalProps extends BaseModalProps {
  /** Form content */
  children: React.ReactNode;
}

/**
 * Form modal component
 * Modal that contains a form
 */
export const FormModal: React.FC<FormModalProps> = ({
  className = '',
  children,
  error,
  onClearError,
  ...props
}) => {
  return (
    <BaseModal
      className={`form-modal ${className}`}
      error={error}
      onClearError={onClearError}
      {...props}
    >
      <div className="py-2">
        {children}
      </div>
    </BaseModal>
  );
};

// ==================== Confirm dialog ====================

export type ConfirmType = 'info' | 'success' | 'warning' | 'error' | 'confirm';

export interface ConfirmModalOptions {
  /** Title */
  title?: string;
  /** Content */
  content?: React.ReactNode;
  /** Confirm button text */
  okText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Types */
  type?: ConfirmType;
  /** Confirm callback */
  onOk?: () => void | Promise<void>;
  /** Cancel callback */
  onCancel?: () => void;
}

const iconMap = {
  info: <InfoCircleOutlined className="text-[var(--color-info)] text-4xl" />,
  success: <CheckCircleOutlined className="text-[var(--color-success)] text-4xl" />,
  warning: <WarningOutlined className="text-[var(--color-warning)] text-4xl" />,
  error: <ExclamationCircleOutlined className="text-[var(--color-error)] text-4xl" />,
  confirm: <ExclamationCircleOutlined className="text-[var(--color-primary)] text-4xl" />,
};

/**
 * Show the confirmation dialog
 * Note: prefer getting the modal instance via App.useApp() to avoid context warnings
 */
export function showConfirm(options: ConfirmModalOptions, modal?: ReturnType<typeof App.useApp>['modal']) {
  const { type = 'confirm', title, content, okText, cancelText, onOk, onCancel } = options;

  const confirmMethod = modal ? modal.confirm : Modal.confirm;

  return confirmMethod({
    title,
    content: (
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 mt-1">{iconMap[type]}</div>
        <div className="flex-1">{content}</div>
      </div>
    ),
    okText,
    cancelText,
    onOk,
    onCancel,
    icon: null,
    centered: true,
  });
}

/**
 * Show the delete confirmation dialog
 * Note: prefer getting the modal instance via App.useApp() to avoid context warnings
 */
export function showDeleteConfirm(options: Omit<ConfirmModalOptions, 'type'>, modal?: ReturnType<typeof App.useApp>['modal']) {
  return showConfirm({
    type: 'error',
    title: options.title || '确认删除',
    okText: options.okText || '删除',
    ...options,
  }, modal);
}

// ==================== Drawer ====================

export interface BaseDrawerProps extends Omit<DrawerProps, 'footer'> {
  /** Submit button text */
  submitText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Whether to show the cancel button */
  showCancel?: boolean;
  /** Whether to show the submit button */
  showSubmit?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Submit callback */
  onSubmit?: () => void;
  /** Form error message, displayed below the form */
  error?: string | null;
  /** Error close callback */
  onClearError?: () => void;
}

/**
 * Base drawer component
 */
export const BaseDrawer: React.FC<BaseDrawerProps> = ({
  submitText,
  cancelText,
  showCancel = true,
  showSubmit = true,
  loading = false,
  disabled = false,
  onSubmit,
  onClose,
  error,
  onClearError,
  children,
  className = '',
  width = 480,
  ...drawerProps
}) => {
  const { t } = useTranslation();

  const footer = (
    <div className="flex items-center justify-end gap-3">
      {showCancel && (
        <Button onClick={onClose} disabled={loading}>
          {cancelText || t('common.cancel', '取消')}
        </Button>
      )}
      {showSubmit && (
        <Button
          type="primary"
          loading={loading}
          disabled={disabled}
          onClick={onSubmit}
        >
          {submitText || t('common.confirm', '确定')}
        </Button>
      )}
    </div>
  );

  return (
    <Drawer
      size={{ width }}
      onClose={onClose}
      footer={footer}
      className={`base-drawer ${className}`}
      {...drawerProps}
    >
      {children}
      {error && (
        <Alert
          type="error"
          title={error}
          showIcon
          closable
          onClose={onClearError}
          className="mt-3"
        />
      )}
    </Drawer>
  );
};

// ==================== Form drawer ====================

export interface FormDrawerProps extends BaseDrawerProps {
  children: React.ReactNode;
}

/**
 * Form drawer component
 */
export const FormDrawer: React.FC<FormDrawerProps> = ({
  className = '',
  children,
  error,
  onClearError,
  ...props
}) => {
  return (
    <BaseDrawer
      className={`form-drawer ${className}`}
      error={error}
      onClearError={onClearError}
      {...props}
    >
      <div className="space-y-4">
        {children}
      </div>
    </BaseDrawer>
  );
};

// ==================== Form error management hook ====================

/**
 * Hook for managing form submission errors
 * - Automatically clear errors when open changes
 * - Provides setError / clearError / handleError methods
 */
export function useFormError(open?: boolean) {
  const [error, setError] = React.useState<string | null>(null);
  const prevOpenRef = React.useRef(false);

  React.useEffect(() => {
    if (open && !prevOpenRef.current) {
      setError(null);
    }
    prevOpenRef.current = !!open;
  }, [open]);

  const clearError = React.useCallback(() => setError(null), []);

  const handleError = React.useCallback((err: unknown) => {
    const msg =
      err instanceof Error
        ? err.message
        : typeof err === 'string'
          ? err
          : '操作失败，请重试';
    setError(msg);
  }, []);

  return { error, setError, clearError, handleError };
}

export default BaseModal;
