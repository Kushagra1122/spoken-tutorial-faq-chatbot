export type MessageRole = "user" | "bot";

export interface FaqSource {
  id: string;
  question: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  category?: string | null;
  sources?: FaqSource[];
  confidence?: string;
  loading?: boolean;
  error?: boolean;
}

export interface ChatHistoryItem {
  role: "user" | "assistant";
  content: string;
}

export interface ChatApiResponse {
  answer: string;
  confidence: string;
  category: string | null;
  sources: FaqSource[];
}
