"use client";

import { useCallback, useRef, useState } from "react";

interface DropZoneProps {
  file: File | null;
  onFile: (f: File) => void;
  disabled?: boolean;
}

export default function DropZone({ file, onFile, disabled }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = useCallback(
    (f: File) => {
      if (f.name.toLowerCase().endsWith(".docx")) onFile(f);
    },
    [onFile]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handle(f);
  };

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={[
        "relative border-2 border-dashed rounded-2xl p-10 text-center transition-all select-none",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        dragging
          ? "border-indigo-400 bg-indigo-950/40 scale-[1.01]"
          : file
          ? "border-emerald-500 bg-emerald-950/20"
          : "border-slate-600 hover:border-slate-400 bg-slate-900/40",
      ].join(" ")}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".docx"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handle(f);
          e.target.value = "";
        }}
      />

      {file ? (
        <div className="flex flex-col items-center gap-2">
          <span className="text-5xl">📄</span>
          <p className="font-semibold text-emerald-300 text-lg truncate max-w-xs">{file.name}</p>
          <p className="text-sm text-slate-400">{(file.size / 1024).toFixed(1)} Ko · cliquez pour changer</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <span className="text-5xl">{dragging ? "📥" : "📂"}</span>
          <p className="font-semibold text-slate-300 text-lg">
            {dragging ? "Déposez ici !" : "Glissez votre fichier .docx"}
          </p>
          <p className="text-sm text-slate-500">ou cliquez pour parcourir</p>
        </div>
      )}
    </div>
  );
}
