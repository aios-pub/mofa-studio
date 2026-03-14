/**
 * 结果页面组件
 * 用于展示操作结果、错误页面等
 */

import React from 'react';
import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';

// ==================== 基础结果页面 ====================

export interface ResultPageProps {
  /** 状态类型 */
  status?: 'success' | 'error' | 'warning' | 'info' | '404' | '403' | '500';
  /** 标题 */
  title?: string;
  /** 副标题 */
  subTitle?: string;
  /** 额外内容 */
  extra?: React.ReactNode;
  /** 图标 */
  icon?: React.ReactNode;
  /** 类名 */
  className?: string;
}

const statusConfig = {
  success: {
    icon: <CheckCircleOutlined className="text-[var(--color-success)] text-6xl" />,
    title: '操作成功',
  },
  error: {
    icon: <CloseCircleOutlined className="text-[var(--color-error)] text-6xl" />,
    title: '操作失败',
  },
  warning: {
    icon: <WarningOutlined className="text-[var(--color-warning)] text-6xl" />,
    title: '警告',
  },
  info: {
    icon: <InfoCircleOutlined className="text-[var(--color-info)] text-6xl" />,
    title: '提示',
  },
  '404': {
    icon: null,
    title: '404',
    subTitle: '抱歉，您访问的页面不存在',
  },
  '403': {
    icon: null,
    title: '403',
    subTitle: '抱歉，您没有权限访问此页面',
  },
  '500': {
    icon: null,
    title: '500',
    subTitle: '抱歉，服务器出错了',
  },
};

/**
 * 结果页面组件
 */
export const ResultPage: React.FC<ResultPageProps> = ({
  status = 'info',
  title,
  subTitle,
  extra,
  icon,
  className = '',
}) => {
  const config = statusConfig[status];

  return (
    <div className={`flex items-center justify-center min-h-[400px] ${className}`}>
      <Result
        status={status === '404' || status === '403' || status === '500' ? status : undefined}
        icon={icon || (['404', '403', '500'].includes(status) ? undefined : config.icon)}
        title={title || config.title}
        subTitle={subTitle || (config as any).subTitle}
        extra={extra}
      />
    </div>
  );
};

// ==================== 成功页面 ====================

export interface SuccessPageProps {
  /** 标题 */
  title?: string;
  /** 描述 */
  description?: string;
  /** 返回按钮文字 */
  backText?: string;
  /** 返回路径 */
  backPath?: string;
  /** 继续操作按钮文字 */
  continueText?: string;
  /** 继续操作回调 */
  onContinue?: () => void;
  /** 额外内容 */
  extra?: React.ReactNode;
  /** 类名 */
  className?: string;
}

/**
 * 成功页面
 */
export const SuccessPage: React.FC<SuccessPageProps> = ({
  title = '操作成功',
  description,
  backText = '返回列表',
  backPath,
  continueText,
  onContinue,
  extra,
  className = '',
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backPath) {
      navigate(backPath);
    } else {
      navigate(-1);
    }
  };

  const extraContent = (
    <div className="flex items-center justify-center gap-3">
      <Button onClick={handleBack}>{backText}</Button>
      {continueText && onContinue && (
        <Button type="primary" onClick={onContinue}>
          {continueText}
        </Button>
      )}
      {extra}
    </div>
  );

  return (
    <ResultPage
      status="success"
      title={title}
      subTitle={description}
      extra={extraContent}
      className={className}
    />
  );
};

// ==================== 错误页面 ====================

export interface ErrorPageProps {
  /** 标题 */
  title?: string;
  /** 描述 */
  description?: string;
  /** 重试按钮文字 */
  retryText?: string;
  /** 重试回调 */
  onRetry?: () => void;
  /** 返回按钮文字 */
  backText?: string;
  /** 返回路径 */
  backPath?: string;
  /** 额外内容 */
  extra?: React.ReactNode;
  /** 类名 */
  className?: string;
}

/**
 * 错误页面
 */
export const ErrorPage: React.FC<ErrorPageProps> = ({
  title = '操作失败',
  description,
  retryText = '重试',
  onRetry,
  backText = '返回',
  backPath,
  extra,
  className = '',
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backPath) {
      navigate(backPath);
    } else {
      navigate(-1);
    }
  };

  const extraContent = (
    <div className="flex items-center justify-center gap-3">
      <Button onClick={handleBack}>{backText}</Button>
      {onRetry && (
        <Button type="primary" onClick={onRetry}>
          {retryText}
        </Button>
      )}
      {extra}
    </div>
  );

  return (
    <ResultPage
      status="error"
      title={title}
      subTitle={description}
      extra={extraContent}
      className={className}
    />
  );
};

// ==================== 404 页面 ====================

export interface NotFoundPageProps {
  /** 返回首页按钮文字 */
  homeText?: string;
  /** 返回上一页按钮文字 */
  backText?: string;
  /** 额外内容 */
  extra?: React.ReactNode;
  /** 类名 */
  className?: string;
}

/**
 * 404 页面
 */
export const NotFoundPage: React.FC<NotFoundPageProps> = ({
  homeText = '返回首页',
  backText = '返回上一页',
  extra,
  className = '',
}) => {
  const navigate = useNavigate();

  const extraContent = (
    <div className="flex items-center justify-center gap-3">
      <Button onClick={() => navigate(-1)}>{backText}</Button>
      <Button type="primary" onClick={() => navigate('/')}>
        {homeText}
      </Button>
      {extra}
    </div>
  );

  return (
    <ResultPage status="404" extra={extraContent} className={className} />
  );
};

// ==================== 403 页面 ====================

export interface ForbiddenPageProps {
  /** 返回首页按钮文字 */
  homeText?: string;
  /** 额外内容 */
  extra?: React.ReactNode;
  /** 类名 */
  className?: string;
}

/**
 * 403 页面
 */
export const ForbiddenPage: React.FC<ForbiddenPageProps> = ({
  homeText = '返回首页',
  extra,
  className = '',
}) => {
  const navigate = useNavigate();

  const extraContent = (
    <div className="flex items-center justify-center gap-3">
      <Button type="primary" onClick={() => navigate('/')}>
        {homeText}
      </Button>
      {extra}
    </div>
  );

  return (
    <ResultPage status="403" extra={extraContent} className={className} />
  );
};

// ==================== 500 页面 ====================

export interface ServerErrorPageProps {
  /** 刷新按钮文字 */
  refreshText?: string;
  /** 返回首页按钮文字 */
  homeText?: string;
  /** 额外内容 */
  extra?: React.ReactNode;
  /** 类名 */
  className?: string;
}

/**
 * 500 页面
 */
export const ServerErrorPage: React.FC<ServerErrorPageProps> = ({
  refreshText = '刷新页面',
  homeText = '返回首页',
  extra,
  className = '',
}) => {
  const navigate = useNavigate();

  const extraContent = (
    <div className="flex items-center justify-center gap-3">
      <Button onClick={() => window.location.reload()}>{refreshText}</Button>
      <Button type="primary" onClick={() => navigate('/')}>
        {homeText}
      </Button>
      {extra}
    </div>
  );

  return (
    <ResultPage status="500" extra={extraContent} className={className} />
  );
};

export default ResultPage;
