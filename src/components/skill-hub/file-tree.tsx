/**
 * File Tree Component
 * Displays a hierarchical file tree with expandable directories
 */

import { useMemo, useCallback } from 'react'
import { Folder } from 'lucide-react'
import type { FileTreeNode } from './file-tree-builder'
import { FileTreeNodeComponent } from './file-tree-node'
import { Card } from '@/components/ui/card'
import { buildFileTree } from './file-tree-builder'

export interface SkillFile {
  filePath: string
  fileSize?: number
  contentType?: string
}

interface FileTreeProps {
  files: SkillFile[]
  onFileClick?: (node: FileTreeNode) => void
  /** When true, renders without the outer border/header (for embedding in a Card) */
  bare?: boolean
  className?: string
}

/**
 * Displays a hierarchical file tree with expandable directories.
 * Converts flat file list into tree structure and renders with proper nesting.
 */
export function FileTree({ files, onFileClick, bare = false, className }: FileTreeProps) {
  // Cache tree structure to avoid rebuilding on every render
  const tree = useMemo(() => buildFileTree(files), [files])

  // Stable callback reference to prevent child re-renders
  const handleFileClick = useCallback(
    (node: FileTreeNode) => {
      if (node.type === 'file' && onFileClick) {
        onFileClick(node)
      }
    },
    [onFileClick]
  )

  const treeContent = (
    <div>
      {tree.map((node) => (
        <FileTreeNodeComponent
          key={node.id}
          node={node}
          onFileClick={handleFileClick}
          defaultExpanded={false}
        />
      ))}
    </div>
  )

  // Bare mode: no wrapper, for embedding inside a Card
  if (bare) {
    return <div className={className}>{treeContent}</div>
  }

  // Standalone mode: with border and header
  return (
    <Card className={className}>
      <div className="bg-muted/80 px-4 py-2.5 flex items-center justify-between border-b">
        <div className="text-sm font-medium flex items-center gap-2">
          <Folder className="h-4 w-4 text-muted-foreground" />
          Files
        </div>
        <span className="text-xs text-muted-foreground bg-background/60 px-2 py-0.5 rounded-full">
          {files.length}
        </span>
      </div>
      {treeContent}
    </Card>
  )
}
