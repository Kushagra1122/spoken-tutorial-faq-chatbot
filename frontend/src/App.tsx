import { useCallback, useEffect, useState } from "react";
import { sendChatMessage } from "./api";
import { ChangeContentPanel } from "./components/ChangeContentPanel";
import { Chat } from "./components/Chat";
import { Composer } from "./components/Composer";
import { Footer } from "./components/Footer";
import { GoogleAuthModal } from "./components/GoogleAuthModal";
import { Header } from "./components/Header";
import { useAuth } from "./contexts/AuthContext";
import { useBackendConnection } from "./hooks/useBackendConnection";
import { useSpeechPlayback } from "./hooks/useSpeechPlayback";
import type { ChatHistoryItem, ChatMessage } from "./types";
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
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showContentPanel, setShowContentPanel] = useState(false);
  const { connected, voiceEnabled, checking, refresh } = useBackendConnection();
  const { playingId, loadingId, speak } = useSpeechPlayback();
  const {
    isAuthenticated,
    loading: authLoading,
    login,
    logout,
    user,
    markPendingChangeContent,
    consumePendingChangeContent,
  } = useAuth();

  useEffect(() => {
    if (!authLoading && isAuthenticated && consumePendingChangeContent()) {
      setShowContentPanel(true);
    }
  }, [authLoading, isAuthenticated, consumePendingChangeContent]);

  const handleChangeContent = useCallback(() => {
    if (isAuthenticated) {
      setShowContentPanel(true);
      return;
    }
    markPendingChangeContent();
    setShowAuthModal(true);
  }, [isAuthenticated, markPendingChangeContent]);

  const handleContinueWithGoogle = useCallback(() => {
    setShowAuthModal(false);
    login("/");
  }, [login]);

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
        void refresh();
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
        void refresh();
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
    [loading, refresh],
  );

  const hasConversation = messages.length > 0;
  const micReady = connected && voiceEnabled;

  return (
    <div className="shell">
      <div className="app">
        <Header
          connected={connected}
          checking={checking}
          onRetry={refresh}
          onChangeContent={handleChangeContent}
          isAuthenticated={isAuthenticated}
          userEmail={user?.email}
          onLogout={() => void logout()}
        />
        {!connected && (
          <div className="app__offline-banner" role="alert">
            <strong>Backend offline.</strong> Start the server in another terminal:{" "}
            <code>
              cd backend && source .venv/bin/activate && uvicorn main:app --reload
              --port 8000
            </code>
          </div>
        )}
        <div className="app__body">
          <Chat
            messages={messages}
            voiceEnabled={micReady}
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
            disabled={loading || !connected}
            voiceEnabled={voiceEnabled}
            connected={connected}
          />
        </div>
        <Footer />
      </div>

      <GoogleAuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onContinue={handleContinueWithGoogle}
      />
      <ChangeContentPanel
        open={showContentPanel}
        onClose={() => setShowContentPanel(false)}
      />
    </div>
  );
}
