import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Word → LaTeX Converter",
  description: "Convertissez vos documents Word en code LaTeX compilable avec images et bibliographie.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
