/**
 * Pagination component - based on antd Pagination
 */

import { Pagination as AntdPagination } from "antd";
import { useTranslation } from "react-i18next";

export interface PaginationProps {
  current: number;
  pageSize: number;
  total: number;
  onChange: (page: number, pageSize: number) => void;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  showTotal?: boolean;
  pageSizeOptions?: number[];
}

export default function Pagination({
  current,
  pageSize,
  total,
  onChange,
  showSizeChanger = true,
  showQuickJumper = true,
  showTotal = true,
  pageSizeOptions = [10, 20, 50, 100],
}: PaginationProps) {
  const { t } = useTranslation();

  // Handle empty data
  if (total === 0) return null;

  return (
    <div className="flex items-center justify-end py-3 px-4 bg-[var(--color-bg-secondary)] border-t border-(--color-border)">
      <AntdPagination
        current={current}
        pageSize={pageSize}
        total={total}
        onChange={onChange}
        showSizeChanger={showSizeChanger}
        showQuickJumper={showQuickJumper}
        showTotal={
          showTotal
            ? (total) =>
                t("pagination.total", { total, defaultValue: t("共 {{p0}} 条", { p0: total }) })
            : undefined
        }
        pageSizeOptions={pageSizeOptions}
        size="small"
      />
    </div>
  );
}
