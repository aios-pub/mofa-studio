/**
 * Tests for the AI spreadsheet service (TOOL-08): CSV parsing, aggregate
 * formulas, the four table operations, NL-command parsing, and export.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../api/apiClient";
import {
  applyOperation,
  buildCommandMessages,
  displayNumber,
  evaluateAggregate,
  numericColumn,
  parseCsv,
  parseOperation,
  runCommand,
  tableSummary,
  toCsv,
  type SheetTable,
} from "./sheets";

vi.mock("../api/apiClient", () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

const mockedPost = vi.mocked(apiClient.post);

const TABLE: SheetTable = {
  columns: ["商品", "销量", "单价"],
  rows: [
    ["橘猫抱枕", "120", "39"],
    ["猫爪杯", "80", "25"],
    ["逗猫棒", "240", "9.5"],
  ],
};

beforeEach(() => {
  mockedPost.mockReset();
});

describe("parseCsv", () => {
  it("parses headers, quoted fields, and embedded separators", () => {
    const table = parseCsv('名称,备注\n"橘猫,橘色","说""可爱"""\n抱枕,无');
    expect(table.columns).toEqual(["名称", "备注"]);
    expect(table.rows).toEqual([
      ["橘猫,橘色", '说"可爱"'],
      ["抱枕", "无"],
    ]);
  });

  it("pads ragged rows and drops blank lines", () => {
    const table = parseCsv("a,b,c\n1,2\n\n3,4,5");
    expect(table.rows).toEqual([["1", "2", ""], ["3", "4", "5"]]);
  });

  it("empty input yields an empty table", () => {
    expect(parseCsv("\n \n")).toEqual({ columns: [], rows: [] });
  });
});

describe("aggregate formulas (公式结果一致性)", () => {
  it("SUM/AVG/COUNT/MIN/MAX over numeric cells only", () => {
    expect(evaluateAggregate(TABLE, "SUM", "销量")).toBe(440);
    expect(evaluateAggregate(TABLE, "AVG", "销量")).toBeCloseTo(146.67, 1);
    expect(evaluateAggregate(TABLE, "COUNT", "商品")).toBe(3);
    expect(evaluateAggregate(TABLE, "MIN", "单价")).toBe(9.5);
    expect(evaluateAggregate(TABLE, "MAX", "单价")).toBe(39);
  });

  it("numericColumn ignores non-numeric cells", () => {
    const mixed: SheetTable = { columns: ["x"], rows: [["1"], ["abc"], ["3"]] };
    expect(numericColumn(mixed, "x")).toEqual([1, 3]);
    expect(evaluateAggregate(mixed, "SUM", "x")).toBe(4);
  });

  it("missing columns yield null", () => {
    expect(evaluateAggregate(TABLE, "SUM", "不存在")).toBeNull();
  });

  it("displayNumber keeps integers clean", () => {
    expect(displayNumber(440)).toBe("440");
    expect(displayNumber(146.666666)).toBe("146.67");
  });
});

describe("applyOperation", () => {
  it("add_formula_column appends the aggregate to every row", () => {
    const { table, note } = applyOperation(TABLE, {
      type: "add_formula_column",
      name: "总销量",
      fn: "SUM",
      column: "销量",
    });
    expect(table.columns).toEqual(["商品", "销量", "单价", "总销量"]);
    expect(table.rows[0][3]).toBe("440");
    expect(note).toContain("总销量");
    expect(note).toContain("440");
  });

  it("add_formula_column on a text column reports honestly", () => {
    const { table, note } = applyOperation(TABLE, {
      type: "add_formula_column",
      name: "x",
      fn: "SUM",
      column: "商品",
    });
    expect(table).toBe(TABLE);
    expect(note).toContain("没有可计算的数值");
  });

  it("filter keeps matching rows numerically or lexically", () => {
    const numeric = applyOperation(TABLE, {
      type: "filter",
      column: "销量",
      op: "gt",
      value: "100",
    });
    expect(numeric.table.rows).toHaveLength(2);
    expect(numeric.note).toContain("2/3");

    const contains = applyOperation(TABLE, {
      type: "filter",
      column: "商品",
      op: "contains",
      value: "猫",
    });
    expect(contains.table.rows).toHaveLength(3);
  });

  it("sort orders numerically when possible", () => {
    const { table } = applyOperation(TABLE, {
      type: "sort",
      column: "销量",
      direction: "desc",
    });
    expect(table.rows.map((r) => r[0])).toEqual(["逗猫棒", "橘猫抱枕", "猫爪杯"]);
  });

  it("delete_column removes it everywhere", () => {
    const { table } = applyOperation(TABLE, {
      type: "delete_column",
      column: "单价",
    });
    expect(table.columns).toEqual(["商品", "销量"]);
    expect(table.rows[0]).toEqual(["橘猫抱枕", "120"]);
  });

  it("unknown columns are rejected with notes", () => {
    const { note } = applyOperation(TABLE, { type: "sort", column: "无", direction: "asc" });
    expect(note).toContain("没有列");
  });
});

describe("NL command mapping", () => {
  it("tableSummary carries columns, shape, and samples", () => {
    const summary = tableSummary(TABLE);
    expect(summary).toContain("商品、销量、单价");
    expect(summary).toContain("共 3 行");
  });

  it("buildCommandMessages pins the operation schema", () => {
    const messages = buildCommandMessages(TABLE, "按销量降序");
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("add_formula_column");
    expect(messages[1].content).toContain("按销量降序");
  });

  it("parseOperation extracts fenced or bare JSON", () => {
    expect(parseOperation('```json\n{"type":"sort","column":"销量","direction":"asc"}\n```')).toEqual({
      type: "sort",
      column: "销量",
      direction: "asc",
    });
    expect(() => parseOperation("无 JSON")).toThrow("JSON");
    expect(() => parseOperation('{"no_type": 1}')).toThrow("type");
  });

  it("runCommand maps the LLM reply through applyOperation", async () => {
    mockedPost.mockResolvedValueOnce({
      id: "chat-1",
      content: '{"type":"filter","column":"销量","op":"gt","value":"100"}',
      finishReason: "stop",
    });
    const { table, note } = await runCommand(TABLE, "只要销量大于100的");
    expect(table.rows).toHaveLength(2);
    expect(note).toContain("2/3");
  });
});

describe("toCsv export", () => {
  it("escapes separators and quotes", () => {
    const csv = toCsv({ columns: ["a", "b"], rows: [['x,y', 'he said "hi"']] });
    expect(csv).toBe('a,b\n"x,y","he said ""hi"""');
  });
});
