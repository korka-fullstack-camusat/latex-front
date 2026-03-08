"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import JSZip from "jszip";
import DropZone from "@/components/DropZone";
import ResultCard from "@/components/ResultCard";

type Status = "idle" | "converting" | "success" | "error";
type Template = "auto" | "article" | "report" | "ieee" | "beamer";

interface Result {
  blob: Blob;
  filename: string;
  hasBibliography: boolean;
  imageCount: number;
  latexContent: string;
}

const TEMPLATES: { value: Template; label: string; desc: string }[] = [
  { value: "auto",    label: "Auto",    desc: "Claude choisit" },
  { value: "article", label: "Article", desc: "article standard" },
  { value: "report",  label: "Report",  desc: "rapport / thèse" },
  { value: "ieee",    label: "IEEE",    desc: "2 colonnes IEEE" },
  { value: "beamer",  label: "Beamer",  desc: "présentation" },
];

/* ── Artifact panel ────────────────────────────────────────────────────── */
function ArtifactPanel({
  latex,
  filename,
  onClose,
}: {
  latex: string;
  filename: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const lines = latex.split("\n");

  const copy = async () => {
    await navigator.clipboard.writeText(latex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e2e] text-slate-200 font-mono text-xs overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#181825] border-b border-[#313244] shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[11px]">⬡</span>
          <span className="text-slate-300 text-[13px] font-semibold">
            {filename.replace(/_latex\.zip$/, ".tex")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copy}
            className={[
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all border",
              copied
                ? "bg-emerald-900/60 border-emerald-600 text-emerald-300"
                : "bg-[#313244] border-[#45475a] text-slate-300 hover:bg-[#45475a]",
            ].join(" ")}
          >
            {copied ? "✓ Copié" : "Copier"}
          </button>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-6 h-6 rounded-md bg-[#313244] border border-[#45475a] text-slate-400 hover:text-slate-200 hover:bg-[#45475a] transition-all text-[13px] font-bold"
            title="Fermer"
          >
            ×
          </button>
        </div>
      </div>

      {/* Code body */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="hover:bg-white/[0.03]">
                <td className="select-none pl-4 pr-3 text-right text-[#585b70] w-10 shrink-0 align-top py-[1px]">
                  {i + 1}
                </td>
                <td className="pl-2 pr-4 whitespace-pre align-top py-[1px] text-slate-300">
                  <LineColored line={line} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* Very lightweight LaTeX syntax colouring (no dependency needed) */
function LineColored({ line }: { line: string }) {
  // \command  → purple | {arg} braces → orange | % comment → grey | numbers → cyan
  const parts: { text: string; color?: string }[] = [];

  if (line.trimStart().startsWith("%")) {
    return <span className="text-[#585b70]">{line}</span>;
  }

  const tokenRe = /(\\[a-zA-Z]+\*?)|(\{|\})|(%.*$)|(\d+)/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = tokenRe.exec(line)) !== null) {
    if (m.index > last) parts.push({ text: line.slice(last, m.index) });
    if (m[1]) parts.push({ text: m[1], color: "#cba6f7" });       // command
    else if (m[2]) parts.push({ text: m[2], color: "#fab387" });   // brace
    else if (m[3]) parts.push({ text: m[3], color: "#585b70" });   // comment
    else if (m[4]) parts.push({ text: m[4], color: "#89dceb" });   // number
    last = m.index + m[0].length;
  }
  if (last < line.length) parts.push({ text: line.slice(last) });

  return (
    <>
      {parts.map((p, i) =>
        p.color ? (
          <span key={i} style={{ color: p.color }}>{p.text}</span>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

/* ── Main page ─────────────────────────────────────────────────────────── */
export default function Home() {
  const [file, setFile]           = useState<File | null>(null);
  const [status, setStatus]       = useState<Status>("idle");
  const [result, setResult]       = useState<Result | null>(null);
  const [error, setError]         = useState("");
  const [template, setTemplate]   = useState<Template>("auto");
  const [artifactOpen, setArtifactOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const MAX_SIZE_MB = 20;

  // Open artifact automatically when result arrives
  useEffect(() => {
    if (result?.latexContent) setArtifactOpen(true);
  }, [result]);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    setError("");
    setStatus("idle");
    setArtifactOpen(false);
  }, []);

  const cancel = () => abortRef.current?.abort();

  const convert = async () => {
    if (!file) return;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Le fichier dépasse la limite de ${MAX_SIZE_MB} Mo.`);
      setStatus("error");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("converting");
    setError("");
    setResult(null);
    setArtifactOpen(false);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("template", template);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://latex-api-3sgi.onrender.com";
      const res = await fetch(`${apiUrl}/convert`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      if (!res.ok) {
        const data: { detail?: string } = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? `Erreur serveur (${res.status})`);
      }

      const blob = await res.blob();
      const hasBibliography = res.headers.get("X-Has-Bibliography") === "true";
      const imageCount      = parseInt(res.headers.get("X-Image-Count") ?? "0", 10);
      const disposition     = res.headers.get("Content-Disposition") ?? "";
      const filename        = disposition.match(/filename="(.+?)"/)?.[1] ?? "document_latex.zip";

      let latexContent = "";
      try {
        const zip = await JSZip.loadAsync(blob);
        const texFile = zip.file("document.tex");
        if (texFile) latexContent = await texFile.async("string");
      } catch { /* preview not critical */ }

      setResult({ blob, filename, hasBibliography, imageCount, latexContent });
      setStatus("success");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Conversion annulée.");
      } else {
        setError(err instanceof Error ? err.message : "Une erreur inattendue est survenue.");
      }
      setStatus("error");
    } finally {
      abortRef.current = null;
    }
  };

  const isConverting = status === "converting";
  const showArtifact = artifactOpen && !!result?.latexContent;

  /* ── Converter panel content (shared) ─────────────────────────────── */
  const converterContent = (
    <div className="w-full max-w-lg">
      {/* Welcome banner */}
      <div className="text-center mb-6 px-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-100 border border-indigo-200 mb-4">
          <span className="text-3xl">⚗️</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Bienvenue sur Word <span className="text-slate-400">→</span> LaTeX
        </h1>
        <p className="text-slate-600 mt-3 text-sm leading-relaxed max-w-sm mx-auto">
          Transformez vos documents Word en code LaTeX compilable en quelques secondes.
          Déposez votre fichier <span className="font-semibold text-indigo-600">.docx</span> ci-dessous pour commencer.
        </p>
      </div>

      {/* Card */}
      <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-3xl shadow-xl p-6">
        <DropZone file={file} onFile={handleFile} disabled={isConverting} maxSizeMb={MAX_SIZE_MB} />

        {/* Template selector */}
        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Template LaTeX</p>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.value}
                onClick={() => setTemplate(t.value)}
                disabled={isConverting}
                className={[
                  "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                  template === t.value
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300",
                  isConverting ? "opacity-50 cursor-not-allowed" : "",
                ].join(" ")}
                title={t.desc}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <span className="mt-0.5 shrink-0">⚠️</span>
            <div className="flex-1">
              <p className="font-semibold mb-0.5">Erreur de conversion</p>
              <p className="text-red-600">{error}</p>
            </div>
            <button
              onClick={convert}
              disabled={!file}
              className="shrink-0 px-3 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 font-semibold text-xs transition-all"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Convert button */}
        <button
          onClick={convert}
          disabled={!file || isConverting}
          className="mt-5 w-full py-3 px-6 rounded-xl font-semibold text-sm transition-all
            bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white
            disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed
            flex items-center justify-center gap-2"
        >
          {isConverting ? (
            <>
              <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Conversion en cours…
            </>
          ) : (
            "⚗️ Convertir en LaTeX"
          )}
        </button>

        {/* Cancel */}
        {isConverting && (
          <button
            onClick={cancel}
            className="mt-2 w-full py-2 px-6 rounded-xl font-semibold text-sm
              bg-transparent border border-slate-300 text-slate-500 hover:border-slate-500 hover:text-slate-700 transition-all"
          >
            Annuler
          </button>
        )}

        {isConverting && (
          <p className="mt-3 text-center text-xs text-slate-400">
            Claude analyse le document et génère le LaTeX…
          </p>
        )}

        {/* Result */}
        {status === "success" && result && (
          <>
            <ResultCard
              blob={result.blob}
              filename={result.filename}
              hasBibliography={result.hasBibliography}
              imageCount={result.imageCount}
            />
            {result.latexContent && !showArtifact && (
              <button
                onClick={() => setArtifactOpen(true)}
                className="mt-3 w-full py-2 px-4 rounded-xl text-sm font-semibold border border-indigo-200
                  bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
              >
                <span>⬡</span> Afficher le code LaTeX
              </button>
            )}
          </>
        )}
      </div>

      <p className="mt-6 text-slate-400 text-xs text-center">Propulsé par Claude (Anthropic)</p>
    </div>
  );

  /* ── Split layout (artifact open) ─────────────────────────────────── */
  if (showArtifact) {
    return (
      <div className="flex h-screen w-screen overflow-hidden bg-slate-100">
        {/* Left: converter */}
        <div className="w-[40%] h-full overflow-y-auto bg-gradient-to-br from-slate-100 via-white to-slate-100 flex flex-col items-center p-6 py-10 shrink-0">
          {converterContent}
        </div>

        {/* Right: artifact */}
        <div className="flex-1 h-full border-l border-[#313244]">
          <ArtifactPanel
            latex={result!.latexContent}
            filename={result!.filename}
            onClose={() => setArtifactOpen(false)}
          />
        </div>
      </div>
    );
  }

  /* ── Normal (centered) layout ─────────────────────────────────────── */
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100 flex flex-col items-center p-4 py-10">
      {converterContent}
    </main>
  );
}
