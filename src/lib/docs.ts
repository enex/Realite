import { readFile } from "node:fs/promises";
import path from "node:path";

import { marked } from "marked";

export type DocsPage = {
  slug: string;
  title: string;
  description: string;
  fileName: string;
};

const DOCS_PAGES: DocsPage[] = [
  {
    slug: "was-ist-realite",
    title: "Was ist Realite?",
    description: "Überblick über Ziel, Kernidee und Begriffe.",
    fileName: "was-ist-realite.md"
  },
  {
    slug: "schnellstart",
    title: "Schnellstart",
    description: "In wenigen Schritten von Login bis zum ersten Match.",
    fileName: "schnellstart.md"
  },
  {
    slug: "gruppen-und-kontakte",
    title: "Gruppen und Kontakte",
    description: "Gruppenlogik, Kontaktverwaltung und Google-Kontakte-Sync.",
    fileName: "gruppen-und-kontakte.md"
  },
  {
    slug: "events-und-matching",
    title: "Events und Matching",
    description: "Wie Events, Verfügbarkeit und Vorschläge zusammenarbeiten.",
    fileName: "events-und-matching.md"
  },
  {
    slug: "faq",
    title: "FAQ",
    description: "Häufige Fragen, Fehlerbilder und schnelle Lösungen.",
    fileName: "faq.md"
  }
];

const docsFolder = path.join(process.cwd(), "content", "docs");

export function listDocsPages() {
  return DOCS_PAGES;
}

export function getDocsPageBySlug(slug: string) {
  return DOCS_PAGES.find((page) => page.slug === slug) ?? null;
}

export async function renderDocsPageHtml(slug: string) {
  const page = getDocsPageBySlug(slug);

  if (!page) {
    return null;
  }

  const absolutePath = path.join(docsFolder, page.fileName);
  const markdown = await readFile(absolutePath, "utf8");
  const html = await Promise.resolve(marked.parse(markdown));

  return {
    page,
    html
  };
}
