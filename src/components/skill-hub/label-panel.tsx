/**
 * Label Panel Component
 * Displays and manages labels for a skill
 */

import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface SkillLabel {
  id: string
  slug: string
  displayName: string
  type: string
  color?: string
}

interface LabelPanelProps {
  labels: SkillLabel[]
  onRemove?: (labelId: string) => void
  editable?: boolean
  className?: string
}

/**
 * Displays a list of labels with optional remove functionality
 */
export function LabelPanel({ labels, onRemove, editable = false, className }: LabelPanelProps) {
  if (labels.length === 0) {
    return (
      <Card className={cn("p-4 text-center text-muted-foreground text-sm", className)}>
        No labels assigned
      </Card>
    )
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {labels.map((label) => (
        <Badge
          key={label.id}
          variant="secondary"
          className={cn(
            "gap-1 px-3 py-1 text-sm font-medium",
            label.color && `border-${label.color}/20`
          )}
          style={label.color ? { backgroundColor: `${label.color}20`, borderColor: `${label.color}40` } : undefined}
        >
          <span className="truncate max-w-[100px]">{label.displayName}</span>
          {editable && onRemove && (
            <button
              onClick={() => onRemove(label.id)}
              className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
              type="button"
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Remove {label.displayName}</span>
            </button>
          )}
        </Badge>
      ))}
    </div>
  )
}

/**
 * Label selector for adding labels to a skill
 */
export interface LabelSelectorProps {
  availableLabels: SkillLabel[]
  selectedLabels: SkillLabel[]
  onToggle: (label: SkillLabel) => void
  className?: string
}

export function LabelSelector({ availableLabels, selectedLabels, onToggle, className }: LabelSelectorProps) {
  const isSelected = (label: SkillLabel) => selectedLabels.some(l => l.id === label.id)

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {availableLabels.map((label) => (
        <Badge
          key={label.id}
          variant={isSelected(label) ? "default" : "outline"}
          className={cn(
            "cursor-pointer hover:bg-primary/10 transition-colors",
            "px-3 py-1 text-sm font-medium"
          )}
          onClick={() => onToggle(label)}
        >
          {label.displayName}
        </Badge>
      ))}
    </div>
  )
}
