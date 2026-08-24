/**
 * Tests for ONBOARD-01: the first-launch welcome flow — three steps,
 * skip/finish persist the flag, and the flag gates a second showing.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import WelcomeFlow, {
  hasOnboarded,
  markOnboarded,
  ONBOARDED_FLAG,
} from "./WelcomeFlow";

describe("WelcomeFlow (ONBOARD-01)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("walks the three value screens in order", () => {
    render(<WelcomeFlow onFinish={() => {}} />);

    expect(screen.getByText("聊天即创作")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("下一步"));
    expect(screen.getByText("任务即交付")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("下一步"));
    expect(screen.getByText("工作流即产线")).toBeInTheDocument();
    // Last step offers 开始配置 instead of 下一步
    expect(screen.getByLabelText("开始配置")).toBeInTheDocument();
    expect(screen.queryByLabelText("下一步")).not.toBeInTheDocument();
  });

  it("skip finishes immediately and persists the flag", () => {
    const onFinish = vi.fn();
    render(<WelcomeFlow onFinish={onFinish} />);

    fireEvent.click(screen.getByLabelText("跳过引导"));
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(ONBOARDED_FLAG)).toBe("1");
    expect(hasOnboarded()).toBe(true);
  });

  it("finishing the third screen persists the flag", () => {
    const onFinish = vi.fn();
    render(<WelcomeFlow onFinish={onFinish} />);

    fireEvent.click(screen.getByLabelText("下一步"));
    fireEvent.click(screen.getByLabelText("下一步"));
    fireEvent.click(screen.getByLabelText("开始配置"));
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(hasOnboarded()).toBe(true);
  });

  it("back navigation works from step 2", () => {
    render(<WelcomeFlow onFinish={() => {}} />);
    fireEvent.click(screen.getByLabelText("下一步"));
    fireEvent.click(screen.getByLabelText("上一步"));
    expect(screen.getByText("聊天即创作")).toBeInTheDocument();
  });

  it("markOnboarded gates re-showing", () => {
    expect(hasOnboarded()).toBe(false);
    markOnboarded();
    expect(hasOnboarded()).toBe(true);
  });
});
