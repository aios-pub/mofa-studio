/**
 * Image and scrolling hooks
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ==================== Image loading ====================

export interface UseImageLoadOptions {
  /** Image shown when loading fails */
  fallback?: string;
  /** Load timeout */
  timeout?: number;
}

export interface UseImageLoadReturn {
  /** Loading state */
  status: 'loading' | 'loaded' | 'error';
  /** Whether loading */
  isLoading: boolean;
  /** Whether loading is complete */
  isLoaded: boolean;
  /** Whether loading failed */
  isError: boolean;
  /** Currently displayed image URL */
  src: string;
}

/**
 * Image loading state hook
 * @param src Image URL
 * @param options Configuration options
 * @returns Loading state
 */
export function useImageLoad(
  src: string,
  options: UseImageLoadOptions = {}
): UseImageLoadReturn {
  const { fallback, timeout = 10000 } = options;

  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  useEffect(() => {
    if (!src) {
      setStatus('error');
      return;
    }

    setStatus('loading');

    const img = new Image();
    let timeoutId: ReturnType<typeof setTimeout>;

    const handleLoad = () => {
      clearTimeout(timeoutId);
      setStatus('loaded');
    };

    const handleError = () => {
      clearTimeout(timeoutId);
      setStatus('error');
    };

    img.onload = handleLoad;
    img.onerror = handleError;
    img.src = src;

    // Timeout handling
    timeoutId = setTimeout(() => {
      setStatus('error');
    }, timeout);

    return () => {
      clearTimeout(timeoutId);
      img.onload = null;
      img.onerror = null;
    };
  }, [src, timeout]);

  return {
    status,
    isLoading: status === 'loading',
    isLoaded: status === 'loaded',
    isError: status === 'error',
    src: status === 'error' && fallback ? fallback : src,
  };
}

/**
 * Batch image loading
 * @param srcs Array of image URLs
 * @returns Loading state
 */
export function useImagesLoad(srcs: string[]): {
  loadedCount: number;
  totalCount: number;
  progress: number;
  isAllLoaded: boolean;
} {
  const [loadedCount, setLoadedCount] = useState(0);
  const totalCount = srcs.length;

  useEffect(() => {
    if (srcs.length === 0) return;

    setLoadedCount(0);

    let count = 0;
    const incrementCount = () => {
      count++;
      setLoadedCount(count);
    };

    srcs.forEach((src) => {
      if (!src) {
        incrementCount();
        return;
      }

      const img = new Image();
      img.onload = incrementCount;
      img.onerror = incrementCount;
      img.src = src;
    });
  }, [srcs]);

  return {
    loadedCount,
    totalCount,
    progress: totalCount > 0 ? (loadedCount / totalCount) * 100 : 0,
    isAllLoaded: loadedCount === totalCount,
  };
}

// ==================== Image preview ====================

export interface ImagePreviewItem {
  src: string;
  alt?: string;
}

export interface UseImagePreviewReturn {
  /** Whether to show preview */
  visible: boolean;
  /** Current preview index */
  currentIndex: number;
  /** Current preview image */
  currentImage: ImagePreviewItem | null;
  /** Open preview */
  open: (index?: number) => void;
  /** Close preview */
  close: () => void;
  /** Previous */
  prev: () => void;
  /** Next */
  next: () => void;
  /** Navigate to a specific image */
  goTo: (index: number) => void;
}

/**
 * Image preview Hook
 * @param images Image list
 * @returns Preview controls
 */
export function useImagePreview(
  images: ImagePreviewItem[]
): UseImagePreviewReturn {
  const [visible, setVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const open = useCallback((index = 0) => {
    setCurrentIndex(Math.max(0, Math.min(index, images.length - 1)));
    setVisible(true);
  }, [images.length]);

  const close = useCallback(() => {
    setVisible(false);
  }, []);

  const prev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const next = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  const goTo = useCallback((index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, images.length - 1)));
  }, [images.length]);

  // Keyboard control
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          prev();
          break;
        case 'ArrowRight':
          next();
          break;
        case 'Escape':
          close();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, prev, next, close]);

  return {
    visible,
    currentIndex,
    currentImage: images[currentIndex] || null,
    open,
    close,
    prev,
    next,
    goTo,
  };
}

