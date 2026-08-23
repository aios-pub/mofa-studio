/**
 * Result page component
 * For displaying results, error pages, etc.
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

// ==================== Base result page ====================

export interface ResultPageProps {
  /** Status types */
  status?: 'success' | 'error' | 'warning' | 'info' | '404' | '403' | '500';
  /** Title */
  title?: string;
  /** Subtitle */
  subTitle?: string;
  /** Extra content */
  extra?: React.ReactNode;
  /** Icon */
  icon?: React.ReactNode;
  /** Class name */
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
 * Result page component
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

// ==================== Success page ====================

export interface SuccessPageProps {
  /** Title */
  title?: string;
  /** Description */
  description?: string;
  /** Return button text */
  backText?: string;
  /** Return path */
  backPath?: string;
  /** Continue button text */
  continueText?: string;
  /** Continue callback */
  onContinue?: () => void;
  /** Extra content */
  extra?: React.ReactNode;
  /** Class name */
  className?: string;
}

/**
 * Success page
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

// ==================== Error page ====================

export interface ErrorPageProps {
  /** Title */
  title?: string;
  /** Description */
  description?: string;
  /** Retry button text */
  retryText?: string;
  /** Retry callback */
  onRetry?: () => void;
  /** Return button text */
  backText?: string;
  /** Return path */
  backPath?: string;
  /** Extra content */
  extra?: React.ReactNode;
  /** Class name */
  className?: string;
}

/**
 * Error page
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

// ==================== 404 page ====================

export interface NotFoundPageProps {
  /** Back home button text */
  homeText?: string;
  /** Back button text */
  backText?: string;
  /** Extra content */
  extra?: React.ReactNode;
  /** Class name */
  className?: string;
}

/**
 * 404 page
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

// ==================== 403 page ====================

export interface ForbiddenPageProps {
  /** Back home button text */
  homeText?: string;
  /** Extra content */
  extra?: React.ReactNode;
  /** Class name */
  className?: string;
}

/**
 * 403 page
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

// ==================== 500 page ====================

export interface ServerErrorPageProps {
  /** Refresh button text */
  refreshText?: string;
  /** Back home button text */
  homeText?: string;
  /** Extra content */
  extra?: React.ReactNode;
  /** Class name */
  className?: string;
}

/**
 * 500 page
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
