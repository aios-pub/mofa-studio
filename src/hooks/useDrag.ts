/**
 * 拖拽和调整大小 Hook
 */

import { useState, useCallback, useEffect, useRef } from 'react';

// ==================== 拖拽 ====================

export interface Position {
  x: number;
  y: number;
}

export interface UseDragOptions {
  /** 初始位置 */
  initialPosition?: Position;
  /** 边界限制 */
  bounds?: {
    left?: number;
    top?: number;
    right?: number;
    bottom?: number;
  };
  /** 是否启用拖拽 */
  disabled?: boolean;
  /** 拖拽开始回调 */
  onDragStart?: (position: Position) => void;
  /** 拖拽中回调 */
  onDrag?: (position: Position) => void;
  /** 拖拽结束回调 */
  onDragEnd?: (position: Position) => void;
}

export interface UseDragReturn {
  /** 当前位置 */
  position: Position;
  /** 是否正在拖拽 */
  isDragging: boolean;
  /** 拖拽开始事件处理器 */
  handleDragStart: (e: React.MouseEvent | React.TouchEvent) => void;
  /** 重置位置 */
  resetPosition: () => void;
  /** 设置位置 */
  setPosition: (position: Position) => void;
}

/**
 * 拖拽 Hook
 * @param options 配置选项
 * @returns 拖拽状态和方法
 */
export function useDrag(options: UseDragOptions = {}): UseDragReturn {
  const {
    initialPosition = { x: 0, y: 0 },
    bounds,
    disabled = false,
    onDragStart,
    onDrag,
    onDragEnd,
  } = options;

  const [position, setPosition] = useState<Position>(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<Position | null>(null);
  const elementStartRef = useRef<Position | null>(null);

  // 限制位置在边界内
  const clampPosition = useCallback(
    (pos: Position): Position => {
      if (!bounds) return pos;

      return {
        x: Math.max(
          bounds.left ?? -Infinity,
          Math.min(bounds.right ?? Infinity, pos.x)
        ),
        y: Math.max(
          bounds.top ?? -Infinity,
          Math.min(bounds.bottom ?? Infinity, pos.y)
        ),
      };
    },
    [bounds]
  );

  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;

      e.preventDefault();
      setIsDragging(true);

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      dragStartRef.current = { x: clientX, y: clientY };
      elementStartRef.current = position;

      onDragStart?.(position);
    },
    [disabled, position, onDragStart]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      if (!dragStartRef.current || !elementStartRef.current) return;

      const deltaX = clientX - dragStartRef.current.x;
      const deltaY = clientY - dragStartRef.current.y;

      const newPosition = clampPosition({
        x: elementStartRef.current.x + deltaX,
        y: elementStartRef.current.y + deltaY,
      });

      setPosition(newPosition);
      onDrag?.(newPosition);
    };

    const handleEnd = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      elementStartRef.current = null;
      onDragEnd?.(position);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchend', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, position, clampPosition, onDrag, onDragEnd]);

  const resetPosition = useCallback(() => {
    setPosition(initialPosition);
  }, [initialPosition]);

  return {
    position,
    isDragging,
    handleDragStart,
    resetPosition,
    setPosition,
  };
}

// ==================== 调整大小 ====================

export interface Size {
  width: number;
  height: number;
}

export interface UseResizeOptions {
  /** 初始大小 */
  initialSize?: Size;
  /** 最小宽度 */
  minWidth?: number;
  /** 最小高度 */
  minHeight?: number;
  /** 最大宽度 */
  maxWidth?: number;
  /** 最大高度 */
  maxHeight?: number;
  /** 是否启用 */
  disabled?: boolean;
  /** 调整大小开始回调 */
  onResizeStart?: (size: Size) => void;
  /** 调整大小中回调 */
  onResize?: (size: Size) => void;
  /** 调整大小结束回调 */
  onResizeEnd?: (size: Size) => void;
}

