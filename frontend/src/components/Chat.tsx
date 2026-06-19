import { useEffect, useRef } from "react";
import type { ChatMessage } from "../types";
import { MessageBubble } from "./MessageBubble";

interface ChatProps {
  messages: ChatMessage[];
  voiceEnabled?: boolean;
  playingId?: string | null;
  speechLoadingId?: string | null;
  onSpeak?: (messageId: string, text: string) => void;
}

export function Chat({
  messages,
  voiceEnabled,
  playingId,
  speechLoadingId,
  onSpeak,
}: ChatProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isEmpty = messages.length === 0;

  return (
    <main className="chat-panel" aria-live="polite">
      <div className="chat-panel__scroll">
        {isEmpty ? (
          <p className="chat-panel__welcome">
            Welcome. Ask a question about Master Batch, online tests, certificates,
            or technical support.
            {voiceEnabled && " You can type or use the microphone."}
          </p>
        ) : (
          <div className="chat-panel__messages">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                voiceEnabled={voiceEnabled && msg.role === "bot" && !msg.loading && !msg.error}
                isSpeaking={playingId === msg.id}
                isSpeechLoading={speechLoadingId === msg.id}
                onSpeak={
                  onSpeak && msg.role === "bot" && !msg.loading && !msg.error
                    ? () => onSpeak(msg.id, msg.content)
                    : undefined
                }
              />
            ))}
          </div>
        )}
        <div ref={bottomRef} className="chat-panel__anchor" />
      </div>
    </main>
  );
}
