/**
 * Modal 组件封装
 * 提供统一的弹窗样式和交互模式
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

// ==================== 基础 Modal ====================

export interface BaseModalProps extends Omit<ModalProps, 'footer'> {
  /** 提交按钮文字 */
  submitText?: string;
  /** 取消按钮文字 */
  cancelText?: string;
  /** 是否显示取消按钮 */
  showCancel?: boolean;
  /** 是否显示提交按钮 */
  showSubmit?: boolean;
  /** 提交按钮类型 */
  submitButtonType?: 'primary' | 'default' | 'dashed' | 'text' | 'link';
  /** 提交按钮是否危险 */
  submitDanger?: boolean;
  /** Loading state */
  loading?: boolean;
  /** 禁用状态 */
  disabled?: boolean;
  /** 提交回调 */
  onSubmit?: () => void;
  /** 取消回调 */
  onCancel?: () => void;
  /** 底部按钮对齐方式 */
  footerAlign?: 'left' | 'center' | 'right';
  /** 表单Error information，显示在表单下方 */
  error?: string | null;
  /** Error information关闭回调 */
  onClearError?: () => void;
}

/**
 * 基础 Modal 组件
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

// ==================== 表单 Modal ====================

export interface FormModalProps extends BaseModalProps {
  /** 表单内容 */
  children: React.ReactNode;
}

/**
 * 表单 Modal 组件
 * 用于包含表单的弹窗
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

// ==================== 确认对话框 ====================

export type ConfirmType = 'info' | 'success' | 'warning' | 'error' | 'confirm';

export interface ConfirmModalOptions {
  /** Title */
  title?: string;
  /** 内容 */
  content?: React.ReactNode;
  /** 确认按钮文字 */
  okText?: string;
  /** 取消按钮文字 */
  cancelText?: string;
  /** 类型 */
  type?: ConfirmType;
  /** 确认回调 */
  onOk?: () => void | Promise<void>;
  /** 取消回调 */
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
 * 显示确认对话框
 * 注意：建议使用 App.useApp() 获取 modal 实例后调用，以避免上下文警告
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
 * 显示删除确认对话框
 * 注意：建议使用 App.useApp() 获取 modal 实例后调用，以避免上下文警告
 */
export function showDeleteConfirm(options: Omit<ConfirmModalOptions, 'type'>, modal?: ReturnType<typeof App.useApp>['modal']) {
  return showConfirm({
    type: 'error',
    title: options.title || '确认删除',
    okText: options.okText || '删除',
    ...options,
  }, modal);
}

// ==================== Drawer 弹窗 ====================

export interface BaseDrawerProps extends Omit<DrawerProps, 'footer'> {
  /** 提交按钮文字 */
  submitText?: string;
  /** 取消按钮文字 */
  cancelText?: string;
  /** 是否显示取消按钮 */
  showCancel?: boolean;
  /** 是否显示提交按钮 */
  showSubmit?: boolean;
  /** Loading state */
  loading?: boolean;
  /** 禁用状态 */
  disabled?: boolean;
  /** 提交回调 */
  onSubmit?: () => void;
  /** 表单Error information，显示在表单下方 */
  error?: string | null;
  /** Error information关闭回调 */
  onClearError?: () => void;
}

/**
 * 基础 Drawer 组件
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

// ==================== 表单 Drawer ====================

export interface FormDrawerProps extends BaseDrawerProps {
  children: React.ReactNode;
}

/**
 * 表单 Drawer 组件
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

// ==================== 表单错误管理 Hook ====================

/**
 * 管理表单提交错误的 Hook
 * - 自动在 open 变化时清除错误
 * - 提供 setError / clearError / handleError 方法
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
