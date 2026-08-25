/**
 * Tests for the image workspace page (TOOL-01): the three-mode switch, per
 * mode input gating, the 垫图/局部重绘 multipart flows through
 * imageService.edit, candidate actions, and the prompt history dropdown.
 *
 * The Konva mask editor is mocked (jsdom has no canvas); its export contract
 * is covered by utils/imageMask.test.ts.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ImageGenPage from "./ImageGenPage";

const mockedGenerate = vi.fn();
const mockedEdit = vi.fn();

vi.mock("@/services/api/engine", () => ({
  AUTO_MODEL: "__auto__",
  engineService: {
    listModels: vi.fn().mockResolvedValue([
      { id: "mock/image", capability: "image_gen" },
      { id: "mock/edit", capability: "image_edit" },
    ]),
  },
}));

vi.mock("@/services/api/image", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api/image")>();
  return {
    ...actual,
    imageService: {
      generate: (...args: unknown[]) => mockedGenerate(...args),
      edit: (...args: unknown[]) => mockedEdit(...args),
    },
  };
});

vi.mock("@/services/api/assets", () => ({
  recordImageAssets: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/components/onboarding/FirstRunGuide", () => ({
  FirstOutputDialog: () => null,
}));

vi.mock("@/components/onboarding/firstRunCases", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/components/onboarding/firstRunCases")
  >();
  return {
    ...actual,
    hasFirstOutput: () => true,
    markFirstOutput: vi.fn(),
  };
});

vi.mock("@/components/creation/MaskEditor", async () => {
  const React = await import("react");
  return {
    default: React.forwardRef(function MockMaskEditor(_props, ref) {
      React.useImperativeHandle(
        ref,
        () => ({
          exportMask: async () => new Blob(["painted-mask"], { type: "image/png" }),
          hasMask: () => true,
          naturalSize: () => ({ width: 8, height: 8 }),
        }),
        [],
      );
      return React.createElement("div", {
        "data-testid": "mask-editor",
      });
    }),
  };
});

/** antd Upload renders a native file input; drive it directly. */
function pickFile(files: File[]) {
  const input = document.querySelector<HTMLInputElement>(
    'input[type="file"]',
  );
  expect(input).toBeTruthy();
  Object.defineProperty(input!, "files", { value: files });
  fireEvent.change(input!);
}

const pngFile = (name = "ref.png") =>
  new File(["fake-image"], name, { type: "image/png" });

/** Segmented options are radio-backed labels: clicking the label switches. */
function switchMode(label: string) {
  fireEvent.click(screen.getByTitle(label));
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ImageGenPage />
    </MemoryRouter>,
  );
}

describe("ImageGenPage (TOOL-01)", () => {
  it("offers the three modes and gates 文生图 on a prompt", async () => {
    renderPage();
    const modeSelect = await screen.findByLabelText("生成模式");
    expect(modeSelect).toBeInTheDocument();

    const button = screen.getByLabelText("生成图片");
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText("图像描述"), {
      target: { value: "一只橘猫" },
    });
    await waitFor(() => expect(button).not.toBeDisabled());
  });

  it("垫图 mode requires a reference image before generating", async () => {
    renderPage();
    await switchMode("垫图");
    fireEvent.change(screen.getByLabelText("图像描述"), {
      target: { value: "改成夜景" },
    });
    const button = screen.getByLabelText("生成图片");
    await waitFor(() => expect(button).toBeDisabled());
    expect(screen.getByText(/上传参考图保持主体一致/)).toBeInTheDocument();

    pickFile([pngFile()]);
    await waitFor(() => expect(button).not.toBeDisabled());
  });

  it("局部重绘 mode requires a base image and sends the painted mask", async () => {
    renderPage();
    await switchMode("局部重绘");
    fireEvent.change(screen.getByLabelText("图像描述"), {
      target: { value: "把手里的杯子换成咖啡" },
    });
    const button = screen.getByLabelText("生成图片");
    await waitFor(() => expect(button).toBeDisabled());

    pickFile([pngFile("base.png")]);
    await waitFor(() => expect(button).not.toBeDisabled());

    mockedEdit.mockResolvedValueOnce({
      created: 1,
      data: [{ b64_json: "QUJD" }],
      images: ["data:image/png;base64,QUJD"],
      model_used: "mock/edit",
      masked: true,
    });
    fireEvent.click(button);
    await waitFor(() => expect(mockedEdit).toHaveBeenCalledTimes(1));
    const request = mockedEdit.mock.calls[0][0];
    expect(request.prompt).toBe("把手里的杯子换成咖啡");
    expect(request.images).toHaveLength(1);
    // The mocked editor's export: the painted mask blob rides along.
    expect(await request.mask.text()).toBe("painted-mask");
    expect(await screen.findByAltText("候选 1")).toBeInTheDocument();
  });

  it("candidates offer 重绘此图 which re-enters inpaint with that image", async () => {
    mockedEdit.mockResolvedValueOnce({
      created: 1,
      data: [{ b64_json: "QUJD" }],
      images: ["data:image/png;base64,QUJD"],
      model_used: "mock/edit",
    });
    renderPage();
    await switchMode("垫图");
    fireEvent.change(screen.getByLabelText("图像描述"), {
      target: { value: "改成夜景" },
    });
    pickFile([pngFile()]);
    const button = screen.getByLabelText("生成图片");
    await waitFor(() => expect(button).not.toBeDisabled());
    fireEvent.click(button);

    const repaint = await screen.findByLabelText("重绘候选 1");
    fireEvent.click(repaint);
    expect(await screen.findByTestId("mask-editor")).toBeInTheDocument();
  });

  it("seeds the prompt history dropdown from saved entries", async () => {
    localStorage.setItem(
      "mofa-studio-image-history",
      JSON.stringify([
        {
          id: "img-1",
          prompt: "一只橘猫坐在窗台上",
          n: 1,
          size: "1024x1024",
          created_at: new Date().toISOString(),
          images: ["data:image/png;base64,QUJD"],
          mode: "t2i",
        },
      ]),
    );
    renderPage();
    const historySelect = await screen.findByLabelText("提示词历史");
    expect(historySelect).toBeInTheDocument();
    fireEvent.mouseDown(historySelect);
    // The option (scoped by role — the same prompt also sits in the history list).
    expect(
      await screen.findByRole("option", { name: /一只橘猫坐在窗台上/ }),
    ).toBeInTheDocument();
  });

  it("restore replays a saved 垫图 run including its reference", async () => {
    localStorage.setItem(
      "mofa-studio-image-history",
      JSON.stringify([
        {
          id: "img-2",
          prompt: "保持角色一致的改图",
          n: 1,
          size: "1024x1024",
          created_at: new Date().toISOString(),
          images: ["data:image/png;base64,QUJD"],
          mode: "i2i",
          refs: ["data:image/png;base64,QUJD"],
        },
      ]),
    );
    renderPage();
    const entry = await screen.findByText("保持角色一致的改图");
    fireEvent.click(entry);
    // Mode + the reference came back; generate is ready without a new upload.
    await waitFor(() => expect(screen.getByLabelText("生成图片")).not.toBeDisabled());
  });
});
