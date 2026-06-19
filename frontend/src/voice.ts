import { API_BASE } from "./api";

export interface VoiceStatus {
  enabled: boolean;
}

export async function fetchVoiceStatus(): Promise<VoiceStatus> {
  const res = await fetch(`${API_BASE}/api/voice/status`);
  if (!res.ok) return { enabled: false };
  return res.json() as Promise<VoiceStatus>;
}

export async function transcribeAudio(blob: Blob): Promise<string> {
  const form = new FormData();
  const webmBlob =
    blob.type === "audio/webm"
      ? blob
      : new Blob([blob], { type: "audio/webm" });
  form.append("file", webmBlob, "recording.webm");

  const res = await fetch(`${API_BASE}/api/voice/transcribe`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(err.detail || `Transcription failed (${res.status})`);
  }

  const data = (await res.json()) as { transcript: string };
  return data.transcript;
}

export async function synthesizeSpeech(text: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/voice/synthesize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(err.detail || `Speech synthesis failed (${res.status})`);
  }

  const data = (await res.json()) as {
    audio_base64: string;
    content_type: string;
  };
  return `data:${data.content_type};base64,${data.audio_base64}`;
}

export function playAudioDataUrl(dataUrl: string): HTMLAudioElement {
  const audio = new Audio(dataUrl);
  void audio.play();
  return audio;
}
