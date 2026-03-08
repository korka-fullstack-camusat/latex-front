"use client";

interface ResultCardProps {
  blob: Blob;
  filename: string;
  hasBibliography: boolean;
  imageCount: number;
}

export default function ResultCard({ blob, filename, hasBibliography, imageCount }: ResultCardProps) {
  const download = () => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">✅</span>
        <span className="font-semibold text-emerald-700">Conversion réussie !</span>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-5">
        <Badge icon="📄" label="document.tex" color="slate" />
        {hasBibliography && <Badge icon="📚" label="references.bib" color="amber" />}
        {imageCount > 0 && (
          <Badge
            icon="🖼"
            label={`${imageCount} image${imageCount > 1 ? "s" : ""} extraite${imageCount > 1 ? "s" : ""}`}
            color="blue"
          />
        )}
      </div>

      {/* Contenu du ZIP */}
      <p className="text-xs text-slate-500 mb-4">
        Le ZIP contient : <code className="text-slate-700">document.tex</code>
        {hasBibliography && <>, <code className="text-slate-700">references.bib</code></>}
        {imageCount > 0 && <>, les images au format <code className="text-slate-700">figure_N.png</code></>}.
        Placez tous les fichiers dans le même dossier avant de compiler avec{" "}
        <code className="text-slate-700">pdflatex</code>.
      </p>

      <button
        onClick={download}
        className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold rounded-xl transition-all text-sm flex items-center justify-center gap-2"
      >
        <span>⬇</span> Télécharger le ZIP
      </button>
    </div>
  );
}

function Badge({
  icon,
  label,
  color,
}: {
  icon: string;
  label: string;
  color: "slate" | "amber" | "blue";
}) {
  const cls = {
    slate: "bg-slate-100 text-slate-700",
    amber: "bg-amber-50 text-amber-700 border border-amber-200",
    blue: "bg-blue-50 text-blue-700 border border-blue-200",
  }[color];

  return (
    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${cls}`}>
      {icon} {label}
    </span>
  );
}
