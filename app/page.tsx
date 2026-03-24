"use client";

import { useEffect, useRef, useState } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertTriangle,
  CalendarDays,
  Languages,
  Loader2,
  Mic,
  Store,
  TrendingUp,
} from "lucide-react";
import { InputBar } from "@/components/chat/InputBar";
import { AttachSheet } from "@/components/chat/AttachSheet";
import { MetricsBadge } from "@/components/MetricsBadge";
import { RealtimeVoiceModal } from "@/components/RealtimeVoiceModal";
import { StructuredData } from "@/components/StructuredData";
import { useRealtimeVoice } from "@/lib/useRealtimeVoice";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  role: "user" | "bot";
  content: string;
  structuredData?: any;
  isVoice?: boolean;
};

type ChatStreamEvent = {
  type?: string;
  content?: string;
  name?: string;
  args?: string;
  result?: string;
};

const PHONE = "918767394523";

const makeId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voicePanelOpen, setVoicePanelOpen] = useState(false);
  const [voiceState, setVoiceState] = useState<
    "idle" | "listening" | "thinking" | "speaking"
  >("idle");
  const [voiceVolume, setVoiceVolume] = useState(0);
  const [thinkingText, setThinkingText] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [voiceLatencyMs, setVoiceLatencyMs] = useState<number | null>(null);
  const [isVoiceReconnecting, setIsVoiceReconnecting] = useState(false);
  const [lastVoiceUser, setLastVoiceUser] = useState("");
  const [lastVoiceBot, setLastVoiceBot] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [showAttachSheet, setShowAttachSheet] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);

  const isLoading = isStreaming || isTranscribing;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!textareaRef.current) {
      return;
    }
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
  }, [input]);

  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort();
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const {
    isActive: voiceActive,
    toggleVoice,
    stopVoice,
    startVoice,
  } = useRealtimeVoice({
    phone: PHONE,
    onStateChange: setVoiceState,
    onVolumeChange: setVoiceVolume,
    onThinkingText: setThinkingText,
    onError: setVoiceError,
    onLatencyUpdate: setVoiceLatencyMs,
    onReconnectState: setIsVoiceReconnecting,
    onMessageReceived: (role, text) => {
      if (!text?.trim()) {
        return;
      }
      if (role === "user") {
        setLastVoiceUser(text);
      } else {
        setLastVoiceBot(text);
      }
      setMessages((prev) => [
        ...prev,
        { id: makeId(), role, content: text, isVoice: true },
      ]);
    },
  });

  const stopStreamIfRunning = () => {
    if (streamAbortRef.current) {
      streamAbortRef.current.abort();
      streamAbortRef.current = null;
    }
  };

  const processSelectedFile = (file: File | null) => {
    if (!file) {
      return;
    }
    setSelectedFile(file);
    setSelectedFileName(file.name);

    setInput((prev) => {
      if (prev.trim().length > 0) {
        return prev;
      }
      return `Ye file samjhao: ${file.name}`;
    });

    textareaRef.current?.focus();
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setSelectedFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    processSelectedFile(e.target.files?.[0] || null);
  };

  const openPicker = (accept: string, capture?: "environment") => {
    const picker = document.createElement("input");
    picker.type = "file";
    picker.accept = accept;
    if (capture) {
      picker.setAttribute("capture", capture);
    }
    picker.onchange = () => {
      processSelectedFile(picker.files?.[0] || null);
    };
    picker.click();
  };

  const handleCameraPick = () => {
    setShowAttachSheet(false);
    openPicker("image/*", "environment");
  };

  const handleGalleryPick = () => {
    setShowAttachSheet(false);
    openPicker("image/*");
  };

  const handleFilePick = () => {
    setShowAttachSheet(false);
    openPicker(".pdf,.png,.jpg,.jpeg,.webp,.txt");
  };

  const extractStructuredData = (event: ChatStreamEvent): unknown => {
    if (!event.result) {
      return undefined;
    }
    try {
      return JSON.parse(event.result);
    } catch {
      return event.result;
    }
  };

  const resolveOcrText = async () => {
    if (!selectedFile || !selectedFile.type.startsWith("image/")) {
      return undefined;
    }
    const form = new FormData();
    form.append("file", selectedFile);
    const ocrRes = await fetch("/api/upload-image", {
      method: "POST",
      body: form,
    });
    if (!ocrRes.ok) {
      return undefined;
    }
    const ocrPayload = (await ocrRes.json()) as { ocr_text?: string };
    return ocrPayload.ocr_text;
  };

  const handleSendText = async (text: string) => {
    const userText = text.trim();
    if (!userText || isStreaming) {
      return;
    }

    stopStreamIfRunning();

    const userMessageId = makeId();
    const botMessageId = makeId();

    setMessages((prev) => [
      ...prev,
      { id: userMessageId, role: "user", content: userText },
      { id: botMessageId, role: "bot", content: "" },
    ]);
    setInput("");

    const controller = new AbortController();
    streamAbortRef.current = controller;
    setIsStreaming(true);

    try {
      const ocrText = await resolveOcrText();

      await fetchEventSource("/api/chat-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: PHONE,
          message: userText,
          input_type: "text",
          ocr_text: ocrText,
        }),
        signal: controller.signal,
        async onopen(res) {
          if (!res.ok) {
            throw new Error(`stream_open_failed_${res.status}`);
          }
        },
        onmessage(event) {
          if (!event.data) {
            return;
          }

          let payload: ChatStreamEvent;
          try {
            payload = JSON.parse(event.data) as ChatStreamEvent;
          } catch {
            return;
          }

          if (payload.type === "chunk") {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botMessageId
                  ? {
                      ...msg,
                      content: `${msg.content}${payload.content || ""}`,
                    }
                  : msg,
              ),
            );
            return;
          }

          if (payload.type === "tool_result") {
            const structured = extractStructuredData(payload);
            if (structured !== undefined) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === botMessageId
                    ? {
                        ...msg,
                        structuredData: structured,
                      }
                    : msg,
                ),
              );
            }
            return;
          }

          if (payload.type === "error") {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botMessageId
                  ? {
                      ...msg,
                      content:
                        msg.content ||
                        payload.content ||
                        "Request failed. Please retry.",
                    }
                  : msg,
              ),
            );
          }
        },
        onerror() {
          throw new Error("stream_error");
        },
      });
    } catch (error) {
      const isAbort =
        error instanceof DOMException && error.name === "AbortError";
      if (!isAbort) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMessageId && !msg.content
              ? {
                  ...msg,
                  content: "Network issue aaya. Ek baar phir try karo.",
                }
              : msg,
          ),
        );
      }
    } finally {
      setIsStreaming(false);
      if (streamAbortRef.current === controller) {
        streamAbortRef.current = null;
      }
      clearSelectedFile();
    }
  };

  const transcribeAndSend = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append(
        "file",
        new File([blob], "voice-note.webm", {
          type: blob.type || "audio/webm",
        }),
      );
      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        return;
      }
      const payload = (await res.json()) as { transcript?: string | null };
      const transcript = (payload.transcript || "").trim();
      if (transcript) {
        await handleSendText(transcript);
      }
    } finally {
      setIsTranscribing(false);
    }
  };

  const stopVoiceRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    setIsRecording(false);
  };

  const startVoiceRecording = async () => {
    if (isRecording || isStreaming || isTranscribing) {
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordingStreamRef.current = stream;

    const options = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
    ];
    const mimeType = options.find((item) =>
      MediaRecorder.isTypeSupported(item),
    );

    const recorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType } : undefined,
    );
    mediaRecorderRef.current = recorder;
    recordingChunksRef.current = [];

    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) {
        recordingChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = async () => {
      const blob = new Blob(recordingChunksRef.current, {
        type: recorder.mimeType || "audio/webm",
      });
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
      recordingChunksRef.current = [];
      if (blob.size > 0) {
        await transcribeAndSend(blob);
      }
    };

    recorder.start();
    setIsRecording(true);
  };

  const handleVoiceNote = async () => {
    if (isRecording) {
      stopVoiceRecording();
      return;
    }
    try {
      await startVoiceRecording();
    } catch {
      setIsRecording(false);
    }
  };

  const openRealtimeModal = () => {
    setVoicePanelOpen(true);
    setVoiceError("");
    setIsVoiceReconnecting(false);
    if (!voiceActive) {
      toggleVoice();
    }
  };

  const closeRealtimeModal = () => {
    if (voiceActive) {
      stopVoice();
    }
    setVoicePanelOpen(false);
    setIsVoiceReconnecting(false);
  };

  const handleHoldStart = () => {
    if (!voicePanelOpen) {
      setVoicePanelOpen(true);
    }
    if (!voiceActive) {
      startVoice();
    }
  };

  const handleHoldEnd = () => {
    if (voiceActive) {
      stopVoice();
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground selection:bg-accent selection:text-foreground">
      <header className="sticky top-0 z-10 border-b border-[#1a1a1a] bg-background/85 p-4 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-muted" />
              <h1 className="text-[15px] font-medium tracking-[0.02em] text-foreground">
                Sharma General Store
              </h1>
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span className="text-[11px] text-muted">Live</span>
              <span className="text-[11px] text-muted/70">|</span>
              <Languages className="h-3 w-3 text-muted/80" />
              <span className="text-[11px] text-muted">Hindi / English</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isStreaming && (
              <button
                type="button"
                onClick={stopStreamIfRunning}
                className="rounded-full border border-[#2c2c2c] bg-[#111] px-3 py-1.5 text-[12px] text-muted hover:text-foreground"
              >
                Stop
              </button>
            )}
            <button
              type="button"
              onClick={openRealtimeModal}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 transition-colors",
                voiceActive
                  ? "border-green-500/25 bg-green-500/10 text-green-400"
                  : "border-[#222] bg-[#141414] text-muted hover:bg-[#1c1c1c] hover:text-foreground",
              )}
            >
              <Mic className="h-4 w-4" />
              <span className="text-[13px] font-medium">Realtime</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto mb-28 flex w-full max-w-4xl flex-1 flex-col overflow-y-auto px-4 py-8 scrollbar-none">
        {messages.length === 0 && (
          <div className="mt-[12vh] flex h-full flex-col items-center justify-center gap-10">
            <h2 className="text-4xl font-semibold uppercase tracking-[0.12em] text-muted/25">
              Artha
            </h2>

            <div className="flex w-full max-w-sm flex-col gap-3">
              <button
                onClick={() => setInput("Aaj kitna business hua?")}
                className="rounded-full border border-[#222] bg-transparent px-5 py-3 text-center text-[15px] text-muted transition-colors hover:bg-[#141414] hover:text-foreground"
              >
                Aaj kitna business hua?
              </button>
              <button
                onClick={() => setInput("Koi customer chhoot gaya?")}
                className="rounded-full border border-[#222] bg-transparent px-5 py-3 text-center text-[15px] text-muted transition-colors hover:bg-[#141414] hover:text-foreground"
              >
                Koi customer chhoot gaya?
              </button>
              <button
                onClick={() => setInput("Weekly summary dikhao")}
                className="rounded-full border border-[#222] bg-transparent px-5 py-3 text-center text-[15px] text-muted transition-colors hover:bg-[#141414] hover:text-foreground"
              >
                Weekly summary dikhao
              </button>
            </div>

            <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex items-start gap-2 rounded-xl border border-[#1e1e1e] px-3 py-3 text-muted">
                <TrendingUp className="mt-0.5 h-4 w-4" />
                <div>
                  <p className="text-[12px] text-foreground">Aaj ka hisaab</p>
                  <p className="text-[11px]">Bikri aur payment dekho</p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-xl border border-[#1e1e1e] px-3 py-3 text-muted">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div>
                  <p className="text-[12px] text-foreground">Risk check</p>
                  <p className="text-[11px]">Fraud wali entry pakdo</p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-xl border border-[#1e1e1e] px-3 py-3 text-muted">
                <CalendarDays className="mt-0.5 h-4 w-4" />
                <div>
                  <p className="text-[12px] text-foreground">
                    Haftawari report
                  </p>
                  <p className="text-[11px]">Simple summary pao</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "mb-8 flex max-w-[88%] flex-col text-[15px] font-normal leading-[1.6] tracking-normal",
              msg.role === "user"
                ? "ml-auto rounded-2xl rounded-tr-sm bg-[#141414] px-5 py-3.5 text-[#fafafa]"
                : "mr-auto border-l-2 border-[#222] bg-transparent py-1 pl-5",
            )}
          >
            {msg.role === "bot" && (
              <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.05em] text-muted">
                Artha
              </div>
            )}

            {msg.isVoice && msg.role === "bot" && (
              <div className="mb-2 flex items-center gap-2 text-xs text-muted">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                Voice Response
              </div>
            )}

            <div className="prose prose-invert max-w-none prose-p:m-0 prose-p:text-[15px] prose-p:leading-[1.6] prose-pre:border prose-pre:border-border prose-pre:bg-accent">
              {msg.content === "" && isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted" />
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.content}
                </ReactMarkdown>
              )}
            </div>

            {msg.structuredData && <StructuredData data={msg.structuredData} />}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      <InputBar
        input={input}
        setInput={setInput}
        isLoading={isLoading}
        onSend={handleSendText}
        onAttach={() => setShowAttachSheet(true)}
        onVoiceNote={handleVoiceNote}
        isRecording={isRecording}
        selectedFileName={selectedFileName}
        setSelectedFileName={(val) => {
          setSelectedFileName(val);
          if (!val) {
            setSelectedFile(null);
          }
        }}
        fileInputRef={fileInputRef}
        textareaRef={textareaRef}
        handleFileSelected={handleFileSelected}
      />

      <AttachSheet
        open={showAttachSheet}
        onClose={() => setShowAttachSheet(false)}
        onCameraPick={handleCameraPick}
        onGalleryPick={handleGalleryPick}
        onFilePick={handleFilePick}
      />

      <RealtimeVoiceModal
        open={voicePanelOpen}
        state={voiceState}
        volume={voiceVolume}
        thinkingText={thinkingText}
        active={voiceActive}
        onClose={closeRealtimeModal}
        onToggle={toggleVoice}
        onHoldStart={handleHoldStart}
        onHoldEnd={handleHoldEnd}
        lastUserText={lastVoiceUser}
        lastBotText={lastVoiceBot}
        errorText={voiceError}
        reconnecting={isVoiceReconnecting}
        latencyMs={voiceLatencyMs}
      />

      <MetricsBadge />
    </main>
  );
}
