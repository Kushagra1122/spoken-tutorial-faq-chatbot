import type { ChatApiResponse, ChatHistoryItem } from "./types";

function getApiBase(): string {
  const fromQuery = new URLSearchParams(window.location.search).get("api");
  if (fromQuery) return fromQuery;

  const fromEnv = import.meta.env.VITE_API_BASE;
  if (fromEnv) return fromEnv;

  const fromStorage = localStorage.getItem("faq_api_base");
  if (fromStorage) return fromStorage;

  return "http://localhost:8000";
}

export const API_BASE = getApiBase();

export async function sendChatMessage(
  message: string,
  history: ChatHistoryItem[] = [],
): Promise<ChatApiResponse> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(err.detail || `Request failed (${res.status})`);
  }

  return res.json() as Promise<ChatApiResponse>;
}
