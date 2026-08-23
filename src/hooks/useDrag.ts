/**
 * Drag and resize hook
 */

import { useState, useCallback, useEffect, useRef } from 'react';

// ==================== Dragging ====================

export interface Position {
  x: number;
  y: number;
}

export interface UseDragOptions {
  /** Initial position */
  initialPosition?: Position;
  /** Boundary constraints */
  bounds?: {
    left?: number;
    top?: number;
    right?: number;
    bottom?: number;
  };
  /** Whether to enable dragging */
  disabled?: boolean;
  /** Drag start callback */
  onDragStart?: (position: Position) => void;
  /** Dragging callback */
  onDrag?: (position: Position) => void;
  /** Drag end callback */
  onDragEnd?: (position: Position) => void;
}

export interface UseDragReturn {
  /** Current position */
  position: Position;
  /** Whether currently dragging */
  isDragging: boolean;
  /** Drag start event handler */
  handleDragStart: (e: React.MouseEvent | React.TouchEvent) => void;
  /** Reset position */
  resetPosition: () => void;
  /** Set position */
  setPosition: (position: Position) => void;
}

/**
 * Drag hook
 * @param options Configuration options
 * @returns Drag state and methods
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

  // Constrain position within bounds
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

// ==================== Resizing ====================

export interface Size {
  width: number;
  height: number;
}

export interface UseResizeOptions {
  /** Initial size */
  initialSize?: Size;
  /** Minimum width */
  minWidth?: number;
  /** Minimum height */
  minHeight?: number;
  /** Maximum width */
  maxWidth?: number;
  /** Maximum height */
  maxHeight?: number;
  /** Whether to enable */
  disabled?: boolean;
  /** Resize start callback */
  onResizeStart?: (size: Size) => void;
  /** Resizing callback */
  onResize?: (size: Size) => void;
  /** Resize end callback */
  onResizeEnd?: (size: Size) => void;
}

export interface UseResizeReturn {
  /** Current size */
  size: Size;
  /** Whether currently resizing */
  isResizing: boolean;
  /** Resize start event handler */
  handleResizeStart: (e: React.MouseEvent | React.TouchEvent, direction?: ResizeDirection) => void;
  /** Reset size */
  resetSize: () => void;
  /** Set size */
  setSize: (size: Size) => void;
}

type ResizeDirection = 'se' | 'sw' | 'ne' | 'nw' | 'n' | 's' | 'e' | 'w';

/**
 * Resize hook
 * @param options Configuration options
 * @returns Resize state and methods
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

      // Compute new size by direction
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

// ==================== Drop zone ====================

export interface UseDropOptions {
  /** Whether to enable */
  disabled?: boolean;
  /** Drag enter callback */
  onDragEnter?: (e: DragEvent) => void;
  /** Drag leave callback */
  onDragLeave?: (e: DragEvent) => void;
  /** Drag over callback */
  onDragOver?: (e: DragEvent) => void;
  /** Drop callback */
  onDrop?: (e: DragEvent) => void;
}

export interface UseDropReturn {
  /** Whether drag hovers over the zone */
  isOver: boolean;
  /** Props bound to the element */
  bind: {
    onDragEnter: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
}

/**
 * Drop zone hook
 * @param options Configuration options
 * @returns Drop state and bound props
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

// ==================== File drag and drop ====================

export interface UseFileDropOptions {
  /** Whether to enable */
  disabled?: boolean;
  /** Accepted file types */
  accept?: string[];
  /** Multiple */
  multiple?: boolean;
  /** File drop callback */
  onDrop: (files: File[]) => void;
  /** Drag enter callback */
  onDragEnter?: () => void;
  /** Drag leave callback */
  onDragLeave?: () => void;
}

export interface UseFileDropReturn {
  /** Whether drag is hovering */
  isOver: boolean;
  /** Root element props */
  getRootProps: () => {
    onDragEnter: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
  /** Input props */
  getInputProps: () => {
    type: 'file';
    accept?: string;
    multiple?: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    style: React.CSSProperties;
  };
}

/**
 * File drag and drop hook
 * @param options Configuration options
 * @returns Drop state and props
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

      // Filter file types
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

      // Take only the first one in single-select mode
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
      // Reset the input to allow selecting the same file
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
