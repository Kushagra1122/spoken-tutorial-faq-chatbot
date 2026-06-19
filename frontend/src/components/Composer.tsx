import { useCallback, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useVoiceRecorder } from "../hooks/useVoiceRecorder";

interface ComposerProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  voiceEnabled?: boolean;
  connected?: boolean;
}

const MAX_LENGTH = 2000;

export function Composer({ onSend, disabled, voiceEnabled, connected }: ComposerProps) {
  const [input, setInput] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef(input);
  inputRef.current = input;

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  const submit = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleVoiceTextUpdate = useCallback(
    (text: string) => {
      setVoiceError(null);
      setInput(text.slice(0, MAX_LENGTH));
      resize();
    },
    [resize],
  );

  const getCurrentText = useCallback(() => inputRef.current, []);

  const { isRecording, isProcessing, toggleRecording } = useVoiceRecorder({
    onTextUpdate: handleVoiceTextUpdate,
    getCurrentText,
    onError: setVoiceError,
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const voiceBusy = isProcessing;
  const controlsDisabled = disabled || voiceBusy;
  const micReady = Boolean(connected && voiceEnabled);

  const micTitle = !connected
    ? "Backend offline — start server on port 8000"
    : !voiceEnabled
      ? "Voice not configured — set SARVAM_API_KEY in .env"
      : isRecording
        ? "Stop listening"
        : isProcessing
          ? "Transcribing..."
          : "Speak your question";

  const handleMicClick = () => {
    if (!micReady) {
      setVoiceError(
        !connected
          ? "Backend is offline. Start the server on port 8000, then try again."
          : "Voice input is not configured on the server.",
      );
      return;
    }
    toggleRecording();
  };

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <div className="composer__field">
        <div className="composer__input-row">
          <button
            type="button"
            className={`composer__mic${isRecording ? " composer__mic--active" : ""}${!micReady ? " composer__mic--unavailable" : ""}`}
            onClick={handleMicClick}
            disabled={disabled || isProcessing}
            aria-label={micTitle}
            title={micTitle}
          >
            {isProcessing ? (
              <span className="composer__mic-spinner" aria-hidden="true" />
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z" />
                <path d="M19 11a1 1 0 10-2 0 5 5 0 01-10 0 1 1 0 10-2 0 7 7 0 006 6.92V21H9a1 1 0 100 2h6a1 1 0 100-2h-2v-3.08A7 7 0 0019 11z" />
              </svg>
            )}
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value.slice(0, MAX_LENGTH));
              setVoiceError(null);
              resize();
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              isRecording
                ? "Listening… speak now"
                : isProcessing
                  ? "Transcribing…"
                  : micReady
                    ? "Type or tap the mic to ask a question…"
                    : connected
                      ? "Type your question…"
                      : "Backend offline — start server on port 8000…"
            }
            rows={1}
            disabled={disabled}
            aria-label="Your question"
            className={isRecording ? "composer__textarea--listening" : undefined}
          />
        </div>
        {voiceError && <p className="composer__voice-error">{voiceError}</p>}
        <span className="composer__hint">
          {isRecording
            ? "Listening… stops when you pause · tap mic to stop early · then press Send"
            : isProcessing
              ? "Transcribing your speech…"
              : "Press Enter to send · Shift+Enter for new line"}
        </span>
      </div>
      <button
        type="submit"
        className="composer__send"
        disabled={controlsDisabled || !input.trim()}
        aria-label="Send message"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
        </svg>
      </button>
    </form>
  );
}
