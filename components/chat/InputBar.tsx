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
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-background pointer-events-none pb-6 border-t border-border">
      <div className="max-w-3xl mx-auto pointer-events-auto">
        <div className="flex overflow-x-auto gap-2 pb-3 mb-1 scrollbar-none px-1">
          {['Aaj ki sale', 'Udhaar list', 'Top customers', 'Din ka summary'].map((chip) => (
            <button
              key={chip}
              onClick={() => onSend(chip)}
              className="flex-shrink-0 bg-surface border border-border text-muted px-4 py-1.5 rounded-full text-[13px] font-medium hover:bg-border transition-colors shadow-sm whitespace-nowrap"
            >
              {chip}
            </button>
          ))}
        </div>

        {selectedFileName && (
          <div className="mb-2 inline-flex items-center gap-2 border border-border bg-surface rounded-full px-3 py-1.5 text-[12px] text-muted">
            <FileText className="w-3.5 h-3.5" />
            <span className="max-w-[220px] truncate">{selectedFileName}</span>  
            <button
              type="button"
              onClick={() => {
                setSelectedFileName("");
                if (fileInputRef.current) fileInputRef.current.value = "";      
              }}
              className="text-muted hover:text-text"
              aria-label="selected file hatao"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <div className="relative flex items-center bg-surface rounded-2xl border border-border focus-within:border-brand transition-colors overflow-hidden shadow-sm"> 
          <button
            type="button"
            onClick={onAttach}
            className="absolute left-3 p-2 text-muted hover:text-text transition-colors rounded-full hover:bg-border/50"
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
            className="w-full bg-transparent resize-none py-4 pl-14 pr-24 text-[15px] outline-none placeholder:text-muted focus:ring-0 leading-tight text-text"
            rows={1}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={onVoiceNote}
            className={cn(
              "absolute right-12 p-2 rounded-full transition-colors",
              isRecording
                ? "bg-danger/20 text-danger"
                : "text-muted hover:text-text hover:bg-border/50",        
            )}
            aria-label="voice note bhejo"
          >
            <Mic className="w-5 h-5" />
          </button>
          <button
            onClick={() => onSend(input)}
            disabled={isLoading || !input.trim()}
            className="absolute right-3 p-2 text-white disabled:text-muted transition-colors rounded-full bg-brand hover:bg-[#b85b1a] disabled:bg-border"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
