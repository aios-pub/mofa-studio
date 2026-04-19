/**
 * Skill Card Component
 * Reusable card for displaying one skill in lists
 */

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bookmark, Download, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SkillSummary {
  id: string
  displayName: string
  namespace: string
  slug: string
  summary?: string
  downloadCount: number
  starCount: number
  ratingAvg?: number
  ratingCount?: number
  latestVersion?: string
  visibility?: 'PUBLIC' | 'PRIVATE' | 'NAMESPACE_ONLY'
  status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED'
}

interface SkillCardProps {
  skill: SkillSummary
  onClick?: () => void
  highlightStarred?: boolean
  isStarred?: boolean
  className?: string
}

/**
 * Formats large numbers into compact format (e.g., 1.2k, 3.4M)
 */
function formatCompactCount(count: number): string {
  if (count < 1000) return count.toString()
  if (count < 1000000) return `${(count / 1000).toFixed(1)}k`
  if (count < 1000000000) return `${(count / 1000000).toFixed(1)}M`
  return `${(count / 1000000000).toFixed(1)}B`
}

/**
 * Reusable card for displaying one skill in lists such as landing, namespace, search, and stars.
 */
export function SkillCard({ skill, onClick, highlightStarred = true, isStarred = false, className }: SkillCardProps) {
  const showStarredHighlight = highlightStarred && isStarred
  const isInteractive = typeof onClick === 'function'

  return (
    <Card
      className={cn(
        "h-full p-5 cursor-pointer group relative overflow-hidden bg-background border shadow-sm transition-all hover:shadow-md hover:border-primary/50",
        className
      )}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!isInteractive) {
          return
        }

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      }}
      role={isInteractive ? 'link' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between mb-3">
          <div className="space-y-1 flex-1 min-w-0">
            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors truncate">
              {skill.displayName}
            </h3>
            <p className="text-xs text-muted-foreground font-mono truncate">
              @{skill.namespace}/{skill.slug}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-2">
            {skill.visibility === 'PRIVATE' && (
              <Badge variant="secondary" className="text-xs">Private</Badge>
            )}
            {skill.status === 'DRAFT' && (
              <Badge variant="outline" className="text-xs">Draft</Badge>
            )}
          </div>
        </div>

        {skill.summary && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
            {skill.summary}
          </p>
        )}

        <div className="mt-auto flex items-center gap-4 text-xs text-muted-foreground">
          {skill.latestVersion && (
            <span className="px-2.5 py-1 rounded-full bg-secondary/60 font-mono">
              v{skill.latestVersion}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Download className="w-3.5 h-3.5" />
            {formatCompactCount(skill.downloadCount)}
          </span>
          <span
            className={cn(
              "flex items-center gap-1",
              showStarredHighlight && "font-semibold text-primary"
            )}
          >
            <Star className={cn("w-3.5 h-3.5", showStarredHighlight && "fill-current")} />
            {skill.starCount}
          </span>
          {skill.ratingAvg !== undefined && skill.ratingCount && skill.ratingCount > 0 && (
            <span className="flex items-center gap-1 text-amber-500">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {skill.ratingAvg.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}
