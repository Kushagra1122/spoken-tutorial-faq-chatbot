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

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  aliases: string[];
}

export async function fetchFaqs(): Promise<FaqItem[]> {
  const res = await fetch(`${API_BASE}/api/faqs`, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(err.detail || `Request failed (${res.status})`);
  }

  return res.json() as Promise<FaqItem[]>;
}

export async function updateFaq(
  id: string,
  payload: Pick<FaqItem, "category" | "question" | "answer" | "aliases">,
): Promise<FaqItem> {
  const res = await fetch(`${API_BASE}/api/faqs/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(err.detail || `Request failed (${res.status})`);
  }

  return res.json() as Promise<FaqItem>;
}

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
