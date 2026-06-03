"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertTriangle,
  CalendarDays,
  Database,
  LogOut,
  Loader2,
  Mic,
  TrendingUp,
} from "lucide-react";
import { InputBar } from "@/components/chat/InputBar";
import { AttachSheet } from "@/components/chat/AttachSheet";
import { MetricsBadge } from "@/components/MetricsBadge";
import { RealtimeVoiceModal } from "@/components/RealtimeVoiceModal";
import { StructuredData } from "@/components/StructuredData";
import {
  AuthSession,
  clearStoredAuthSession,
  getStoredAuthSession,
  storeAuthSession,
  syncBackendSession,
} from "@/lib/auth-session";
import { useRealtimeVoice } from "@/lib/useRealtimeVoice";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

type Message = {
  toolCall?: string;
  responseFormat?: string;
  proactiveInsight?: string;
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
  format?: string;
  data?: unknown;
  intent?: string;
  response_mode?: string;
  latency_profile?: string;
  status_message?: string;
};

type VoiceTurnResponse = {
  transcript?: string | null;
  response_text?: string;
  response_format?: string;
  data?: unknown;
  intent?: string;
  response_mode?: string;
  latency_profile?: string;
  status_message?: string;
  audio?: string | null;
  audio_mime?: string | null;
  error?: string;
};

const makeId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const playAudioBase64 = async (base64Audio: string, mimeType = "audio/mpeg") => {
  const binary = window.atob(base64Audio);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
  try {
    const audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    await audio.play();
  } catch {
    URL.revokeObjectURL(url);
  }
};