export interface UseResizeReturn {
  /** 当前大小 */
  size: Size;
  /** 是否正在调整 */
  isResizing: boolean;
  /** 调整开始事件处理器 */
  handleResizeStart: (e: React.MouseEvent | React.TouchEvent, direction?: ResizeDirection) => void;
  /** 重置大小 */
  resetSize: () => void;
  /** 设置大小 */
  setSize: (size: Size) => void;
}

type ResizeDirection = 'se' | 'sw' | 'ne' | 'nw' | 'n' | 's' | 'e' | 'w';

/**
 * 调整大小 Hook
 * @param options 配置选项
 * @returns 调整大小状态和方法
 */
export function useResize(options: UseResizeOptions = {}): UseResizeReturn {
  const {
    initialSize = { width: 200, height: 200 },
    minWidth = 50,
    minHeight = 50,
    maxWidth = Infinity,
    maxHeight = Infinity,
    disabled = false,
    onResizeStart,
    onResize,
    onResizeEnd,
  } = options;

  const [size, setSize] = useState<Size>(initialSize);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef<{ x: number; y: number; size: Size; direction: ResizeDirection } | null>(null);

  const clampSize = useCallback(
    (newSize: Size): Size => ({
      width: Math.max(minWidth, Math.min(maxWidth, newSize.width)),
      height: Math.max(minHeight, Math.min(maxHeight, newSize.height)),
    }),
    [minWidth, minHeight, maxWidth, maxHeight]
  );

  const handleResizeStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent, direction: ResizeDirection = 'se') => {
      if (disabled) return;

      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      resizeStartRef.current = {
        x: clientX,
        y: clientY,
        size,
        direction,
      };

      onResizeStart?.(size);
    },
    [disabled, size, onResizeStart]
  );

  useEffect(() => {
    if (!isResizing || !resizeStartRef.current) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const { x: startX, y: startY, size: startSize, direction } = resizeStartRef.current!;
      const deltaX = clientX - startX;
      const deltaY = clientY - startY;

      let newWidth = startSize.width;
      let newHeight = startSize.height;

      // 根据方向计算新大小
      if (direction.includes('e')) newWidth = startSize.width + deltaX;
      if (direction.includes('w')) newWidth = startSize.width - deltaX;
      if (direction.includes('s')) newHeight = startSize.height + deltaY;
      if (direction.includes('n')) newHeight = startSize.height - deltaY;

      const clampedSize = clampSize({ width: newWidth, height: newHeight });
      setSize(clampedSize);
      onResize?.(clampedSize);
    };

    const handleEnd = () => {
      setIsResizing(false);
      resizeStartRef.current = null;
      onResizeEnd?.(size);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchend', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isResizing, size, clampSize, onResize, onResizeEnd]);

  const resetSize = useCallback(() => {
    setSize(initialSize);
  }, [initialSize]);

  return {
    size,
    isResizing,
    handleResizeStart,
    resetSize,
    setSize,
  };
}

// ==================== 拖放区域 ====================

export interface UseDropOptions {
  /** 是否启用 */
  disabled?: boolean;
  /** 拖拽进入回调 */
  onDragEnter?: (e: DragEvent) => void;
  /** 拖拽离开回调 */
  onDragLeave?: (e: DragEvent) => void;
  /** 拖拽悬停回调 */
  onDragOver?: (e: DragEvent) => void;
  /** 放置回调 */
  onDrop?: (e: DragEvent) => void;
}

export interface UseDropReturn {
  /** 是否拖拽悬停在区域上 */
  isOver: boolean;
  /** 绑定到元素的属性 */
  bind: {
    onDragEnter: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
}

/**
 * 拖放区域 Hook
 * @param options 配置选项
 * @returns 拖放状态和绑定属性
 */
export function useDrop(options: UseDropOptions = {}): UseDropReturn {
  const {
    disabled = false,
    onDragEnter,
    onDragLeave,
    onDragOver,
    onDrop,
  } = options;

  const [isOver, setIsOver] = useState(false);
  const dragCountRef = useRef(0);

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return;

      e.preventDefault();
      dragCountRef.current++;

      if (dragCountRef.current === 1) {
        setIsOver(true);
        onDragEnter?.(e.nativeEvent);
      }
    },
    [disabled, onDragEnter]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return;

      e.preventDefault();
      dragCountRef.current--;

      if (dragCountRef.current === 0) {
        setIsOver(false);
        onDragLeave?.(e.nativeEvent);
      }
    },
    [disabled, onDragLeave]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return;

      e.preventDefault();
      onDragOver?.(e.nativeEvent);
    },
    [disabled, onDragOver]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return;

      e.preventDefault();
      dragCountRef.current = 0;
      setIsOver(false);
      onDrop?.(e.nativeEvent);
    },
    [disabled, onDrop]
  );

  return {
    isOver,
    bind: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    },
  };
}

