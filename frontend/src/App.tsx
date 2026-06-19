import { useCallback, useEffect, useState } from "react";
import { API_BASE, sendChatMessage } from "./api";
import { Chat } from "./components/Chat";
import { Composer } from "./components/Composer";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { useSpeechPlayback } from "./hooks/useSpeechPlayback";
import type { ChatHistoryItem, ChatMessage } from "./types";
import { fetchVoiceStatus } from "./voice";
import "./App.css";

let messageId = 0;
function nextId() {
  messageId += 1;
  return String(messageId);
}

function toApiHistory(messages: ChatMessage[]): ChatHistoryItem[] {
  return messages
    .filter((m) => !m.loading && !m.error)
    .map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    }));
}

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const { playingId, loadingId, speak } = useSpeechPlayback();

  useEffect(() => {
    fetch(`${API_BASE}/api/health`)
      .then((r) => setConnected(r.ok))
      .catch(() => setConnected(false));
    fetchVoiceStatus().then((s) => setVoiceEnabled(s.enabled));
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMessage: ChatMessage = {
        id: nextId(),
        role: "user",
        content: trimmed,
      };

      const loadingMessage: ChatMessage = {
        id: nextId(),
        role: "bot",
        content: "",
        loading: true,
      };

      let historyForApi: ChatHistoryItem[] = [];
      setMessages((prev) => {
        historyForApi = toApiHistory(prev);
        return [...prev, userMessage, loadingMessage];
      });
      setLoading(true);

      try {
        const data = await sendChatMessage(trimmed, historyForApi);
        setConnected(true);
        setMessages((prev) => {
          const withoutLoading = prev.filter((m) => m.id !== loadingMessage.id);
          return [
            ...withoutLoading,
            {
              id: nextId(),
              role: "bot",
              content: data.answer,
              confidence: data.confidence,
              category: data.category,
              sources: data.sources,
            },
          ];
        });
      } catch (err) {
        setConnected(false);
        const message =
          err instanceof Error
            ? err.message
            : "Unable to reach the assistant. Please ensure the backend server is running.";
        setMessages((prev) => {
          const withoutLoading = prev.filter((m) => m.id !== loadingMessage.id);
          return [
            ...withoutLoading,
            {
              id: nextId(),
              role: "bot",
              content: message,
              error: true,
            },
          ];
        });
      } finally {
        setLoading(false);
      }
    },
    [loading],
  );

  const hasConversation = messages.length > 0;

  return (
    <div className="shell">
      <div className="app">
        <Header connected={connected} />
        <div className="app__body">
          <Chat
            messages={messages}
            voiceEnabled={voiceEnabled}
            playingId={playingId}
            speechLoadingId={loadingId}
            onSpeak={speak}
          />
        </div>
        <div className="app__composer">
          {hasConversation && (
            <p className="app__composer-label">Continue the conversation</p>
          )}
          <Composer
            onSend={sendMessage}
            disabled={loading}
            voiceEnabled={voiceEnabled}
          />
        </div>
        <Footer />
      </div>
    </div>
  );
}
