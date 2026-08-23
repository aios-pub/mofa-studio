/**
 * LoadingButton Loading state按钮
 * 自动处理Loading state，禁用点击
 */

import { Button } from 'antd';
import type { ButtonProps } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { cn } from '../../utils';

export interface LoadingButtonProps extends ButtonProps {
  /** 是否正在加载 */
  loading?: boolean;
  /** 加载时显示的文字 */
  loadingText?: string;
  /** 加载图标位置 */
  loadingIconPosition?: 'start' | 'end';
}

export default function LoadingButton({
  loading = false,
  loadingText,
  loadingIconPosition = 'start',
  children,
  className,
  disabled,
  icon,
  ...props
}: LoadingButtonProps) {
  const loadingIcon = <LoadingOutlined className={cn(loadingIconPosition === 'end' ? 'order-2' : 'order-1')} spin />;

  return (
    <Button
      {...props}
      className={cn(className)}
      disabled={disabled || loading}
      icon={loading ? loadingIcon : icon}
    >
      {loading && loadingText ? (
        <span className={cn(loadingIconPosition === 'end' ? 'order-1' : 'order-2')}>
          {loadingText}
        </span>
      ) : (
        children
      )}
    </Button>
  );
}

/**
 * 按钮组 - 用于并排显示多个按钮
 */
export function ButtonGroup({
  children,
  className,
  align = 'end',
  gap = 8,
}: {
  children: React.ReactNode;
  className?: string;
  align?: 'start' | 'center' | 'end' | 'between';
  gap?: number;
}) {
  const justifyClass = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  }[align];

  return (
    <div className={cn('flex items-center', justifyClass, className)} style={{ gap }}>
      {children}
    </div>
  );
}

/**
 * 确认取消按钮组
 */
export function ConfirmButtons({
  confirmText = '确认',
  cancelText = '取消',
  confirmProps,
  cancelProps,
  loading = false,
  onConfirm,
  onCancel,
  align = 'end',
  className,
}: {
  confirmText?: string;
  cancelText?: string;
  confirmProps?: ButtonProps;
  cancelProps?: ButtonProps;
  loading?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  align?: 'start' | 'center' | 'end' | 'between';
  className?: string;
}) {
  return (
    <ButtonGroup align={align} className={className}>
      <Button {...cancelProps} onClick={onCancel}>
        {cancelText}
      </Button>
      <Button
        type="primary"
        {...confirmProps}
        loading={loading}
        onClick={onConfirm}
      >
        {confirmText}
      </Button>
    </ButtonGroup>
  );
}
