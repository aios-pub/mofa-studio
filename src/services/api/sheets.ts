/**
 * AI spreadsheet service (TOOL-08): file import (xlsx/csv), natural-language
 * commands mapped by the LLM to table operations, pure formula evaluation
 * over column aggregates, and export back to xlsx/csv. The table model is
 * plain JSON so operations are testable without any grid component.
 */

import * as XLSX from "xlsx";
import { chatService } from "./chat";

// ==================== Table model ====================

export interface SheetTable {
  columns: string[];
  /** rows[i][j] is cell text (strings keep provenance; numbers parse lazily). */
  rows: string[][];
}

export function emptyTable(): SheetTable {
  return { columns: [], rows: [] };
}

// ==================== Import ====================

/** RFC-4180-ish CSV parse: quoted fields, embedded commas/newlines. */
export function parseCsv(text: string): SheetTable {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ""));
  if (nonEmpty.length === 0) return emptyTable();
  const [header, ...body] = nonEmpty;
  const width = Math.max(...nonEmpty.map((r) => r.length));
  const normalize = (r: string[]) => {
    const padded = [...r];
    while (padded.length < width) padded.push("");
    return padded.slice(0, width).map((c) => c.trim());
  };
  return { columns: normalize(header), rows: body.map(normalize) };
}

export async function importWorkbook(file: File): Promise<SheetTable> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const first = workbook.Sheets[workbook.SheetNames[0]];
  if (!first) return emptyTable();
  const matrix = XLSX.utils.sheet_to_json<string[]>(first, {
    header: 1,
    raw: false,
    defval: "",
  });
  const cleaned = matrix
    .map((row) => row.map((cell) => String(cell ?? "")))
    .filter((row) => row.some((cell) => cell.trim() !== ""));
  if (cleaned.length === 0) return emptyTable();
  const [header, ...body] = cleaned;
  const width = Math.max(...cleaned.map((r) => r.length));
  const pad = (r: string[]) => {
    const padded = [...r];
    while (padded.length < width) padded.push("");
    return padded;
  };
  return { columns: pad(header).map((c) => c.trim()), rows: body.map(pad) };
}

// ==================== Formula evaluation ====================

export type AggFn = "SUM" | "AVG" | "COUNT" | "MIN" | "MAX";

const NUMERIC = /^[+-]?\d+(\.\d+)?$/;

/** Numeric values of a column (non-numeric cells are ignored). */
export function numericColumn(table: SheetTable, column: string): number[] {
  const index = table.columns.indexOf(column);
  if (index === -1) return [];
  return table.rows
    .map((row) => row[index]?.trim() ?? "")
    .filter((cell) => NUMERIC.test(cell))
    .map(Number);
}

export function evaluateAggregate(table: SheetTable, fn: AggFn, column: string): number | null {
  const values = numericColumn(table, column);
  if (fn === "COUNT") {
    // COUNT semantics: non-empty cells (Excel COUNTA), not just numerics.
    const index = table.columns.indexOf(column);
    if (index === -1) return null;
    const nonEmpty = table.rows.filter((row) => (row[index] ?? "").trim() !== "").length;
    return nonEmpty === 0 ? null : nonEmpty;
  }
  if (values.length === 0) return null;
  switch (fn) {
    case "SUM":
      return values.reduce((a, b) => a + b, 0);
    case "AVG":
      return values.reduce((a, b) => a + b, 0) / values.length;
    case "MIN":
      return Math.min(...values);
    case "MAX":
      return Math.max(...values);
  }
}

/** Round to a stable precision for display. */
export function displayNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

// ==================== Operations ====================

export type CompareOp = "eq" | "ne" | "gt" | "lt" | "contains";

export type TableOperation =
  | { type: "add_formula_column"; name: string; fn: AggFn; column: string }
  | { type: "filter"; column: string; op: CompareOp; value: string }
  | { type: "sort"; column: string; direction: "asc" | "desc" }
  | { type: "delete_column"; column: string };

