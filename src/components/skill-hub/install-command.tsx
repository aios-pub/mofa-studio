/**
 * Install Command Component
 * Displays the installation command for a skill with copy functionality
 */

import { useState } from 'react'
import { Check, Copy, Terminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface InstallCommandProps {
  namespace: string
  slug: string
  version?: string
  className?: string
}

/**
 * Generates the installation command for a skill
 */
function generateInstallCommand(namespace: string, slug: string, version?: string): string {
  const versionPart = version ? `@${version}` : ''
  return `amos skill install ${namespace}/${slug}${versionPart}`
}

/**
 * Displays the installation command for a skill with a copy button
 */
export function InstallCommand({ namespace, slug, version, className }: InstallCommandProps) {
  const [copied, setCopied] = useState(false)

  const command = generateInstallCommand(namespace, slug, version)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy command:', err)
    }
  }

  return (
    <Card className={cn("bg-muted/50", className)}>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Terminal className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <code className="text-sm font-mono truncate text-foreground">
            {command}
          </code>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="flex-shrink-0 h-8 px-3"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-1" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>
    </Card>
  )
}