// ==================== 文件拖放 ====================

export interface UseFileDropOptions {
  /** 是否启用 */
  disabled?: boolean;
  /** 接受的文件类型 */
  accept?: string[];
  /** 是否多选 */
  multiple?: boolean;
  /** 文件放下回调 */
  onDrop: (files: File[]) => void;
  /** 拖拽进入回调 */
  onDragEnter?: () => void;
  /** 拖拽离开回调 */
  onDragLeave?: () => void;
}

export interface UseFileDropReturn {
  /** 是否拖拽悬停 */
  isOver: boolean;
  /** 根元素属性 */
  getRootProps: () => {
    onDragEnter: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
  /** 输入框属性 */
  getInputProps: () => {
    type: 'file';
    accept?: string;
    multiple?: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    style: React.CSSProperties;
  };
}

/**
 * 文件拖放 Hook
 * @param options 配置选项
 * @returns 拖放状态和属性
 */
export function useFileDrop(options: UseFileDropOptions): UseFileDropReturn {
  const {
    disabled = false,
    accept,
    multiple = true,
    onDrop,
    onDragEnter,
    onDragLeave,
  } = options;

  const [isOver, setIsOver] = useState(false);
  const dragCountRef = useRef(0);

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return;

      e.preventDefault();
      dragCountRef.current++;

      if (dragCountRef.current === 1) {
        setIsOver(true);
        onDragEnter?.();
      }
    },
    [disabled, onDragEnter]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return;

      e.preventDefault();
      dragCountRef.current--;

      if (dragCountRef.current === 0) {
        setIsOver(false);
        onDragLeave?.();
      }
    },
    [disabled, onDragLeave]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
  }, [disabled]);

  const processFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;

      let fileList = Array.from(files);

      // 过滤文件类型
      if (accept && accept.length > 0) {
        fileList = fileList.filter((file) => {
          const fileType = file.type;
          const fileExtension = `.${file.name.split('.').pop()}`;
          return accept.some(
            (type) =>
              fileType === type ||
              fileExtension === type ||
              (type.endsWith('/*') && fileType.startsWith(type.slice(0, -1)))
          );
        });
      }

      // 单选时只取第一个
      if (!multiple) {
        fileList = fileList.slice(0, 1);
      }

      if (fileList.length > 0) {
        onDrop(fileList);
      }
    },
    [accept, multiple, onDrop]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return;

      e.preventDefault();
      dragCountRef.current = 0;
      setIsOver(false);

      processFiles(e.dataTransfer.files);
    },
    [disabled, processFiles]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      processFiles(e.target.files);
      // 重置 input 以允许选择相同文件
      e.target.value = '';
    },
    [processFiles]
  );

  return {
    isOver,
    getRootProps: () => ({
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    }),
    getInputProps: () => ({
      type: 'file' as const,
      accept: accept?.join(','),
      multiple,
      onChange: handleInputChange,
      style: { display: 'none' },
    }),
  };
}

export default {
  useDrag,
  useResize,
  useDrop,
  useFileDrop,
};
