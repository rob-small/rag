import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button, Text } from "@kui/react";
import { useChatStore } from "../../store/useChatStore";
import { useReasoningStore } from "../../store/useReasoningStore";
import { useStreamingStore } from "../../store/useStreamingStore";

/**
 * Floating window that shows the model's reasoning for an assistant message.
 * Stays open beside the chat and updates live while the response streams.
 */
export const ReasoningPanel = () => {
  const openMessageId = useReasoningStore((s) => s.openMessageId);
  const close = useReasoningStore((s) => s.close);
  const reasoning = useChatStore(
    (s) => s.messages.find((m) => m.id === openMessageId)?.reasoning ?? ""
  );
  const { isStreaming, streamingMessageId } = useStreamingStore();
  const bodyRef = useRef<HTMLDivElement>(null);

  const isLive = isStreaming && streamingMessageId === openMessageId;

  // Keep the newest reasoning in view while it streams
  useEffect(() => {
    const el = bodyRef.current;
    if (el && isLive) el.scrollTop = el.scrollHeight;
  }, [reasoning, isLive]);

  if (!openMessageId) return null;

  return (
    <div
      role="complementary"
      aria-label="Model reasoning"
      style={{
        position: "fixed",
        top: "64px",
        right: "16px",
        bottom: "16px",
        width: "min(420px, calc(100vw - 32px))",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        background: "#ffffff",
        color: "#1a1a1a",
        border: "1px solid #c8c8c8",
        borderRadius: "8px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          borderBottom: "1px solid #d9d9d9",
        }}
      >
        <Text kind="title/sm" style={{ color: "#1a1a1a" }}>
          Reasoning{isLive ? " (live)" : ""}
        </Text>
        <Button
          kind="tertiary"
          size="small"
          onClick={close}
          title="Close reasoning"
          style={{ color: "#1a1a1a" }}
        >
          <X size={16} />
        </Button>
      </div>
      <div
        ref={bodyRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontSize: "13px",
          lineHeight: 1.5,
        }}
      >
        {reasoning || (
          <Text kind="body/regular/sm" style={{ color: "#555555" }}>
            {isLive ? "Waiting for reasoning…" : "No reasoning was returned for this message."}
          </Text>
        )}
      </div>
    </div>
  );
};
