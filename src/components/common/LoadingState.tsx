/**
 * Loading state component
 * Loading display for pages, cards, etc.
 */

import React from "react";
import { Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";

export type LoadingSize = "small" | "default" | "large";

export interface LoadingStateProps {
  size?: LoadingSize;
  tip?: string;
  fullscreen?: boolean;
  className?: string;
}

const sizeMap: Record<LoadingSize, number> = {
  small: 20,
  default: 32,
  large: 48,
};

export const LoadingState: React.FC<LoadingStateProps> = ({
  size = "default",
  tip,
  fullscreen = false,
  className = "",
}) => {
  const content = (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
    >
      <Spin
        indicator={<LoadingOutlined style={{ fontSize: sizeMap[size] }} spin />}
        size={size}
      />
      {tip && (
        <span className="text-sm text-[var(--color-text-secondary)]">
          {tip}
        </span>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg-base)]/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
};

// Skeleton component
export interface SkeletonProps {
  rows?: number;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  rows = 3,
  className = "",
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`
            h-4 rounded skeleton
            ${i === 0 ? "w-3/4" : i === rows - 1 ? "w-1/2" : "w-full"}
          `}
        />
      ))}
    </div>
  );
};

// Card skeleton
export const CardSkeleton: React.FC<{ className?: string }> = ({
  className = "",
}) => (
  <div
    className={`bg-[var(--color-bg-paper)] rounded-lg border border-(--color-border) p-4 ${className}`}
  >
    <div className="h-4 w-1/3 rounded skeleton mb-4" />
    <Skeleton rows={3} />
  </div>
);

// Table skeleton
export const TableSkeleton: React.FC<{ rows?: number; className?: string }> = ({
  rows = 5,
  className = "",
}) => (
  <div className={`space-y-2 ${className}`}>
    {/* Header */}
    <div className="flex gap-4 p-3 bg-[var(--color-bg-secondary)] rounded">
      <div className="h-4 w-1/4 rounded skeleton" />
      <div className="h-4 w-1/4 rounded skeleton" />
      <div className="h-4 w-1/4 rounded skeleton" />
      <div className="h-4 w-1/4 rounded skeleton" />
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4 p-3 border-b border-(--color-border)">
        <div className="h-4 w-1/4 rounded skeleton" />
        <div className="h-4 w-1/4 rounded skeleton" />
        <div className="h-4 w-1/4 rounded skeleton" />
        <div className="h-4 w-1/4 rounded skeleton" />
      </div>
    ))}
  </div>
);

export default LoadingState;
