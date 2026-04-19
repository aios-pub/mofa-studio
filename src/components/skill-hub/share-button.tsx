/**
 * Share Button Component
 * Provides share functionality for skills with multiple options
 */

import { useState } from 'react'
import { Share2, Check, Link } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

interface ShareButtonProps {
  skillId: string
  namespace: string
  slug: string
  className?: string
}

/**
 * Share button with options to copy link or open in new tab
 */
export function ShareButton({ skillId, namespace, slug, className }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)
  const [shareUrl, setShareUrl] = useState('')

  // Generate share URL
  const generateShareUrl = () => {
    const url = `${window.location.origin}/skills/${namespace}/${slug}`
    setShareUrl(url)
    return url
  }

  const handleCopyLink = async () => {
    const url = generateShareUrl()
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  const handleNativeShare = async () => {
    const url = generateShareUrl()
    const title = `${namespace}/${slug} - Skill`

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url,
        })
      } catch (err) {
        console.error('Error sharing:', err)
      }
    }
  }

  return (
    <Dialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className={className}>
            <Share2 className="h-4 w-4" />
            <span className="sr-only">Share</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Link className="h-4 w-4 mr-2" />
              Copy Link
            </DropdownMenuItem>
          </DialogTrigger>
          <DropdownMenuItem onClick={handleNativeShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Skill</DialogTitle>
          <DialogDescription>
            Share this skill with others by copying the link below
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Input
            value={generateShareUrl()}
            readOnly
            className="flex-1"
          />
          <Button onClick={handleCopyLink} size="icon" variant="secondary">
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Link className="h-4 w-4" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