export function applyOperation(
  table: SheetTable,
  op: TableOperation,
): { table: SheetTable; note: string } {
  const columnIndex = table.columns.indexOf("column" in op ? op.column : "");
  switch (op.type) {
    case "add_formula_column": {
      const agg = evaluateAggregate(table, op.fn, op.column);
      if (agg === null) {
        return { table, note: `列「${op.column}」没有可计算的数值` };
      }
      return {
        table: {
          columns: [...table.columns, op.name],
          rows: table.rows.map((row) => [...row, displayNumber(agg)]),
        },
        note: `新增列「${op.name}」= ${op.fn}(${op.column}) = ${displayNumber(agg)}`,
      };
    }
    case "filter": {
      if (columnIndex === -1) return { table, note: `没有列「${op.column}」` };
      const keep = (cell: string) => {
        const numericCell = NUMERIC.test(cell.trim()) ? Number(cell.trim()) : null;
        const numericValue = NUMERIC.test(op.value.trim()) ? Number(op.value.trim()) : null;
        switch (op.op) {
          case "eq":
            return cell.trim() === op.value.trim();
          case "ne":
            return cell.trim() !== op.value.trim();
          case "gt":
            return numericCell !== null && numericValue !== null && numericCell > numericValue;
          case "lt":
            return numericCell !== null && numericValue !== null && numericCell < numericValue;
          case "contains":
            return cell.includes(op.value);
        }
      };
      const rows = table.rows.filter((row) => keep(row[columnIndex] ?? ""));
      return {
        table: { ...table, rows },
        note: `筛选 ${op.column}（${op.op} ${op.value}）：${rows.length}/${table.rows.length} 行`,
      };
    }
    case "sort": {
      if (columnIndex === -1) return { table, note: `没有列「${op.column}」` };
      const rows = [...table.rows].sort((a, b) => {
        const av = a[columnIndex] ?? "";
        const bv = b[columnIndex] ?? "";
        const an = NUMERIC.test(av.trim()) ? Number(av.trim()) : null;
        const bn = NUMERIC.test(bv.trim()) ? Number(bv.trim()) : null;
        const cmp =
          an !== null && bn !== null ? an - bn : av.localeCompare(bv, "zh-CN");
        return op.direction === "asc" ? cmp : -cmp;
      });
      return { table: { ...table, rows }, note: `按 ${op.column} ${op.direction === "asc" ? "升序" : "降序"}排序` };
    }
    case "delete_column": {
      if (columnIndex === -1) return { table, note: `没有列「${op.column}」` };
      return {
        table: {
          columns: table.columns.filter((_, i) => i !== columnIndex),
          rows: table.rows.map((row) => row.filter((_, i) => i !== columnIndex)),
        },
        note: `已删除列「${op.column}」`,
      };
    }
  }
}

// ==================== NL command → operation ====================

/** Compact schema summary so the LLM knows the columns and shape. */
export function tableSummary(table: SheetTable, sampleRows = 3): string {
  const sample = table.rows
    .slice(0, sampleRows)
    .map((row) => row.map((cell) => cell.slice(0, 12)).join(" | "))
    .join("\n");
  return `列：${table.columns.join("、")}\n共 ${table.rows.length} 行\n示例：\n${sample}`;
}

export function buildCommandMessages(table: SheetTable, command: string) {
  return [
    {
      role: "system" as const,
      content:
        "你是表格操作助手。把用户指令映射为恰好一个 JSON 操作，不要解释。可选操作：\n" +
        '{"type":"add_formula_column","name":"新列名","fn":"SUM|AVG|COUNT|MIN|MAX","column":"列名"}\n' +
        '{"type":"filter","column":"列名","op":"eq|ne|gt|lt|contains","value":"值"}\n' +
        '{"type":"sort","column":"列名","direction":"asc|desc"}\n' +
        '{"type":"delete_column","column":"列名"}\n' +
        "只能使用已存在的列名。",
    },
    { role: "user" as const, content: `${tableSummary(table)}\n\n指令：${command}` },
  ];
}

export function parseOperation(raw: string): TableOperation {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("模型未返回有效的操作 JSON");
  const parsed = JSON.parse(raw.slice(start, end + 1)) as TableOperation;
  if (!parsed || typeof parsed.type !== "string") {
    throw new Error("操作缺少 type 字段");
  }
  return parsed;
}

export async function runCommand(
  table: SheetTable,
  command: string,
  model?: string,
): Promise<{ table: SheetTable; note: string }> {
  const reply = await chatService.chat({
    messages: buildCommandMessages(table, command),
    model,
    temperature: 0.2,
  });
  const op = parseOperation(reply.content);
  return applyOperation(table, op);
}

// ==================== Export ====================

export function toCsv(table: SheetTable): string {
  const escape = (cell: string) =>
    /[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
  return [table.columns, ...table.rows]
    .map((row) => row.map(escape).join(","))
    .join("\n");
}

export function exportXlsx(table: SheetTable, filename: string): void {
  const worksheet = XLSX.utils.aoa_to_sheet([table.columns, ...table.rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

export function exportCsvFile(table: SheetTable, filename: string): void {
  const blob = new Blob(["﻿" + toCsv(table)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
