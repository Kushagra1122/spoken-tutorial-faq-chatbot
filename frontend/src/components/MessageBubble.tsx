import type { ChatMessage } from "../types";
import { FormattedAnswer } from "../utils/formatAnswer";
import { SourceCitation } from "./SourceCitation";
import { TypingIndicator } from "./TypingIndicator";

interface MessageBubbleProps {
  message: ChatMessage;
}

function BotAvatar() {
  return (
    <div className="message__avatar message__avatar--bot" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
        />
      </svg>
    </div>
  );
}

function UserAvatar() {
  return (
    <div className="message__avatar message__avatar--user" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 21.75c-2.73 0-5.357-.592-7.812-1.65a.75.75 0 01-.437-.695z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isBot = message.role === "bot";

  return (
    <div
      className={`message-row message-row--${message.role}${
        message.error ? " message-row--error" : ""
      }`}
    >
      {isBot && <BotAvatar />}
      <div
        className={`message message--${message.role}${
          message.loading ? " message--loading" : ""
        }${message.error ? " message--error" : ""}`}
      >
        {message.loading ? (
          <TypingIndicator />
        ) : isBot && !message.error ? (
          <>
            <FormattedAnswer text={message.content} />
            {message.confidence !== "low" && message.sources?.length ? (
              <SourceCitation
                sources={message.sources}
                category={message.category}
              />
            ) : null}
          </>
        ) : (
          <p className="message__plain">{message.content}</p>
        )}
      </div>
      {isUser && <UserAvatar />}
    </div>
  );
}
