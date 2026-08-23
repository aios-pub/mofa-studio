/**
 * Scroll area component
 * Container with custom scrollbar styling
 */

import React, { forwardRef } from 'react';

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal' | 'both';
}

/**
 * Scroll area component
 * Provides nicely styled custom scrollbars
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
    // Set scroll class by direction
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
 * Horizontal scroll area
 */
export const ScrollAreaHorizontal = forwardRef<HTMLDivElement, Omit<ScrollAreaProps, 'orientation'>>(
  ({ className = '', ...props }, ref) => (
    <ScrollArea ref={ref} orientation="horizontal" className={className} {...props} />
  )
);

ScrollAreaHorizontal.displayName = 'ScrollAreaHorizontal';

export default ScrollArea;
