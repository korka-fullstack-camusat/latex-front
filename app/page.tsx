"use client";

import { useState, useCallback, useRef } from "react";
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

const FAQ = [
  {
    q: "Quelle IA est utilisée ?",
    a: "Claude (Anthropic) — le même modèle qui alimente Claude.ai. La conversion se fait entièrement via l'API officielle Anthropic.",
  },
  {
    q: "Quelle est la limite de taille ?",
    a: "20 Mo par fichier .docx. Les documents très longs sont découpés automatiquement en plusieurs appels API puis réassemblés.",
  },
  {
    q: "Les équations mathématiques sont-elles supportées ?",
    a: "Oui. Les équations inline sont converties en $…$ et les équations display en \\begin{equation}…\\end{equation}.",
  },
  {
    q: "Les blocs de code sont-ils supportés ?",
    a: "Oui. Le code est détecté et converti en \\begin{lstlisting}[language=Python/Bash/SQL/…].",
  },
  {
    q: "Comment compiler le fichier .tex ?",
    a: "Placez tous les fichiers du ZIP dans le même dossier puis lancez : pdflatex document.tex (deux fois pour les références).",
  },
  {
    q: "Que faire si l'API est en panne ?",
    a: "Le backend retente automatiquement jusqu'à 3 fois en cas d'erreur serveur. Si le problème persiste, réessayez dans quelques minutes.",
  },
];

export default function Home() {
  const [file, setFile]       = useState<File | null>(null);
  const [status, setStatus]   = useState<Status>("idle");
  const [result, setResult]   = useState<Result | null>(null);
  const [error, setError]     = useState("");
  const [template, setTemplate] = useState<Template>("auto");
  const [copied, setCopied]   = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const MAX_SIZE_MB = 20;

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    setError("");
    setStatus("idle");
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

      // Extract .tex content from ZIP for preview
      let latexContent = "";
      try {
        const zip = await JSZip.loadAsync(blob);
        const texFile = zip.file("document.tex");
        if (texFile) latexContent = await texFile.async("string");
      } catch {
        // preview not critical
      }

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

  const copyLatex = async () => {
    if (!result?.latexContent) return;
    await navigator.clipboard.writeText(result.latexContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isConverting = status === "converting";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100 flex flex-col items-center p-4 py-10">

      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-100 border border-indigo-200 mb-4">
          <span className="text-3xl">⚗️</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Word <span className="text-slate-400">→</span> LaTeX
        </h1>
        <p className="text-slate-500 mt-2 text-sm">
          Convertissez vos documents Word en code LaTeX compilable
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-lg bg-white/80 backdrop-blur border border-slate-200 rounded-3xl shadow-xl p-6">

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
            <span className="mt-0.5 shrink-0 text-base">⚠️</span>
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
              Conversion en cours… (peut prendre 30–60 s)
            </>
          ) : (
            "⚗️ Convertir en LaTeX"
          )}
        </button>

        {/* Cancel */}
        {isConverting && (
          <button
            onClick={cancel}
            className="mt-2 w-full py-2 px-6 rounded-xl font-semibold text-sm transition-all
              bg-transparent border border-slate-300 text-slate-500 hover:border-slate-500 hover:text-slate-700"
          >
            Annuler
          </button>
        )}

        {/* Progress hint */}
        {isConverting && (
          <p className="mt-3 text-center text-xs text-slate-400">
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

      {/* LaTeX Preview */}
      {status === "success" && result?.latexContent && (
        <div className="mt-6 w-full max-w-3xl bg-white/80 backdrop-blur border border-slate-200 rounded-3xl shadow-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">Aperçu du code LaTeX</h2>
            <button
              onClick={copyLatex}
              className={[
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                copied
                  ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-400",
              ].join(" ")}
            >
              {copied ? "✅ Copié !" : "📋 Copier le code"}
            </button>
          </div>
          <pre className="text-xs font-mono text-slate-700 bg-slate-50 rounded-xl p-4 overflow-auto max-h-96 whitespace-pre-wrap break-all">
            {result.latexContent}
          </pre>
        </div>
      )}

      {/* Features */}
      <div className="mt-8 grid grid-cols-3 gap-3 w-full max-w-lg text-center">
        {[
          { icon: "🔤", label: "Formatage préservé",  desc: "Gras, italique, listes, tableaux" },
          { icon: "🖼",  label: "Images extraites",    desc: "Figures numérotées dans le ZIP" },
          { icon: "📚", label: "Bibliographie",        desc: "BibTeX auto (APA, IEEE…)" },
          { icon: "∑",  label: "Maths",                desc: "Équations inline et display" },
          { icon: "💻", label: "Code",                 desc: "Python, Bash, SQL, C…" },
          { icon: "📐", label: "5 templates",          desc: "Article, IEEE, Beamer…" },
        ].map((f) => (
          <div key={f.label} className="bg-white/60 border border-slate-200 rounded-2xl p-3">
            <div className="text-2xl mb-1">{f.icon}</div>
            <p className="text-xs font-semibold text-slate-700">{f.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="mt-8 w-full max-w-lg">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">FAQ</h2>
        <div className="flex flex-col gap-2">
          {FAQ.map((item, i) => (
            <div key={i} className="bg-white/80 border border-slate-200 rounded-2xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <span>{item.q}</span>
                <span className="ml-2 shrink-0 text-slate-400 text-xs">{openFaq === i ? "▲" : "▼"}</span>
              </button>
              {openFaq === i && (
                <p className="px-4 pb-3 text-sm text-slate-600 border-t border-slate-100 pt-2">
                  {item.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="mt-8 text-slate-400 text-xs">Propulsé par Claude (Anthropic)</p>
    </main>
  );
}