// ==================== Infinite scroll ====================

export interface UseInfiniteScrollOptions {
  /** Whether more data is available */
  hasMore: boolean;
  /** Load more callback */
  onLoadMore: () => void | Promise<void>;
  /** Distance threshold to trigger loading (pixels) */
  threshold?: number;
  /** Target element (defaults to window) */
  targetRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Infinite scroll hook
 * @param options Configuration options
 */
export function useInfiniteScroll(options: UseInfiniteScrollOptions): {
  isLoading: boolean;
} {
  const { hasMore, onLoadMore, threshold = 100, targetRef } = options;
  const [isLoading, setIsLoading] = useState(false);
  const loadingRef = useRef(false);

  const handleScroll = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;

    let shouldLoad = false;

    if (targetRef?.current) {
      const { scrollTop, scrollHeight, clientHeight } = targetRef.current;
      shouldLoad = scrollHeight - scrollTop - clientHeight < threshold;
    } else {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      shouldLoad = scrollHeight - scrollTop - clientHeight < threshold;
    }

    if (shouldLoad) {
      loadingRef.current = true;
      setIsLoading(true);
      try {
        await onLoadMore();
      } finally {
        loadingRef.current = false;
        setIsLoading(false);
      }
    }
  }, [hasMore, onLoadMore, threshold, targetRef]);

  useEffect(() => {
    const target = targetRef?.current || window;
    target.addEventListener('scroll', handleScroll, { passive: true });
    return () => target.removeEventListener('scroll', handleScroll);
  }, [handleScroll, targetRef]);

  return { isLoading };
}

// ==================== Scroll to element ====================

export interface UseScrollToOptions {
  /** Scroll behavior */
  behavior?: ScrollBehavior;
  /** Top offset */
  offset?: number;
}

/**
 * Scroll to a specific element
 * @param options Configuration options
 * @returns Scroll function
 */
export function useScrollTo(options: UseScrollToOptions = {}) {
  const { behavior = 'smooth', offset = 0 } = options;

  const scrollTo = useCallback(
    (element: HTMLElement | string | null) => {
      let target: HTMLElement | null = null;

      if (typeof element === 'string') {
        target = document.getElementById(element);
      } else {
        target = element;
      }

      if (!target) return;

      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior });
    },
    [behavior, offset]
  );

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior });
  }, [behavior]);

  const scrollToBottom = useCallback(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior });
  }, [behavior]);

  return { scrollTo, scrollToTop, scrollToBottom };
}

// ==================== Scroll locking ====================

/**
 * Lock/unlock page scrolling
 * @param locked Whether locked
 */
export function useScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;

    const originalStyle = window.getComputedStyle(document.body).overflow;
    const originalPaddingRight = window.getComputedStyle(document.body).paddingRight;

    // Compute scrollbar width
    const scrollbarWidth = window.innerWidth - document.body.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalStyle;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [locked]);
}

// ==================== Scroll position restoration ====================

/**
 * Save and restore scroll position
 * @param key Storage key
 */
export function useScrollRestoration(key: string): void {
  const scrollKey = `scroll_${key}`;

  // Save scroll position
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem(scrollKey, String(window.scrollY));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrollKey]);

  // Restore scroll position
  useEffect(() => {
    const savedPosition = sessionStorage.getItem(scrollKey);
    if (savedPosition) {
      window.scrollTo(0, parseInt(savedPosition, 10));
    }
  }, [scrollKey]);
}

export default {
  useImageLoad,
  useImagesLoad,
  useImagePreview,
  useInfiniteScroll,
  useScrollTo,
  useScrollLock,
  useScrollRestoration,
};
