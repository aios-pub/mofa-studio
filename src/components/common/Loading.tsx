/**
 * Loading state component
 * Provides multiple loading indicator styles
 */

import { LoadingOutlined } from "@ant-design/icons";
import { cn } from "../../utils";

type LoadingSize = "small" | "default" | "large";

interface LoadingProps {
  /** Loading hint text */
  tip?: string;
  /** Loader size */
  size?: LoadingSize;
  /** Whether fullscreen */
  fullscreen?: boolean;
  /** Whether to render in simple mode (icon only) */
  simple?: boolean;
  /** Custom class name */
  className?: string;
  /** Whether currently loading */
  loading?: boolean;
  /** Children (wrapper mode) */
  children?: React.ReactNode;
}

const sizeMap: Record<LoadingSize, string> = {
  small: "text-lg",
  default: "text-2xl",
  large: "text-4xl",
};

/**
 * Base loading indicator
 */
export function LoadingSpinner({
  size = "default",
  className,
}: {
  size?: LoadingSize;
  className?: string;
}) {
  return (
    <LoadingOutlined
      className={cn(sizeMap[size], "text-[var(--color-primary)]", className)}
      spin
    />
  );
}

/**
 * Loading state component
 */
export default function Loading({
  tip = "加载中...",
  size = "default",
  fullscreen = false,
  simple = false,
  className,
  loading = true,
  children,
}: LoadingProps) {
  if (!loading && children) {
    return <>{children}</>;
  }

  const content = (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        fullscreen &&
          "fixed inset-0 z-50 bg-[var(--color-bg-base)]/80 backdrop-blur-sm",
        className,
      )}
    >
      <LoadingSpinner size={size} />
      {!simple && (
        <span className="text-sm text-[var(--color-text-secondary)]">
          {tip}
        </span>
      )}
    </div>
  );

  if (children) {
    return (
      <div className="relative">
        {children}
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--color-bg-base)]/60 backdrop-blur-[2px]">
            {content}
          </div>
        )}
      </div>
    );
  }

  return content;
}

/**
 * Page loading indicator
 */
export function PageLoading({ tip = "页面加载中..." }: { tip?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <LoadingSpinner size="large" />
      <span className="text-[var(--color-text-secondary)]">{tip}</span>
    </div>
  );
}

/**
 * Inline loading indicator
 */
export function InlineLoading({
  tip,
  className,
}: {
  tip?: string;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <LoadingSpinner size="small" />
      {tip && (
        <span className="text-sm text-[var(--color-text-tertiary)]">{tip}</span>
      )}
    </div>
  );
}

/**
 * Button loading state
 */
export function ButtonLoading({ className }: { className?: string }) {
  return <LoadingOutlined className={cn("text-current", className)} spin />;
}

/**
 * Skeleton component
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-(--color-bg-tertiary)",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Skeleton - text lines
 */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", i === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton - avatar
 */
export function SkeletonAvatar({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Skeleton
      className={cn("rounded-full", className)}
      style={{ width: size, height: size }}
    />
  );
}

/**
 * Skeleton - card
 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("p-4 space-y-3", className)}>
      <div className="flex items-center gap-3">
        <SkeletonAvatar size={40} />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}
