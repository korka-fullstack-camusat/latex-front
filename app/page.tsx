"use client";

import { useState, useCallback } from "react";
import DropZone from "@/components/DropZone";
import ResultCard from "@/components/ResultCard";

type Status = "idle" | "converting" | "success" | "error";

interface Result {
  blob: Blob;
  filename: string;
  hasBibliography: boolean;
  imageCount: number;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    setError("");
    setStatus("idle");
  }, []);

  const convert = async () => {
    if (!file) return;

    setStatus("converting");
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const res = await fetch(`${apiUrl}/convert`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data: { detail?: string } = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? `Erreur serveur (${res.status})`);
      }

      const blob = await res.blob();
      const hasBibliography = res.headers.get("X-Has-Bibliography") === "true";
      const imageCount = parseInt(res.headers.get("X-Image-Count") ?? "0", 10);
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const filename = disposition.match(/filename="(.+?)"/)?.[1] ?? "document_latex.zip";

      setResult({ blob, filename, hasBibliography, imageCount });
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur inattendue est survenue.");
      setStatus("error");
    }
  };

  const isConverting = status === "converting";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 mb-4">
          <span className="text-3xl">⚗️</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Word <span className="text-slate-500">→</span> LaTeX
        </h1>
        <p className="text-slate-400 mt-2 text-sm">
          Convertissez vos documents Word en code LaTeX compilable
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-lg bg-slate-900/60 backdrop-blur border border-slate-700/50 rounded-3xl shadow-2xl p-6">
        <DropZone file={file} onFile={handleFile} disabled={isConverting} />

        {/* Error */}
        {error && (
          <div className="mt-4 flex items-start gap-2.5 p-3.5 bg-red-950/40 border border-red-700/40 rounded-xl text-sm text-red-300">
            <span className="mt-0.5 shrink-0">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Convert button */}
        <button
          onClick={convert}
          disabled={!file || isConverting}
          className="mt-5 w-full py-3 px-6 rounded-xl font-semibold text-sm transition-all
            bg-indigo-600 hover:bg-indigo-500 active:scale-95
            disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed
            flex items-center justify-center gap-2"
        >
          {isConverting ? (
            <>
              <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Conversion en cours… (peut prendre 30–60 s)
            </>
          ) : (
            "⚗️ Convertir en LaTeX"
          )}
        </button>

        {/* Progress hint */}
        {isConverting && (
          <p className="mt-3 text-center text-xs text-slate-500">
            Claude analyse le document et génère le LaTeX…
          </p>
        )}

        {/* Result */}
        {status === "success" && result && (
          <ResultCard
            blob={result.blob}
            filename={result.filename}
            hasBibliography={result.hasBibliography}
            imageCount={result.imageCount}
          />
        )}
      </div>

      {/* Features */}
      <div className="mt-8 grid grid-cols-3 gap-3 w-full max-w-lg text-center">
        {[
          { icon: "🔤", label: "Formatage préservé", desc: "Gras, italique, listes, tableaux" },
          { icon: "🖼", label: "Images extraites", desc: "Figures numérotées dans le ZIP" },
          { icon: "📚", label: "Bibliographie", desc: "BibTeX auto (APA, IEEE…)" },
        ].map((f) => (
          <div key={f.label} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-3">
            <div className="text-2xl mb-1">{f.icon}</div>
            <p className="text-xs font-semibold text-slate-300">{f.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{f.desc}</p>
          </div>
        ))}
      </div>

      <p className="mt-6 text-slate-700 text-xs">Propulsé par Claude Opus 4.6</p>
    </main>
  );
}
