/**
 * Rating Input Component
 * Interactive star rating input for skills
 */

import { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RatingInputProps {
  value?: number
  onChange?: (rating: number) => void
  readonly?: boolean
  count?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6'
}

/**
 * Interactive star rating component
 */
export function RatingInput({
  value = 0,
  onChange,
  readonly = false,
  count = 5,
  size = 'md',
  className
}: RatingInputProps) {
  const [hoverValue, setHoverValue] = useState(0)

  const handleClick = (rating: number) => {
    if (readonly || !onChange) return
    onChange(rating)
  }

  const handleMouseEnter = (rating: number) => {
    if (readonly) return
    setHoverValue(rating)
  }

  const handleMouseLeave = () => {
    setHoverValue(0)
  }

  const displayValue = hoverValue || value

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: count }).map((_, index) => {
        const rating = index + 1
        const isFilled = rating <= displayValue

        return (
          <button
            key={rating}
            type="button"
            onClick={() => handleClick(rating)}
            onMouseEnter={() => handleMouseEnter(rating)}
            onMouseLeave={handleMouseLeave}
            disabled={readonly}
            className={cn(
              "transition-transform hover:scale-110 disabled:hover:scale-100",
              readonly && "cursor-default"
            )}
            aria-label={`Rate ${rating} stars`}
          >
            <Star
              className={cn(
                sizeClasses[size],
                "transition-colors",
                isFilled
                  ? "fill-amber-500 text-amber-500"
                  : "fill-transparent text-muted-foreground hover:text-amber-400"
              )}
            />
          </button>
        )
      })}
      {value > 0 && (
        <span className="ml-2 text-sm text-muted-foreground">
          {value.toFixed(1)}
        </span>
      )}
    </div>
  )
}
