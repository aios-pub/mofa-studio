/**
 * Version Status Badge Component
 * Displays the status of a skill version with appropriate styling
 */

import { Badge } from '@/components/ui/badge'
import { Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type VersionStatus = 'DRAFT' | 'PUBLISHED' | 'YANKED' | 'ARCHIVED'

interface VersionStatusBadgeProps {
  status: VersionStatus
  className?: string
}

const statusConfig: Record<VersionStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  DRAFT: {
    label: 'Draft',
    variant: 'secondary',
    className: 'bg-muted/50'
  },
  PUBLISHED: {
    label: 'Published',
    variant: 'default',
    className: 'bg-green-500/10 text-green-600 border-green-500/20'
  },
  YANKED: {
    label: 'Yanked',
    variant: 'destructive',
    className: 'bg-red-500/10 text-red-600 border-red-500/20'
  },
  ARCHIVED: {
    label: 'Archived',
    variant: 'outline',
    className: 'bg-gray-500/10 text-gray-600 border-gray-500/20'
  }
}

/**
 * Displays the status of a skill version with appropriate color and styling
 */
export function VersionStatusBadge({ status, className }: VersionStatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <Badge
      variant={config.variant}
      className={cn(
        "font-medium",
        config.className,
        className
      )}
    >
      <Circle className="w-1.5 h-1.5 mr-1.5 fill-current" />
      {config.label}
    </Badge>
  )
}
