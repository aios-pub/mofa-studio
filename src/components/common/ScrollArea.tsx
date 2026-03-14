/**
 * 滚动区域组件
 * 提供自定义滚动条样式的容器
 */

import React, { forwardRef } from 'react';

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal' | 'both';
}

/**
 * 滚动区域组件
 * 提供美观的自定义滚动条
 */
export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  (
    {
      className = '',
      orientation = 'vertical',
      children,
      style,
      ...props
    },
    ref
  ) => {
    // 根据方向设置滚动类
    const overflowClass = {
      vertical: 'overflow-y-auto overflow-x-hidden',
      horizontal: 'overflow-x-auto overflow-y-hidden',
      both: 'overflow-auto',
    }[orientation];

    return (
      <div
        ref={ref}
        className={`
          relative
          ${overflowClass}
          scrollbar-thin
          scrollbar-track-transparent
          scrollbar-thumb-[var(--color-border)]
          hover:scrollbar-thumb-[var(--color-border-hover)]
          dark:scrollbar-thumb-white/20
          dark:hover:scrollbar-thumb-white/30
          ${className}
        `.trim()}
        style={style}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ScrollArea.displayName = 'ScrollArea';

/**
 * 横向滚动区域
 */
export const ScrollAreaHorizontal = forwardRef<HTMLDivElement, Omit<ScrollAreaProps, 'orientation'>>(
  ({ className = '', ...props }, ref) => (
    <ScrollArea ref={ref} orientation="horizontal" className={className} {...props} />
  )
);

ScrollAreaHorizontal.displayName = 'ScrollAreaHorizontal';

export default ScrollArea;
