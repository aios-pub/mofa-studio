/**
 * Tests for the PLAT-05 budget card: state rendering, ceiling save round
 * trip, and honest spend display.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import BudgetCard from "./BudgetCard";
import { spendRatio } from "@/services/api/budget";

const mockedGet = vi.fn();
const mockedSave = vi.fn();

vi.mock("antd", async (importOriginal) => {
  const antd = await importOriginal<typeof import("antd")>();
  return { ...antd, message: { ...antd.message, success: vi.fn(), error: vi.fn() } };
});

vi.mock("@/services/api/budget", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api/budget")>();
  return {
    ...actual,
    budgetService: {
      get: (...args: unknown[]) => mockedGet(...args),
      save: (...args: unknown[]) => mockedSave(...args),
    },
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

function state(overrides: Record<string, unknown>) {
  return {
    enabled: false,
    monthly_limit_usd: 0,
    spent_usd: 0,
    month: "2026-08",
    ...overrides,
  };
}

describe("BudgetCard (PLAT-05)", () => {
  it("shows the uncapped hint when disabled", async () => {
    mockedGet.mockResolvedValue(state({}));
    render(<BudgetCard />);
    expect(await screen.findByText(/未启用限额/)).toBeInTheDocument();
  });

  it("renders spend against the ceiling with the ratio-driven bar", async () => {
    mockedGet.mockResolvedValue(
      state({ enabled: true, monthly_limit_usd: 10, spent_usd: 8.5 }),
    );
    render(<BudgetCard />);
    const spendLine = await screen.findByLabelText("预算用量文本");
    expect(spendLine.textContent).toContain("已用 $8.50 / $10.00");
    expect(spendLine.textContent).toContain("2026-08");
    // 85% consumed → the progress bar carries 85.
    expect(screen.getByLabelText("本月用量进度")).toHaveAttribute(
      "aria-valuenow",
      "85",
    );
  });

  it("saving a ceiling persists via the service", async () => {
    mockedGet.mockResolvedValue(state({ enabled: false, monthly_limit_usd: 0 }));
    mockedSave.mockResolvedValue(true);
    render(<BudgetCard />);
    await screen.findByText(/未启用限额/);

    const limitInput = screen.getByLabelText("月度预算上限");
    fireEvent.focus(limitInput);
    fireEvent.change(limitInput, { target: { value: "25" } });
    fireEvent.blur(limitInput);
    fireEvent.click(screen.getByRole("button", { name: /保 ?存/ }));
    await waitFor(() => expect(mockedSave).toHaveBeenCalled());
    expect(mockedSave).toHaveBeenLastCalledWith(false, 25);

    // Flipping the switch enables with the same ceiling.
    fireEvent.click(screen.getByLabelText("预算开关"));
    await waitFor(() =>
      expect(mockedSave).toHaveBeenLastCalledWith(true, 25),
    );
  });

  it("reports save failures without crashing", async () => {
    mockedGet.mockResolvedValue(state({}));
    mockedSave.mockResolvedValue(false);
    render(<BudgetCard />);
    await screen.findByText(/未启用限额/);
    fireEvent.click(screen.getByRole("button", { name: /保 ?存/ }));
    await waitFor(() => expect(mockedSave).toHaveBeenCalled());
    expect(await screen.findByText(/未启用限额/)).toBeInTheDocument();
  });
});

describe("spendRatio", () => {
  it("clamps and guards degenerate ceilings", () => {
    expect(
      spendRatio(state({ enabled: true, monthly_limit_usd: 10, spent_usd: 30 })),
    ).toBe(1);
    expect(spendRatio(state({ enabled: true, monthly_limit_usd: 0, spent_usd: 5 }))).toBe(0);
    expect(spendRatio(state({ enabled: false, monthly_limit_usd: 10, spent_usd: 5 }))).toBe(0);
  });
});
