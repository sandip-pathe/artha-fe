"use client";

import { Paperclip, Send, Mic, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

type InputBarProps = {
  input: string;
  setInput: (val: string) => void;
  isLoading: boolean;
  onSend: (text: string) => void;
  onAttach: () => void;
  onVoiceNote: () => void;
  isRecording: boolean;
  selectedFileName: string;
  setSelectedFileName: (val: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  handleFileSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export function InputBar({
  input,
  setInput,
  isLoading,
  onSend,
  onAttach,
  onVoiceNote,
  isRecording,
  selectedFileName,
  setSelectedFileName,
  fileInputRef,
  textareaRef,
  handleFileSelected,
}: InputBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-background pointer-events-none pb-6 border-t border-[#121212]">
      <div className="max-w-3xl mx-auto pointer-events-auto">
        {selectedFileName && (
          <div className="mb-2 inline-flex items-center gap-2 border border-[#232323] bg-[#0d0d0d] rounded-full px-3 py-1.5 text-[12px] text-muted">
            <FileText className="w-3.5 h-3.5" />
            <span className="max-w-[220px] truncate">{selectedFileName}</span>
            <button
              type="button"
              onClick={() => {
                setSelectedFileName("");
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="text-muted hover:text-foreground"
              aria-label="selected file hatao"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <div className="relative flex items-center bg-[#0a0a0a] rounded-2xl border border-[#333] focus-within:border-[#555] transition-colors overflow-hidden">
          <button
            type="button"
            onClick={onAttach}
            className="absolute left-3 p-2 text-muted hover:text-foreground transition-colors rounded-full hover:bg-[#1c1c1c]"
            aria-label="document jodo"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
            className="hidden"
            onChange={handleFileSelected}
          />
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend(input);
              }
            }}
            placeholder="Kuch bhi poochho..."
            className="w-full bg-transparent resize-none py-4 pl-14 pr-24 text-[15px] outline-none placeholder:text-muted/60 leading-tight"
            rows={1}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={onVoiceNote}
            className={cn(
              "absolute right-12 p-2 rounded-full transition-colors",
              isRecording
                ? "bg-green-700/30 text-green-400"
                : "text-muted hover:text-foreground hover:bg-[#1c1c1c]",
            )}
            aria-label="voice note bhejo"
          >
            <Mic className="w-5 h-5" />
          </button>
          <button
            onClick={() => onSend(input)}
            disabled={isLoading || !input.trim()}
            className="absolute right-3 p-2 text-foreground disabled:text-border transition-colors rounded-full bg-[#1c1c1c] hover:bg-[#2a2a2a] disabled:bg-transparent"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted">
          Tip: Mic dabao aur seedha Hindi mein bolo. Voice note ke liye right
          mic dabao.
        </p>
      </div>
    </div>
  );
}
