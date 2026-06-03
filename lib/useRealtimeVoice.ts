"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface UseRealtimeVoiceProps {
  authToken: string;
  onStateChange: (
    state: "idle" | "listening" | "thinking" | "speaking",
  ) => void;
  onVolumeChange: (vol: number) => void;
  onThinkingText: (text: string) => void;
  onMessageReceived: (role: "user" | "bot", text: string) => void;
  onError?: (text: string) => void;
  onLatencyUpdate?: (latencyMs: number) => void;
  onReconnectState?: (isReconnecting: boolean) => void;
}

export function useRealtimeVoice({
  authToken,
  onStateChange,
  onVolumeChange,
  onThinkingText,
  onMessageReceived,
  onError,
  onLatencyUpdate,
  onReconnectState,
}: UseRealtimeVoiceProps) {
  const [isActive, setIsActive] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // For playing audio received from WS
  const playbackContextRef = useRef<AudioContext | null>(null);
  const playbackSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const isPlayingRef = useRef(false);
  const requestStartRef = useRef<number | null>(null);
  const nextPlayTimeRef = useRef(0);

  const startVoice = useCallback(async () => {
    try {
      if (!authToken) {
        onError?.("Please sign in first");
        return;
      }
      onError?.("");
      onReconnectState?.(false);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 24000,
        },
      });
      mediaStreamRef.current = stream;

      // IMPORTANT: connect directly to backend realtime WS host, not Next.js frontend host.
      const configuredApiUrl =
        process.env.NEXT_PUBLIC_API_URL ||
        `${window.location.protocol}//${window.location.hostname}:8010`;
      const apiBase = new URL(configuredApiUrl, window.location.origin);
      const wsProtocol = apiBase.protocol === "https:" ? "wss:" : "ws:";
      const sessionId = `web-${Date.now().toString(36)}`;
      const wsUrl = `${wsProtocol}//${apiBase.host}/api/realtime/ws?token=${encodeURIComponent(authToken)}&session_id=${encodeURIComponent(sessionId)}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      const AudioContext =
        window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = audioCtx;

      const playbackCtx = new AudioContext({ sampleRate: 24000 });
      playbackContextRef.current = playbackCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;

      // ScriptProcessor is deprecated but widely supported and simplest for raw PCM extraction without Worklet setup overhead
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(audioCtx.destination);

      let thinkingText = "";

      ws.onopen = () => {
        setIsActive(true);
        onReconnectState?.(false);
        onStateChange("listening");

        processor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);

          // Calculate volume
          let sum = 0;
          for (let i = 0; i < inputData.length; i++) {
            sum += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sum / inputData.length);
          onVolumeChange(Math.min(1, rms * 5)); // Scale up slightly for visual effect

          // Barge-in detection
          if (rms > 0.05 && isPlayingRef.current) {
            playbackSourceRef.current?.stop();
            isPlayingRef.current = false;
            nextPlayTimeRef.current = 0;
            onStateChange("listening");
            ws.send(JSON.stringify({ type: "interrupt" }));
          }

          // Downsample and convert to INT16
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }

          const base64str = arrayBufferToBase64(pcm16.buffer);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: "input_audio_buffer.append",
                audio: base64str,
              }),
            );
          }

        };
      };

      ws.onmessage = async (e) => {
        const msg = JSON.parse(e.data);

        if (msg.type === "node_started" || msg.type === "thinking") {
          thinkingText = msg.message || "Thinking...";
          onThinkingText(thinkingText);
          onStateChange("thinking");
        }

        if (msg.type === "input_audio_buffer.speech_started") {
          requestStartRef.current = performance.now();
          onStateChange("listening");
          onThinkingText("Sun raha hoon...");
        }

        if (msg.type === "input_audio_buffer.speech_stopped") {
          thinkingText = "Memory aur dukaan ka data dekh raha hoon...";
          onThinkingText(thinkingText);
          onStateChange("thinking");
        }

        if (
          (msg.type === "response.output_audio.delta" ||
            msg.type === "response.audio.delta") &&
          msg.delta
        ) {
          onStateChange("speaking");
          await playAudioChunk(msg.delta, playbackCtx);
        }

        if (msg.type === "response.done") {
          if (requestStartRef.current !== null) {
            const latency = Math.round(
              performance.now() - requestStartRef.current,
            );
            onLatencyUpdate?.(latency);
            requestStartRef.current = null;
          }
          onStateChange("listening");
          thinkingText = "";
          onThinkingText("");
        }

        if (
          (msg.type === "response.output_audio_transcript.done" ||
            msg.type === "response.audio_transcript.done") &&
          msg.transcript
        ) {
          onMessageReceived("bot", msg.transcript);
        }

        // Capture user transcript events if emitted by realtime API.
        if (
          msg.type ===
            "conversation.item.input_audio_transcription.completed" &&
          msg.transcript
        ) {
          onMessageReceived("user", msg.transcript);
        }

        if (msg.type === "error") {
          const text = msg?.error?.message || "Voice pipeline error";
          onError?.(text);
        }
      };

      ws.onerror = () => {
        onError?.("Voice socket connect failed");
      };

      ws.onclose = () => {
        stopVoice();
        onReconnectState?.(true);
      };
    } catch (err) {
      onError?.("Mic permission ya network issue aaya");
      stopVoice();
    }
  }, [
    authToken,
    onStateChange,
    onVolumeChange,
    onThinkingText,
    onMessageReceived,
    onError,
    onLatencyUpdate,
    onReconnectState,
  ]);

  const stopVoice = useCallback(() => {
    onReconnectState?.(false);
    setIsActive(false);
    onStateChange("idle");
    onVolumeChange(0);

    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    if (processorRef.current && sourceRef.current) {
      sourceRef.current.disconnect();
      processorRef.current.disconnect();
      processorRef.current = null;
      sourceRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (playbackContextRef.current) {
      playbackContextRef.current.close();
      playbackContextRef.current = null;
    }
    isPlayingRef.current = false;
    requestStartRef.current = null;
    nextPlayTimeRef.current = 0;
  }, [onStateChange, onVolumeChange, onReconnectState]);

  const toggleVoice = () => {
    if (isActive) {
      stopVoice();
    } else {
      startVoice();
    }
  };

  async function playAudioChunk(base64Audio: string, ctx: AudioContext) {
    try {
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      const binaryString = window.atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Assume 16-bit PCM at 24000Hz (OpenAI default output)
      const buffer = new Int16Array(bytes.buffer);
      const audioBuffer = ctx.createBuffer(1, buffer.length, 24000);
      const channelData = audioBuffer.getChannelData(0);

      for (let i = 0; i < buffer.length; i++) {
        channelData[i] = buffer[i] / 32768.0;
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      if (nextPlayTimeRef.current < ctx.currentTime) {
        nextPlayTimeRef.current = ctx.currentTime;
      }
      source.start(nextPlayTimeRef.current);
      nextPlayTimeRef.current += audioBuffer.duration;

      playbackSourceRef.current = source;
      isPlayingRef.current = true;

      source.onended = () => {
        if (ctx.currentTime >= nextPlayTimeRef.current) {
          isPlayingRef.current = false;
          onStateChange("listening");
        }
      };
    } catch (e) {
      console.error("Audio playback error", e);
    }
  }

  useEffect(() => {
    return () => stopVoice();
  }, [stopVoice]);

  return { isActive, toggleVoice, stopVoice, startVoice };
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
