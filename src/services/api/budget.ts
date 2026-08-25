/**
 * Budget service (PLAT-05 配额与余额): monthly USD ceiling over the
 * gateway's engine-reported spend. Enforcement happens server-side; this is
 * the settings/read surface.
 */

import { apiClient } from "../api/apiClient";

export interface BudgetState {
  enabled: boolean;
  monthly_limit_usd: number;
  spent_usd: number;
  month: string;
}

export class BudgetService {
  async get(): Promise<BudgetState> {
    try {
      const data = await apiClient.get<{ data?: BudgetState }>("/api/budget");
      const d = data?.data;
      return {
        enabled: Boolean(d?.enabled),
        monthly_limit_usd: d?.monthly_limit_usd ?? 0,
        spent_usd: d?.spent_usd ?? 0,
        month: d?.month ?? "",
      };
    } catch {
      return { enabled: false, monthly_limit_usd: 0, spent_usd: 0, month: "" };
    }
  }

  async save(enabled: boolean, monthlyLimitUsd: number): Promise<boolean> {
    try {
      await apiClient.post("/api/budget", {
        enabled,
        monthly_limit_usd: monthlyLimitUsd,
      });
      return true;
    } catch {
      return false;
    }
  }
}

export const budgetService = new BudgetService();

/** Format spend for the card: honest about unpriced calls contributing $0. */
export function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

/** Spent share of the ceiling, clamped to [0, 1] for progress display. */
export function spendRatio(state: BudgetState): number {
  if (!state.enabled || state.monthly_limit_usd <= 0) return 0;
  return Math.min(1, state.spent_usd / state.monthly_limit_usd);
}