export default function Home() {
  const router = useRouter();
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
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
  const authToken = authSession?.token || "";
  const merchant = authSession?.merchant || null;
  const storeName = merchant?.store_name || "Artha";

  const authHeaders = (): Record<string, string> =>
    authToken
      ? {
          Authorization: `Bearer ${authToken}`,
        }
      : {};

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
    authToken,
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

  const persistAuthSession = (
    session: AuthSession,
    options: { resetConversation?: boolean } = {},
  ) => {
    setAuthSession(session);
    storeAuthSession(session);
    if (options.resetConversation) {
      setMessages([]);
      setInput("");
    }
  };

  const clearAuthSession = async () => {
    stopStreamIfRunning();
    stopVoice();
    setAuthSession(null);
    setMessages([]);
    setInput("");
    setVoicePanelOpen(false);
    clearStoredAuthSession();
    await supabase?.auth.signOut();
  };

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      try {
        const stored = getStoredAuthSession();
        if (stored && mounted) {
          setAuthSession(stored);
        }

        if (!supabase) {
          if (!stored) {
            router.replace("/login");
          }
          return;
        }

        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;
        if (accessToken) {
          const synced = await syncBackendSession(accessToken);
          if (mounted) {
            persistAuthSession(synced);
          }
        } else if (!stored && mounted) {
          router.replace("/login");
        }
      } catch {
        clearStoredAuthSession();
        if (mounted) {
          setAuthSession(null);
          router.replace("/login");
        }
      } finally {
        if (mounted) {
          setAuthChecked(true);
        }
      }
    };

    void loadSession();

    const subscription = supabase?.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) {
          return;
        }
        if (!session?.access_token) {
          clearStoredAuthSession();
          setAuthSession(null);
          router.replace("/login");
          return;
        }
        try {
          const synced = await syncBackendSession(session.access_token);
          if (mounted) {
            persistAuthSession(synced);
          }
        } catch {
          clearStoredAuthSession();
          if (mounted) {
            setAuthSession(null);
            router.replace("/login");
          }
        }
      },
    );

    return () => {
      mounted = false;
      subscription?.data.subscription.unsubscribe();
    };
  }, [router]);

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

  const resolveOcrText = async () => {
    if (!selectedFile || !selectedFile.type.startsWith("image/")) {
      return undefined;
    }
    const form = new FormData();
    form.append("file", selectedFile);
    const ocrRes = await fetch("/api/upload-image", {
      method: "POST",
      headers: authHeaders(),
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
          ...authHeaders(),
        },
        body: JSON.stringify({
          message: userText,
          input_type: ocrText ? "image" : "text",
          ocr_text: ocrText,
        }),
        signal: controller.signal,
        async onopen(res) {
          if (res.status === 401 || res.status === 403) {
            clearAuthSession();
            throw new Error("auth_expired");
          }
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
                      toolCall: undefined,
                    }
                  : msg,
              ),
            );
            return;
          }

          if (payload.type === "tool_call") {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botMessageId
                  ? {
                      ...msg,
                      toolCall: payload.name || "Tool",
                    }
                  : msg,
              ),
            );
            return;
          }

          if (payload.type === "status") {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botMessageId
                  ? {
                      ...msg,
                      toolCall: payload.content || "Thinking",
                    }
                  : msg,
              ),
            );
            return;
          }

          if (payload.type === "structured_data") {
            if (payload.data !== undefined && payload.data !== null) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === botMessageId
                    ? {
                        ...msg,
                        structuredData: payload.data,
                        responseFormat: payload.format,
                        toolCall: undefined,
                      }
                    : msg,
                ),
              );
            }
            return;
          }

          if (payload.type === "tool_result") {
            return;
          }

          if (payload.type === "response_meta") {
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
        const message =
          error instanceof Error && error.message === "auth_expired"
            ? "Session expire ho gaya. Dobara login karo."
            : "Network issue aaya. Ek baar phir try karo.";
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMessageId && !msg.content
              ? {
                  ...msg,
                  content: message,
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
    const userMessageId = makeId();
    const botMessageId = makeId();

    setMessages((prev) => [
      ...prev,
      {
        id: userMessageId,
        role: "user",
        content: "Voice note bheja...",
        isVoice: true,
      },
      {
        id: botMessageId,
        role: "bot",
        content: "",
        toolCall: "Voice note samajh raha hoon...",
        isVoice: true,
      },
    ]);

    try {
      const formData = new FormData();
      formData.append(
        "file",
        new File([blob], "voice-note.webm", {
          type: blob.type || "audio/webm",
        }),
      );

      const res = await fetch("/api/voice-turn", {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });

      const payload = (await res.json()) as VoiceTurnResponse;
      const transcript = (payload.transcript || "").trim();

      if (transcript) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === userMessageId ? { ...msg, content: transcript } : msg,
          ),
        );
      }

      const responseText =
        payload.response_text ||
        (res.ok
          ? "Voice process ho gaya, par response empty aaya."
          : "Voice clear nahi aayi. Ek baar phir try karo.");

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMessageId
            ? {
                ...msg,
                content: responseText,
                structuredData: payload.data ?? undefined,
                responseFormat: payload.response_format,
                toolCall: undefined,
                isVoice: payload.response_mode === "voice" || payload.response_mode === "both",
              }
            : msg,
        ),
      );

      if (payload.audio) {
        await playAudioBase64(payload.audio, payload.audio_mime || "audio/mpeg");
      }
    } catch {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMessageId
            ? {
                ...msg,
                content: "Voice request mein network issue aaya. Ek baar phir try karo.",
                toolCall: undefined,
              }
            : msg,
        ),
      );
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

  if (!authSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-brand" />
          {authChecked ? "Login par le ja raha hoon..." : "Session check kar raha hoon..."}
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground selection:bg-accent selection:text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 p-4 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-xl font-bold text-text">{storeName}</h1>
              <p className="text-xs text-muted">{merchant?.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/onboarding/context"
              className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-[13px] font-medium text-muted transition-colors hover:text-text"
              aria-label="memory context"
            >
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Memory</span>
            </Link>
            <button
              type="button"
              onClick={openRealtimeModal}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
                voiceActive
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-border bg-surface text-muted hover:text-text",
              )}
            >
              <Mic className="h-4 w-4" />
              <span>Realtime</span>
            </button>
            <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
            <span className="text-xs font-semibold text-success uppercase tracking-wider">Live</span>
            <button
              type="button"
              onClick={clearAuthSession}
              className="rounded-full border border-border bg-surface p-2 text-muted transition-colors hover:text-text"
              aria-label="logout"
            >
              <LogOut className="h-4 w-4" />
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
                className="rounded-full border border-border bg-surface px-5 py-3 text-center text-[15px] text-muted shadow-sm transition-colors hover:border-brand/40 hover:text-text"
              >
                Aaj kitna business hua?
              </button>
              <button
                onClick={() => setInput("Koi customer chhoot gaya?")}
                className="rounded-full border border-border bg-surface px-5 py-3 text-center text-[15px] text-muted shadow-sm transition-colors hover:border-brand/40 hover:text-text"
              >
                Koi customer chhoot gaya?
              </button>
              <button
                onClick={() => setInput("Weekly summary dikhao")}
                className="rounded-full border border-border bg-surface px-5 py-3 text-center text-[15px] text-muted shadow-sm transition-colors hover:border-brand/40 hover:text-text"
              >
                Weekly summary dikhao
              </button>
            </div>

            <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex items-start gap-2 rounded-xl border border-border bg-surface px-3 py-3 text-muted shadow-sm">
                <TrendingUp className="mt-0.5 h-4 w-4" />
                <div>
                  <p className="text-[12px] text-text">Aaj ka hisaab</p>
                  <p className="text-[11px]">Bikri aur payment dekho</p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-xl border border-border bg-surface px-3 py-3 text-muted shadow-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div>
                  <p className="text-[12px] text-text">Risk check</p>
                  <p className="text-[11px]">Fraud wali entry pakdo</p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-xl border border-border bg-surface px-3 py-3 text-muted shadow-sm">
                <CalendarDays className="mt-0.5 h-4 w-4" />
                <div>
                  <p className="text-[12px] text-text">
                    Haftawari report
                  </p>
                  <p className="text-[11px]">Simple summary pao</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="mb-6 flex flex-col w-full">
            {msg.role === "user" ? (
              <div className="ml-auto bg-brand text-white px-4 py-2.5 rounded-2xl rounded-tr-sm shadow-sm max-w-[85%] text-[15px] leading-relaxed relative group">
                <span className="absolute -left-12 top-2 text-[10px] text-muted opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                {msg.content}
              </div>
            ) : (
              <div className="mr-auto flex flex-col w-full max-w-[100%]">
                <span className="text-[11px] text-muted uppercase font-medium tracking-wider mb-1 px-1">Artha</span>
                
                {msg.content === "" && isStreaming && !msg.toolCall && !msg.structuredData && (
                   <div className="bg-surface border border-border rounded-xl rounded-tl-sm p-4 shadow-sm w-fit">
                     <div className="flex space-x-1.5 items-center h-4">
                       <div className="w-1.5 h-1.5 bg-muted rounded-full animate-pulse"></div>
                       <div className="w-1.5 h-1.5 bg-muted rounded-full animate-pulse delay-75"></div>
                       <div className="w-1.5 h-1.5 bg-muted rounded-full animate-pulse delay-150"></div>
                     </div>
                   </div>
                )}
                
                {msg.content === "" && msg.toolCall && !msg.structuredData && (
                   <div className="bg-surface border border-border rounded-xl rounded-tl-sm p-3 shadow-sm w-fit flex items-center gap-2">
                     <Loader2 className="w-4 h-4 animate-spin text-brand" />
                     <span className="text-sm text-muted">{msg.toolCall} chalu hai...</span>
                   </div>
                )}

                {msg.content && (
                  <div className="bg-surface border border-border rounded-xl rounded-tl-sm p-4 shadow-sm w-full">
                    {msg.isVoice && (
                      <div className="mb-2 flex items-center gap-2 text-xs text-muted"> 
                        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                        Voice Response
                      </div>
                    )}
                    <div className="prose prose-sm prose-invert max-w-none prose-p:m-0 prose-p:text-[15px] prose-p:leading-[1.6] prose-p:text-text">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {msg.structuredData && (
                  <div className="mt-2 w-full">
                    <StructuredData data={msg.structuredData} format={msg.responseFormat || undefined} />
                  </div>
                )}

                {msg.proactiveInsight && (
                  <div className="mt-2 text-[13px] bg-[#FFF8EF] border border-[#EFDFC9] text-[#6B4B3A] px-3 py-2 rounded-xl self-start flex items-center gap-2 shadow-sm font-medium">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>{msg.proactiveInsight}</span>
                  </div>
                )}
              </div>
            )}
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
