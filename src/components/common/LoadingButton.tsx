/**
 * Loading state button
 * Auto-handle loading state and disable clicks
 */

import { Button } from 'antd';
import type { ButtonProps } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { cn } from '../../utils';

export interface LoadingButtonProps extends ButtonProps {
  /** Whether currently loading */
  loading?: boolean;
  /** Text shown while loading */
  loadingText?: string;
  /** Loading icon position */
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
 * Button group - for displaying multiple buttons side by side
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
 * Confirm/cancel button group
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
