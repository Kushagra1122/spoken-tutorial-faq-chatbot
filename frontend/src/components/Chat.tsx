import { useEffect, useRef } from "react";
import type { ChatMessage } from "../types";
import { MessageBubble } from "./MessageBubble";

interface ChatProps {
  messages: ChatMessage[];
}

export function Chat({ messages }: ChatProps) {
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
          </p>
        ) : (
          <div className="chat-panel__messages">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </div>
        )}
        <div ref={bottomRef} className="chat-panel__anchor" />
      </div>
    </main>
  );
}
