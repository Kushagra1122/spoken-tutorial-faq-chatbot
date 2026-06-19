import { useCallback, useRef, useState } from "react";
import { transcribeAudio } from "../voice";

interface UseVoiceRecorderOptions {
  onTextUpdate: (text: string) => void;
  getCurrentText: () => string;
  onError?: (message: string) => void;
}

const SILENCE_THRESHOLD = 0.012;
const SILENCE_MS = 1400;
const MIN_SPEECH_MS = 400;
const MAX_RECORD_MS = 30000;

function computeRms(analyser: AnalyserNode, buffer: Float32Array): number {
  analyser.getFloatTimeDomainData(buffer);
  let sum = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}

export function useVoiceRecorder({
  onTextUpdate,
  getCurrentText,
  onError,
}: UseVoiceRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const monitorTimerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const prefixRef = useRef("");
  const speechStartedRef = useRef(false);
  const speechStartTimeRef = useRef(0);
  const silenceStartRef = useRef<number | null>(null);
  const stoppingRef = useRef(false);
  const interimTimerRef = useRef<number | null>(null);
  const interimBusyRef = useRef(false);

  const cleanupAudio = useCallback(() => {
    if (monitorTimerRef.current !== null) {
      window.clearInterval(monitorTimerRef.current);
      monitorTimerRef.current = null;
    }
    if (interimTimerRef.current !== null) {
      window.clearInterval(interimTimerRef.current);
      interimTimerRef.current = null;
    }
    mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    mediaRecorderRef.current = null;
    analyserRef.current = null;
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  const transcribeAndFill = useCallback(
    async (blob: Blob) => {
      if (blob.size === 0) return;
      setIsProcessing(true);
      try {
        const transcript = (await transcribeAudio(blob)).trim();
        if (!transcript) {
          onError?.("No speech detected. Try again.");
          return;
        }
        const prefix = prefixRef.current.trim();
        const combined = prefix ? `${prefix} ${transcript}` : transcript;
        onTextUpdate(combined);
      } catch (err) {
        onError?.(
          err instanceof Error ? err.message : "Could not transcribe audio",
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [onTextUpdate, onError],
  );

  const finishRecording = useCallback(
    async (reason: "silence" | "manual" | "timeout") => {
      if (stoppingRef.current) return;
      stoppingRef.current = true;

      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        stoppingRef.current = false;
        cleanupAudio();
        setIsRecording(false);
        return;
      }

      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
        recorder.stop();
      });

      cleanupAudio();
      setIsRecording(false);

      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      chunksRef.current = [];

      if (speechStartedRef.current) {
        await transcribeAndFill(blob);
      } else if (reason === "manual") {
        onError?.("No speech detected. Try again.");
      }

      stoppingRef.current = false;
    },
    [cleanupAudio, transcribeAndFill, onError],
  );

  const startRecording = useCallback(async () => {
    if (isRecording || isProcessing) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      prefixRef.current = getCurrentText();
      speechStartedRef.current = false;
      silenceStartRef.current = null;
      speechStartTimeRef.current = Date.now();
      stoppingRef.current = false;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.start(250);

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      const buffer = new Float32Array(analyser.fftSize);

      monitorTimerRef.current = window.setInterval(() => {
        if (!analyserRef.current || stoppingRef.current) return;

        const rms = computeRms(analyserRef.current, buffer);
        const now = Date.now();

        if (rms >= SILENCE_THRESHOLD) {
          if (!speechStartedRef.current) {
            speechStartedRef.current = true;
            speechStartTimeRef.current = now;
          }
          silenceStartRef.current = null;
          return;
        }

        if (!speechStartedRef.current) {
          if (now - speechStartTimeRef.current > MAX_RECORD_MS) {
            void finishRecording("timeout");
          }
          return;
        }

        if (silenceStartRef.current === null) {
          silenceStartRef.current = now;
          return;
        }

        const silentFor = now - silenceStartRef.current;
        const spokeFor = now - speechStartTimeRef.current;

        if (silentFor >= SILENCE_MS && spokeFor >= MIN_SPEECH_MS) {
          void finishRecording("silence");
        }
      }, 120);

      interimTimerRef.current = window.setInterval(() => {
        if (
          stoppingRef.current ||
          !speechStartedRef.current ||
          interimBusyRef.current ||
          chunksRef.current.length === 0
        ) {
          return;
        }
        const snap = new Blob(chunksRef.current, { type: "audio/webm" });
        if (snap.size < 8000) return;

        interimBusyRef.current = true;
        void transcribeAudio(snap)
          .then((transcript) => {
            if (stoppingRef.current || !transcript.trim()) return;
            const prefix = prefixRef.current.trim();
            const combined = prefix
              ? `${prefix} ${transcript.trim()}`
              : transcript.trim();
            onTextUpdate(combined);
          })
          .catch(() => {
            /* interim preview is best-effort */
          })
          .finally(() => {
            interimBusyRef.current = false;
          });
      }, 2500);

      setIsRecording(true);
    } catch {
      cleanupAudio();
      onError?.("Microphone access denied. Allow mic permission and try again.");
    }
  }, [
    isRecording,
    isProcessing,
    getCurrentText,
    finishRecording,
    cleanupAudio,
    onError,
    onTextUpdate,
  ]);

  const stopRecording = useCallback(() => {
    if (!isRecording) return;
    void finishRecording("manual");
  }, [isRecording, finishRecording]);

  const toggleRecording = useCallback(() => {
    if (isRecording) stopRecording();
    else void startRecording();
  }, [isRecording, startRecording, stopRecording]);

  return {
    isRecording,
    isProcessing,
    toggleRecording,
    stopRecording,
  };
}
