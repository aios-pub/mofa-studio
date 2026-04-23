/**
 * 卡片组件
 * 提供一致的卡片样式，支持多种变体
 */

import React from "react";
import { Card as AntCard } from "antd";

export type CardVariant = "default" | "variant" | "elevated" | "ghost";

export interface CardProps extends Omit<
  React.ComponentProps<typeof AntCard>,
  "variant" | "variant"
> {
  variant?: CardVariant;
  hoverable?: boolean;
}

const variantStyles: Record<CardVariant, string> = {
  default:
    "bg-[var(--color-bg-paper)] border border-(--color-border) shadow-[var(--shadow-xs)]",
  variant: "bg-[var(--color-bg-paper)] border border-(--color-border)",
  elevated: "bg-[var(--color-bg-paper)] shadow-[var(--shadow-md)]",
  ghost: "bg-transparent",
};

export const Card: React.FC<CardProps> = ({
  variant = "default",
  hoverable = false,
  className = "",
  children,
  ...props
}) => {
  const hoverStyles = hoverable
    ? "transition-all duration-200 cursor-pointer hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5"
    : "";

  return (
    <AntCard
      className={`
        rounded-lg
        ${variantStyles[variant]}
        ${hoverStyles}
        ${className}
      `.trim()}
      variant="borderless"
      {...props}
    >
      {children}
    </AntCard>
  );
};

// 子组件
export const CardHeader: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className = "", children }) => (
  <div className={`px-4 py-3 border-b border-(--color-border) ${className}`}>
    {children}
  </div>
);

export const CardTitle: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className = "", children }) => (
  <h3
    className={`text-base font-semibold text-[var(--color-text-primary)] ${className}`}
  >
    {children}
  </h3>
);

export const CardDescription: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className = "", children }) => (
  <p className={`text-sm text-[var(--color-text-secondary)] mt-1 ${className}`}>
    {children}
  </p>
);

export const CardContent: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className = "", children }) => (
  <div className={`p-4 ${className}`}>{children}</div>
);

export const CardFooter: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className = "", children }) => (
  <div className={`px-4 py-3 border-t border-(--color-border) ${className}`}>
    {children}
  </div>
);

export default Card;
