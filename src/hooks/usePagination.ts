/**
 * 分页 Hook
 */

import { useState, useCallback, useEffect } from 'react';

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
}

export interface UsePaginationReturn<T> {
  data: T[];
  total: number;
  loading: boolean;
  error: Error | null;
  page: number;
  pageSize: number;
  totalPages: number;
  onChange: (page: number, pageSize: number) => void;
  refresh: () => void;
  reset: () => void;
}

/**
 * 分页 Hook
 * @param fetchData 获取数据的函数
 * @param defaultPageSize 默认Items per page
 * @param deps 依赖项数组，当依赖变化时重新获取数据
 */
export function usePagination<T>(
  fetchData: (params: PaginationParams) => Promise<PaginationResult<T>>,
  defaultPageSize = 10,
  deps: any[] = []
): UsePaginationReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchData({ page, pageSize });
      setData(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch data'));
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [fetchData, page, pageSize]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, ...deps]);

  const onChange = useCallback((newPage: number, newPageSize: number) => {
    if (newPageSize !== pageSize) {
      // e.g.果Items per page变化，重置到第一页
      setPage(1);
      setPageSize(newPageSize);
    } else {
      setPage(newPage);
    }
  }, [pageSize]);

  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  const reset = useCallback(() => {
    setPage(1);
    setPageSize(defaultPageSize);
  }, [defaultPageSize]);

  const totalPages = Math.ceil(total / pageSize);

  return {
    data,
    total,
    loading,
    error,
    page,
    pageSize,
    totalPages,
    onChange,
    refresh,
    reset,
  };
}

/**
 * 前端分页 Hook
 * 用于对已有数据进行前端分页
 */
export function useFrontendPagination<T>(
  allData: T[],
  defaultPageSize = 10
): {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onChange: (page: number, pageSize: number) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
} {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const total = allData.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // 获取当前页数据
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const data = allData.slice(startIndex, endIndex);

  const onChange = (newPage: number, newPageSize: number) => {
    if (newPageSize !== pageSize) {
      setPage(1);
      setPageSize(newPageSize);
    } else {
      setPage(newPage);
    }
  };

  // 当数据变化时，e.g.果当前页超出范围，重置到最后一页
  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }
  }, [totalPages, page]);

  return {
    data,
    page,
    pageSize,
    total,
    totalPages,
    onChange,
    setPage,
    setPageSize,
  };
}
