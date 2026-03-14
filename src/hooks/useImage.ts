/**
 * 图片和滚动相关 Hook
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ==================== 图片加载 ====================

export interface UseImageLoadOptions {
  /** 加载失败时显示的图片 */
  fallback?: string;
  /** 加载超时时间 */
  timeout?: number;
}

export interface UseImageLoadReturn {
  /** 加载状态 */
  status: 'loading' | 'loaded' | 'error';
  /** 是否加载中 */
  isLoading: boolean;
  /** 是否加载完成 */
  isLoaded: boolean;
  /** 是否加载失败 */
  isError: boolean;
  /** 当前显示的图片 URL */
  src: string;
}

/**
 * 图片加载状态 Hook
 * @param src 图片 URL
 * @param options 配置选项
 * @returns 加载状态
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

    // 超时处理
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
 * 批量图片加载
 * @param srcs 图片 URL 数组
 * @returns 加载状态
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

// ==================== 图片预览 ====================

export interface ImagePreviewItem {
  src: string;
  alt?: string;
}

export interface UseImagePreviewReturn {
  /** 是否显示预览 */
  visible: boolean;
  /** 当前预览索引 */
  currentIndex: number;
  /** 当前预览图片 */
  currentImage: ImagePreviewItem | null;
  /** 打开预览 */
  open: (index?: number) => void;
  /** 关闭预览 */
  close: () => void;
  /** 上一张 */
  prev: () => void;
  /** 下一张 */
  next: () => void;
  /** 跳转到指定图片 */
  goTo: (index: number) => void;
}

/**
 * 图片预览 Hook
 * @param images 图片列表
 * @returns 预览控制
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

  // 键盘控制
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

// ==================== 无限滚动 ====================

export interface UseInfiniteScrollOptions {
  /** 是否有更多数据 */
  hasMore: boolean;
  /** 加载更多的回调 */
  onLoadMore: () => void | Promise<void>;
  /** 触发加载的距离阈值（像素） */
  threshold?: number;
  /** 目标元素（默认为窗口） */
  targetRef?: React.RefObject<HTMLElement | null>;
}

/**
 * 无限滚动 Hook
 * @param options 配置选项
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

// ==================== 滚动到元素 ====================

export interface UseScrollToOptions {
  /** 滚动行为 */
  behavior?: ScrollBehavior;
  /** 顶部偏移 */
  offset?: number;
}

/**
 * 滚动到指定元素
 * @param options 配置选项
 * @returns 滚动函数
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

// ==================== 滚动锁定 ====================

/**
 * 锁定/解锁页面滚动
 * @param locked 是否锁定
 */
export function useScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;

    const originalStyle = window.getComputedStyle(document.body).overflow;
    const originalPaddingRight = window.getComputedStyle(document.body).paddingRight;

    // 计算滚动条宽度
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

// ==================== 滚动位置恢复 ====================

/**
 * 保存和恢复滚动位置
 * @param key 存储键
 */
export function useScrollRestoration(key: string): void {
  const scrollKey = `scroll_${key}`;

  // 保存滚动位置
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem(scrollKey, String(window.scrollY));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrollKey]);

  // 恢复滚动位置
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
