import { useTranslation } from "react-i18next";
/**
 * AI spreadsheet workspace (TOOL-08): import xlsx/csv, issue natural-
 * language commands (LLM maps them to table operations), inspect the
 * operation log, and export back to xlsx/csv.
 */

import { useCallback, useRef, useState } from "react";
import { Button, Empty, Input, Upload, message } from "antd";
import {
  TableOutlined,
  UploadOutlined,
  DownloadOutlined,
  SendOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import {
  emptyTable,
  exportCsvFile,
  exportXlsx,
  importWorkbook,
  parseCsv,
  runCommand,
  type SheetTable,
} from "@/services/api/sheets";
import { AUTO_MODEL } from "@/services/api/engine";
import { ModelPicker } from "@/components/conversation";

interface HistoryEntry {
  table: SheetTable;
  note: string;
}

export default function SheetsPage() {  const { t } = useTranslation();

  const [table, setTable] = useState<SheetTable>(emptyTable());
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [command, setCommand] = useState("");
  const [busy, setBusy] = useState(false);
  const [model, setModel] = useState<string>(AUTO_MODEL);
  const undoRef = useRef(false);

  const importFile = useCallback(async (file: File) => {
    try {
      const parsed = file.name.toLowerCase().endsWith(".csv")
        ? parseCsv(await file.text())
        : await importWorkbook(file);
      if (parsed.columns.length === 0) {
        message.warning(t("文件为空或没有可识别的表头"));
        return;
      }
      setTable(parsed);
      setHistory([]);
      message.success(t("已导入「{{p0}}」：{{p1}} 行 × {{p2}} 列", { p0: file.name, p1: parsed.rows.length, p2: parsed.columns.length }));
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      message.error(t("导入失败：{{p0}}", { p0: detail }));
    }
  }, []);

  const run = useCallback(async () => {
    const trimmed = command.trim();
    if (!trimmed || busy || table.columns.length === 0) return;
    setBusy(true);
    try {
      const result = await runCommand(table, trimmed, model === AUTO_MODEL ? undefined : model);
      setTable(result.table);
      setHistory((prev) => [{ table, note: result.note }, ...prev]);
      setCommand("");
      message.success(result.note);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      message.error(t("指令失败：{{p0}}", { p0: detail }));
    } finally {
      setBusy(false);
    }
  }, [command, busy, table, model]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const [latest, ...rest] = history;
    setTable(latest.table);
    setHistory(rest);
    undoRef.current = true;
    message.info(t("已撤销上一步操作"));
  }, [history]);

  return (
    <div className="flex h-full">
      {/* Panel */}
      <div className="w-72 border-r border-(--color-border) p-4 space-y-4 overflow-y-auto">
        <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--color-text-primary)]">
          <TableOutlined className="text-[var(--color-primary)]" />
          AI 表格
        </h2>

        <Upload
          accept=".xlsx,.xls,.csv"
          showUploadList={false}
          beforeUpload={(file) => {
            void importFile(file);
            return false;
          }}
        >
          <Button block icon={<UploadOutlined />} aria-label={t("导入文件")}>
            导入 xlsx / csv
          </Button>
        </Upload>

        <div>
          <label className="block text-sm font-medium mb-1">{t("对话式操作")}</label>
          <Input.TextArea
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void run();
              }
            }}
            placeholder={'例如：\n· 按销量降序\n· 只要销量大于100的行\n· 新增一列等于销量的总和'}
            rows={4}
            disabled={table.columns.length === 0 || busy}
            aria-label={t("表格指令输入")}
          />
          <Button
            type="primary"
            block
            className="mt-2"
            icon={<SendOutlined />}
            loading={busy}
            disabled={!command.trim() || table.columns.length === 0}
            onClick={run}
            aria-label={t("执行指令")}
          >
            执行
          </Button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t("模型")}</label>
          <ModelPicker value={model} onChange={setModel} />
        </div>

        <div className="space-y-2">
          <Button
            block
            icon={<UndoOutlined />}
            disabled={history.length === 0}
            onClick={undo}
            aria-label={t("撤销")}
          >
            撤销（{history.length}）
          </Button>
          <Button
            block
            icon={<DownloadOutlined />}
            disabled={table.columns.length === 0}
            onClick={() => exportXlsx(table, "导出表格")}
            aria-label={t("导出 xlsx")}
          >
            导出 .xlsx
          </Button>
          <Button
            block
            disabled={table.columns.length === 0}
            onClick={() => exportCsvFile(table, "导出表格")}
            aria-label={t("导出 csv")}
          >
            导出 .csv
          </Button>
        </div>

        {history.length > 0 && (
          <div className="pt-2 border-t border-(--color-border)">
            <p className="text-xs font-medium mb-1 text-[var(--color-text-secondary)]">{t("操作记录")}</p>
            {history.slice(0, 8).map((entry, index) => (
              <p key={index} className="text-xs text-[var(--color-text-tertiary)] truncate">
                · {entry.note}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-4">
        {table.columns.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <Empty description={t("导入 xlsx / csv 文件，用一句话开始分析")} />
          </div>
        ) : (
          <table className="min-w-full text-sm border-collapse" aria-label={t("数据表格")}>
            <thead>
              <tr>
                {table.columns.map((column, index) => (
                  <th
                    key={index}
                    className="sticky top-0 bg-(--color-bg-tertiary) border border-(--color-border) px-3 py-2 text-left font-medium whitespace-nowrap"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.slice(0, 200).map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-(--color-bg-tertiary)">
                  {row.map((cell, colIndex) => (
                    <td key={colIndex} className="border border-(--color-border) px-3 py-1.5 whitespace-nowrap">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {table.rows.length > 200 && (
          <p className="mt-2 text-xs text-[var(--color-text-tertiary)]">
            显示前 200 行（共 {table.rows.length} 行），导出包含全部数据。
          </p>
        )}
      </div>
    </div>
  );
}
