import { useCallback, useEffect, useState } from "react";
import { API_BASE } from "../api";
import { fetchVoiceStatus } from "../voice";

export function useBackendConnection(pollMs = 4000) {
  const [connected, setConnected] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [checking, setChecking] = useState(true);

  const refresh = useCallback(async () => {
    setChecking(true);
    try {
      const healthRes = await fetch(`${API_BASE}/api/health`);
      const online = healthRes.ok;
      setConnected(online);

      if (online) {
        const voice = await fetchVoiceStatus();
        setVoiceEnabled(voice.enabled);
      } else {
        setVoiceEnabled(false);
      }
    } catch {
      setConnected(false);
      setVoiceEnabled(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, pollMs);
    return () => window.clearInterval(timer);
  }, [refresh, pollMs]);

  return { connected, voiceEnabled, checking, refresh };
}
