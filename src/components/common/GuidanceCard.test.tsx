/**
 * Tests for the guidance card (ONBOARD-04 UI): inline rendering, action
 * navigation, and permanent dismissal.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, beforeEach } from "vitest";
import GuidanceCard from "./GuidanceCard";
import { GUIDANCES, isDismissed } from "@/utils/progressiveDisclosure";

beforeEach(() => {
  localStorage.clear();
});

describe("GuidanceCard", () => {
  it("renders inline with stage tag, body, and action", () => {
    render(
      <MemoryRouter>
        <GuidanceCard guidance={GUIDANCES["search-unconfigured-connector"]} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("连接器")).toBeInTheDocument();
    expect(screen.getByText(/联网搜索需要一个搜索源/)).toBeInTheDocument();
    expect(screen.getByLabelText("去配置搜索")).toBeInTheDocument();
  });

  it("permanent dismiss hides the card and persists", () => {
    render(
      <MemoryRouter>
        <GuidanceCard guidance={GUIDANCES["first-output-skill"]} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByLabelText("永久关闭此引导"));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(isDismissed("first-output-skill")).toBe(true);
  });
});
