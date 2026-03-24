"use client";

import { Camera, Image as GalleryIcon, File as FileIcon } from "lucide-react";

type AttachSheetProps = {
  open: boolean;
  onClose: () => void;
  onCameraPick: () => void;
  onGalleryPick: () => void;
  onFilePick: () => void;
};

export function AttachSheet({
  open,
  onClose,
  onCameraPick,
  onGalleryPick,
  onFilePick,
}: AttachSheetProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#181818] rounded-t-2xl p-6 pb-8 shadow-2xl border-t border-[#222]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-4">
          <button
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#232323] hover:bg-[#222] text-left"
            onClick={onCameraPick}
          >
            <Camera className="w-6 h-6 text-amber-400" />
            <span className="text-[15px] text-foreground">
              Photo kheecho{" "}
              <span className="text-muted text-[12px] ml-2">(Camera)</span>
            </span>
          </button>
          <button
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#232323] hover:bg-[#222] text-left"
            onClick={onGalleryPick}
          >
            <GalleryIcon className="w-6 h-6 text-blue-400" />
            <span className="text-[15px] text-foreground">
              Gallery se chuno{" "}
              <span className="text-muted text-[12px] ml-2">(Gallery)</span>
            </span>
          </button>
          <button
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#232323] hover:bg-[#222] text-left"
            onClick={onFilePick}
          >
            <FileIcon className="w-6 h-6 text-green-400" />
            <span className="text-[15px] text-foreground">
              File jodo{" "}
              <span className="text-muted text-[12px] ml-2">(File)</span>
            </span>
          </button>
        </div>
        <button
          className="mt-6 w-full py-2 rounded-xl bg-[#232323] hover:bg-[#222] text-muted text-[15px]"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
