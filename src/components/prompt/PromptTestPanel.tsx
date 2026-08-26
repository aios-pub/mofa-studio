import { useTranslation } from "react-i18next";
/**
 * Prompt test panel component
 */

import { useState, useEffect, useCallback } from "react";
import {
  PlayCircleOutlined,
  SendOutlined,
  NumberOutlined,
  EyeOutlined,
  SyncOutlined,
  CopyOutlined,
  CheckOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import type { Prompt, PromptVariable } from "@/services";
import { promptApi } from "@/services";

interface PromptTestPanelProps {
  prompt: Prompt;
  content: string;
  variables: PromptVariable[];
}

export default function PromptTestPanel({
  prompt,
  content,
  variables,
}: PromptTestPanelProps) {  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<"preview" | "chat">("preview");
  const [variableValues, setVariableValues] = useState<Record<string, string>>(
    {},
  );
  const [previewContent, setPreviewContent] = useState("");
  const [tokenInfo, setTokenInfo] = useState({ input: 0, estimated: 0 });
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Initialize variable values
    const initialValues: Record<string, string> = {};
    variables.forEach((v) => {
      initialValues[v.name] = v.defaultValue || "";
    });
    setVariableValues(initialValues);
  }, [variables]);

  const updatePreview = useCallback(() => {
    const result = promptApi.replaceVariables(
      content,
      variables,
      variableValues,
    );
    setPreviewContent(result);
    setTokenInfo(promptApi.estimateTokens(result));
  }, [content, variables, variableValues]);

  useEffect(() => {
    updatePreview();
  }, [updatePreview]);

  const handleVariableChange = (name: string, value: string) => {
    setVariableValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(previewContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendChat = async () => {
    if (!userInput.trim() || isLoading) return;

    const userMessage = userInput.trim();
    setUserInput("");
    setChatMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage },
    ]);
    setIsLoading(true);

    try {
      const response = await promptApi.simulateChat(
        prompt.id,
        userMessage,
        variableValues,
      );
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: response },
      ]);
    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: t("抱歉，发生了错误，请稍后重试。") },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendChat();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tabs bar */}
      <div className="flex border-b border-(--color-border)">
        <button
          onClick={() => setActiveTab("preview")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "preview"
              ? "text-[var(--color-primary)] border-(--color-primary)"
              : "text-[var(--color-text-secondary)] border-transparent hover:text-[var(--color-text-primary)]"
          }`}
        >
          <EyeOutlined />
          实时预览
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "chat"
              ? "text-[var(--color-primary)] border-(--color-primary)"
              : "text-[var(--color-text-secondary)] border-transparent hover:text-[var(--color-text-primary)]"
          }`}
        >
          <PlayCircleOutlined />
          模拟对话
        </button>
      </div>

      {/* Variable input area */}
      {variables.length > 0 && (
        <div className="p-3 border-b border-(--color-border) bg-[var(--color-bg-secondary)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">
              变量值
            </span>
            <button
              onClick={updatePreview}
              className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline"
            >
              <SyncOutlined className="text-xs" />
              刷新预览
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {variables.map((variable) => (
              <div key={variable.name}>
                <label className="block text-xs text-[var(--color-text-tertiary)] mb-1">
                  {`{{${variable.name}}}`}
                  {variable.required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </label>
                {variable.type === "enum" && variable.options ? (
                  <select
                    value={variableValues[variable.name] || ""}
                    onChange={(e) =>
                      handleVariableChange(variable.name, e.target.value)
                    }
                    className="w-full px-2 py-1.5 text-sm bg-[var(--color-bg-base)] border border-(--color-border) rounded focus:outline-none focus:border-(--color-primary) text-[var(--color-text-primary)]"
                  >
                    {variable.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : variable.type === "date" ? (
                  <input
                    type="date"
                    value={variableValues[variable.name] || ""}
                    onChange={(e) =>
                      handleVariableChange(variable.name, e.target.value)
                    }
                    className="w-full px-2 py-1.5 text-sm bg-[var(--color-bg-base)] border border-(--color-border) rounded focus:outline-none focus:border-(--color-primary) text-[var(--color-text-primary)]"
                  />
                ) : (
                  <input
                    type={variable.type === "number" ? "number" : "text"}
                    value={variableValues[variable.name] || ""}
                    onChange={(e) =>
                      handleVariableChange(variable.name, e.target.value)
                    }
                    placeholder={variable.defaultValue}
                    className="w-full px-2 py-1.5 text-sm bg-[var(--color-bg-base)] border border-(--color-border) rounded focus:outline-none focus:border-(--color-primary) text-[var(--color-text-primary)]"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "preview" ? (
          <div className="h-full flex flex-col">
            {/* Token statistics */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-(--color-border) bg-[var(--color-bg-secondary)]">
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <NumberOutlined className="text-sm text-[var(--color-text-tertiary)]" />
                  <span className="text-[var(--color-text-secondary)]">
                    字符数:{" "}
                    <span className="text-[var(--color-text-primary)]">
                      {tokenInfo.input}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[var(--color-text-secondary)]">
                    预估 Token:{" "}
                    <span className="text-[var(--color-text-primary)] font-medium">
                      {tokenInfo.estimated}
                    </span>
                  </span>
                </div>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                {copied ? (
                  <>
                    <CheckOutlined className="text-sm text-green-500" />
                    <span className="text-green-500">{t("已复制")}</span>
                  </>
                ) : (
                  <>
                    <CopyOutlined className="text-sm" />
                    <span>{t("复制")}</span>
                  </>
                )}
              </button>
            </div>

            {/* Preview content */}
            <div className="flex-1 overflow-y-auto p-4">
              <pre className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap font-mono">
                {previewContent || "（提示词内容为空）"}
              </pre>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-tertiary)]">
                  <PlayCircleOutlined className="text-3xl mb-2 opacity-50" />
                  <p>{t("输入消息开始模拟对话")}</p>
                  <p className="text-xs mt-1">{t("将使用当前提示词作为系统提示")}</p>
                </div>
              ) : (
                chatMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-lg ${
                        msg.role === "user"
                          ? "bg-[var(--color-primary)] text-white"
                          : "bg-[var(--color-bg-secondary)] border border-(--color-border) text-[var(--color-text-primary)]"
                      }`}
                    >
                      <pre className="text-sm whitespace-pre-wrap font-sans">
                        {msg.content}
                      </pre>
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-[var(--color-bg-secondary)] border border-(--color-border) px-3 py-2 rounded-lg">
                    <LoadingOutlined
                      className="text-[var(--color-primary)]"
                      spin
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="p-3 border-t border-(--color-border) bg-[var(--color-bg-secondary)]">
              <div className="flex gap-2">
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t("输入消息测试提示词效果... (Enter 发送)")}
                  rows={2}
                  className="flex-1 px-3 py-2 text-sm bg-[var(--color-bg-base)] border border-(--color-border) rounded-lg resize-none focus:outline-none focus:border-(--color-primary) text-[var(--color-text-primary)]"
                />
                <button
                  onClick={handleSendChat}
                  disabled={!userInput.trim() || isLoading}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed self-end"
                >
                  <SendOutlined />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
