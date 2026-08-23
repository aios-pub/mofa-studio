/**
 * 表单字段组件
 * 提供统一的表单项样式和验证提示
 */

import React, { forwardRef } from 'react';
import { Form, Input, Select, InputNumber, Switch, DatePicker, TimePicker, Radio, Checkbox, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Password } = Input;
const { RangePicker } = DatePicker;

// 基础表单字段属性
export interface FormFieldBaseProps {
  /** 字段名 */
  name: string;
  /** Label */
  label?: React.ReactNode;
  /** 是否必填 */
  required?: boolean;
  /** 帮助提示 */
  tooltip?: string | React.ReactNode;
  /** 额外说明 */
  extra?: React.ReactNode;
  /** 占位符 */
  placeholder?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 类名 */
  className?: string;
}

// 输入框字段
export interface InputFieldProps extends FormFieldBaseProps {
  type?: 'text' | 'password' | 'textarea';
  rows?: number;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

// 选择框字段
export interface SelectFieldProps extends FormFieldBaseProps {
  options: Array<{ label: string; value: any; disabled?: boolean }>;
  value?: any;
  onChange?: (value: any) => void;
  mode?: 'multiple' | 'tags';
  showSearch?: boolean;
}

// Number input字段
export interface NumberFieldProps extends FormFieldBaseProps {
  value?: number;
  onChange?: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
}

// 开关字段
export interface SwitchFieldProps extends FormFieldBaseProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}

// 日期选择字段
export interface DateFieldProps extends FormFieldBaseProps {
  type?: 'date' | 'range' | 'time';
  value?: any;
  onChange?: (value: any) => void;
}

// 单选字段
export interface RadioFieldProps extends FormFieldBaseProps {
  options: Array<{ label: string; value: any; disabled?: boolean }>;
  value?: any;
  onChange?: (e: any) => void;
}

// 复选框字段
export interface CheckboxFieldProps extends FormFieldBaseProps {
  options: Array<{ label: string; value: any; disabled?: boolean }>;
  value?: any[];
  onChange?: (checkedValue: any[]) => void;
}

// 统一表单字段属性
export type FormFieldProps =
  | ({ fieldType: 'input' } & InputFieldProps)
  | ({ fieldType: 'select' } & SelectFieldProps)
  | ({ fieldType: 'number' } & NumberFieldProps)
  | ({ fieldType: 'switch' } & SwitchFieldProps)
  | ({ fieldType: 'date' } & DateFieldProps)
  | ({ fieldType: 'radio' } & RadioFieldProps)
  | ({ fieldType: 'checkbox' } & CheckboxFieldProps);

/**
 * 通用表单字段组件
 */
export const FormField = forwardRef<any, FormFieldProps>(
  ({ fieldType, name, label, required, tooltip, extra, className, ...restProps }, ref) => {
    // 渲染表单控件
    const renderControl = () => {
      switch (fieldType) {
        case 'input': {
          const { type = 'text', rows = 4, ...inputProps } = restProps as InputFieldProps;
          if (type === 'password') {
            return <Password ref={ref} {...inputProps} />;
          }
          if (type === 'textarea') {
            return <TextArea ref={ref} rows={rows} {...inputProps} />;
          }
          return <Input ref={ref} {...inputProps} />;
        }

        case 'select': {
          const { options, ...selectProps } = restProps as SelectFieldProps;
          return <Select ref={ref} options={options} {...selectProps} />;
        }

        case 'number': {
          return <InputNumber ref={ref} {...(restProps as NumberFieldProps)} />;
        }

        case 'switch': {
          return <Switch ref={ref} {...(restProps as SwitchFieldProps)} />;
        }

        case 'date': {
          const { type = 'date', placeholder, ...dateProps } = restProps as DateFieldProps;
          if (type === 'range') {
            return <RangePicker {...dateProps} />;
          }
          if (type === 'time') {
            return <TimePicker placeholder={placeholder} {...dateProps} />;
          }
          return <DatePicker placeholder={placeholder} {...dateProps} />;
        }

        case 'radio': {
          const { options, ...radioProps } = restProps as RadioFieldProps;
          return (
            <Radio.Group {...radioProps}>
              {options.map((opt) => (
                <Radio key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </Radio>
              ))}
            </Radio.Group>
          );
        }

        case 'checkbox': {
          const { options, ...checkboxProps } = restProps as CheckboxFieldProps;
          return <Checkbox.Group options={options} {...checkboxProps} />;
        }

        default:
          return null;
      }
    };

    // Label渲染（包含 tooltip）
    const labelNode = tooltip ? (
      <span className="flex items-center gap-1">
        {label}
        <Tooltip title={tooltip}>
          <QuestionCircleOutlined className="text-[var(--color-text-tertiary)] text-sm cursor-help" />
        </Tooltip>
      </span>
    ) : (
      label
    );

    return (
      <Form.Item
        name={name}
        label={labelNode}
        required={required}
        extra={extra}
        className={className}
        rules={required ? [{ required: true, message: `请输入${typeof label === 'string' ? label : ''}` }] : undefined}
      >
        {renderControl()}
      </Form.Item>
    );
  }
);

FormField.displayName = 'FormField';

// 便捷组件导出
export const InputField = (props: Omit<InputFieldProps, 'fieldType'>) => (
  <FormField fieldType="input" {...props} />
);

export const SelectField = (props: Omit<SelectFieldProps, 'fieldType'>) => (
  <FormField fieldType="select" {...props} />
);

export const NumberField = (props: Omit<NumberFieldProps, 'fieldType'>) => (
  <FormField fieldType="number" {...props} />
);

export const SwitchField = (props: Omit<SwitchFieldProps, 'fieldType'>) => (
  <FormField fieldType="switch" {...props} />
);

export const DateField = (props: Omit<DateFieldProps, 'fieldType'>) => (
  <FormField fieldType="date" {...props} />
);

export const RadioField = (props: Omit<RadioFieldProps, 'fieldType'>) => (
  <FormField fieldType="radio" {...props} />
);

export const CheckboxField = (props: Omit<CheckboxFieldProps, 'fieldType'>) => (
  <FormField fieldType="checkbox" {...props} />
);

export default FormField;
