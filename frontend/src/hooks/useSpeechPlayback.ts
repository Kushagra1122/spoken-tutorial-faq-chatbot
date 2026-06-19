import { useCallback, useRef, useState } from "react";
import { playAudioDataUrl, synthesizeSpeech } from "../voice";

export function useSpeechPlayback() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingId(null);
  }, []);

  const speak = useCallback(
    async (messageId: string, text: string) => {
      if (playingId === messageId) {
        stop();
        return;
      }

      stop();
      setLoadingId(messageId);

      try {
        const dataUrl = await synthesizeSpeech(text);
        const audio = playAudioDataUrl(dataUrl);
        audioRef.current = audio;
        setPlayingId(messageId);
        audio.onended = () => {
          setPlayingId(null);
          audioRef.current = null;
        };
        audio.onerror = () => {
          setPlayingId(null);
          audioRef.current = null;
        };
      } finally {
        setLoadingId(null);
      }
    },
    [playingId, stop],
  );

  return { playingId, loadingId, speak, stop };
}
