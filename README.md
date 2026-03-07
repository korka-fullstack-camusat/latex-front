# Word → LaTeX — Frontend

Interface Next.js pour convertir des documents Word en LaTeX via l'API backend.

## Stack
- **Next.js 14** (App Router)
- **Tailwind CSS**
- **TypeScript**

## Installation

```bash
npm install
cp .env.example .env.local
# Éditez .env.local avec l'URL de votre backend
```

## Configuration

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Lancer en dev

```bash
npm run dev
# → http://localhost:3000
```

## Build production

```bash
npm run build && npm start
```

## Fonctionnalités

- Glisser-déposer ou sélection de fichier `.docx`
- Affichage du statut de conversion (spinner)
- Badges : `document.tex`, `references.bib`, nombre d'images
- Téléchargement du ZIP en un clic
- Instructions de compilation LaTeX intégrées

## Backend requis

→ [latex-api](https://github.com/korka-fullstack-camusat/latex-api)
