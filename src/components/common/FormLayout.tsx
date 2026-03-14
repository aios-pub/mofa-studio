/**
 * 表单布局组件
 * 提供统一的表单布局样式
 */

import React, { forwardRef, createContext, useContext } from 'react';
import { Form, Row, Col, Button, Divider } from 'antd';
import type { FormProps, FormInstance, ColProps } from 'antd';
import { useTranslation } from 'react-i18next';

// 表单布局上下文
interface FormLayoutContextType {
  layout: 'horizontal' | 'vertical' | 'inline';
  size: 'small' | 'middle' | 'large';
}

const FormLayoutContext = createContext<FormLayoutContextType>({
  layout: 'vertical',
  size: 'middle',
});

export const useFormLayout = () => useContext(FormLayoutContext);

// 表单区域组件
export interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  className = '',
}) => {
  return (
    <div className={`form-section mb-6 ${className}`}>
      {title && (
        <div className="mb-4">
          <h4 className="text-base font-medium text-[var(--color-text-primary)] mb-1">
            {title}
          </h4>
          {description && (
            <p className="text-sm text-[var(--color-text-secondary)]">
              {description}
            </p>
          )}
        </div>
      )}
      <div className="form-section-content">
        {children}
      </div>
    </div>
  );
};

// 表单行组件
export interface FormRowProps {
  children: React.ReactNode;
  gutter?: number | [number, number];
  className?: string;
}

export const FormRow: React.FC<FormRowProps> = ({
  children,
  gutter = 24,
  className = '',
}) => {
  return (
    <Row gutter={gutter} className={className}>
      {children}
    </Row>
  );
};

// 表单列组件
export interface FormColProps {
  children: React.ReactNode;
  span?: number;
  offset?: number;
  className?: string;
}

export const FormCol: React.FC<FormColProps> = ({
  children,
  span = 24,
  offset = 0,
  className = '',
}) => {
  return (
    <Col span={span} offset={offset} className={className}>
      {children}
    </Col>
  );
};

// 表单操作区域
export interface FormActionsProps {
  children?: React.ReactNode;
  submitText?: string;
  cancelText?: string;
  resetText?: string;
  showReset?: boolean;
  showCancel?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onSubmit?: () => void;
  onCancel?: () => void;
  onReset?: () => void;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export const FormActions: React.FC<FormActionsProps> = ({
  children,
  submitText,
  cancelText,
  resetText,
  showReset = false,
  showCancel = false,
  loading = false,
  disabled = false,
  onSubmit,
  onCancel,
  onReset,
  align = 'right',
  className = '',
}) => {
  const { t } = useTranslation();

  const alignClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  }[align];

  return (
    <div className={`flex items-center gap-3 pt-4 ${alignClass} ${className}`}>
      {children}

      {showCancel && (
        <Button onClick={onCancel} disabled={loading || disabled}>
          {cancelText || t('common.cancel', '取消')}
        </Button>
      )}

      {showReset && (
        <Button onClick={onReset} disabled={loading || disabled}>
          {resetText || t('common.reset', '重置')}
        </Button>
      )}

      {onSubmit && (
        <Button
          type="primary"
          onClick={onSubmit}
          loading={loading}
          disabled={disabled}
        >
          {submitText || t('common.submit', '提交')}
        </Button>
      )}
    </div>
  );
};

// 表单分隔线
export const FormDivider: React.FC<{ className?: string }> = ({ className = '' }) => (
  <Divider className={`my-4 ${className}`} />
);

// 表单布局组件属性
export interface FormLayoutProps extends Omit<FormProps, 'layout'> {
  layout?: 'horizontal' | 'vertical' | 'inline';
  labelCol?: ColProps;
  wrapperCol?: ColProps;
  size?: 'small' | 'middle' | 'large';
  children: React.ReactNode;
}

/**
 * 表单布局组件
 */
export const FormLayout = forwardRef<FormInstance, FormLayoutProps>(
  (
    {
      layout = 'vertical',
      labelCol,
      wrapperCol,
      size = 'middle',
      children,
      className = '',
      ...formProps
    },
    ref
  ) => {
    const contextValue: FormLayoutContextType = {
      layout,
      size,
    };

    // 根据布局计算列配置
    const colConfig = layout === 'horizontal'
      ? { labelCol: labelCol || { span: 6 }, wrapperCol: wrapperCol || { span: 18 } }
      : {};

    return (
      <FormLayoutContext.Provider value={contextValue}>
        <Form
          ref={ref}
          layout={layout}
          size={size}
          className={`form-layout ${className}`}
          {...colConfig}
          {...formProps}
        >
          {children}
        </Form>
      </FormLayoutContext.Provider>
    );
  }
);

FormLayout.displayName = 'FormLayout';

export default FormLayout;
