import { useState, type KeyboardEvent } from "react";
import { Send, Loader2 } from "lucide-react";

type QuickInputProps = {
  onSubmit: (message: string) => void;
  disabled?: boolean;
};

export default function QuickInput({ onSubmit, disabled }: QuickInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) {
      return;
    }
    onSubmit(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="floating-quick-input">
      <textarea
        className="floating-quick-input-textarea"
        placeholder="输入消息..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={2}
      />
      <button
        className="floating-quick-input-send"
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        aria-label="发送"
      >
        {disabled ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Send size={16} />
        )}
      </button>
    </div>
  );
}
