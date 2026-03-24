"use client";

import { Mic, MicOff, X } from "lucide-react";
import { cn } from "@/lib/utils";

type VoiceState = "idle" | "listening" | "thinking" | "speaking";

type RealtimeVoiceModalProps = {
  open: boolean;
  state: VoiceState;
  volume: number;
  thinkingText: string;
  onClose: () => void;
  onToggle: () => void;
  onHoldStart: () => void;
  onHoldEnd: () => void;
  active: boolean;
  lastUserText?: string;
  lastBotText?: string;
  errorText?: string;
  reconnecting?: boolean;
  latencyMs?: number | null;
};

const labelByState: Record<VoiceState, string> = {
  idle: "Ready",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
};

export function RealtimeVoiceModal({
  open,
  state,
  volume,
  thinkingText,
  onClose,
  onToggle,
  onHoldStart,
  onHoldEnd,
  active,
  lastUserText,
  lastBotText,
  errorText,
  reconnecting = false,
  latencyMs = null,
}: RealtimeVoiceModalProps) {
  if (!open) {
    return null;
  }

  const bars = [0.45, 0.8, 1, 0.75, 0.5];
  const amp = Math.max(0.08, Math.min(1, volume));

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl border border-[#212121] bg-[#0c0c0c] p-5 sm:rounded-3xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted">
              Realtime Chat
            </p>
            <p className="mt-1 text-[14px] text-foreground">
              {thinkingText || labelByState[state]}
            </p>
          </div>
          <div className="mr-2 rounded-full border border-[#2a2a2a] px-2 py-1 text-[11px] text-muted">
            {latencyMs === null ? "Latency --" : `Latency ${latencyMs}ms`}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#2a2a2a] p-2 text-muted hover:text-foreground"
            aria-label="Close realtime chat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-5 rounded-2xl border border-[#1f1f1f] bg-[#101010] p-4">
          <div className="flex h-20 items-end justify-center gap-2">
            {bars.map((bar, index) => {
              const baseHeight =
                state === "idle" ? 0.16 : bar * (0.35 + amp * 0.65);
              const scaleY = Math.max(0.14, Math.min(1.2, baseHeight));
              return (
                <span
                  key={index}
                  className={cn(
                    "w-2 rounded-full bg-[#d8d8d8]/85",
                    state !== "idle" && "animate-pulse",
                  )}
                  style={{
                    height: `${Math.round(60 * scaleY)}px`,
                    animationDelay: `${index * 90}ms`,
                    opacity: active ? 0.95 : 0.45,
                  }}
                />
              );
            })}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
            <div className="rounded-lg border border-[#202020] bg-[#0d0d0d] p-2.5">
              <p className="mb-1 text-muted">You</p>
              <p className="line-clamp-2 text-foreground/90">
                {lastUserText || "Speak to start"}
              </p>
            </div>
            <div className="rounded-lg border border-[#202020] bg-[#0d0d0d] p-2.5">
              <p className="mb-1 text-muted">Artha</p>
              <p className="line-clamp-2 text-foreground/90">
                {lastBotText || "Waiting..."}
              </p>
            </div>
          </div>

          {errorText && (
            <p className="mt-3 rounded-md border border-[#3a2323] bg-[#251313] px-2.5 py-2 text-[11px] text-[#f2bcbc]">
              {errorText}
            </p>
          )}

          {reconnecting && (
            <p className="mt-3 rounded-md border border-[#3a3323] bg-[#252013] px-2.5 py-2 text-[11px] text-[#f2dfbc]">
              Reconnecting voice session...
            </p>
          )}
        </div>

        <button
          type="button"
          onMouseDown={onHoldStart}
          onMouseUp={onHoldEnd}
          onMouseLeave={onHoldEnd}
          onTouchStart={onHoldStart}
          onTouchEnd={onHoldEnd}
          onTouchCancel={onHoldEnd}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#2c2c2c] bg-[#0f0f0f] px-4 py-3 text-[14px] font-medium text-foreground hover:bg-[#181818]"
        >
          <Mic className="h-4 w-4" />
          Hold to Talk
        </button>

        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-[14px] font-medium transition-colors",
            active
              ? "border-red-500/30 bg-red-500/10 text-red-300"
              : "border-[#2c2c2c] bg-[#141414] text-foreground hover:bg-[#1a1a1a]",
          )}
        >
          {active ? (
            <MicOff className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
          {active ? "Stop Realtime" : "Start Realtime"}
        </button>
      </div>
    </div>
  );
}
