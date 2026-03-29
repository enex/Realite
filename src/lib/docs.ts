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
    slug: "ohne-kalender-starten",
    title: "Ohne Kalender starten",
    description: "Wie Realite ohne verbundenen Kalender sinnvoll nutzbar bleibt.",
    fileName: "ohne-kalender-starten.md"
  },
  {
    slug: "login-kalender-und-provider",
    title: "Login, Kalender und Provider",
    description: "Welche Funktionen sofort laufen und wo Realite heute noch an einzelne Verbindungen gebunden ist.",
    fileName: "login-kalender-und-provider.md"
  },
  {
    slug: "login-und-onboarding-pfade",
    title: "Login- und Onboarding-Pfade",
    description: "Wie Google, Apple, Microsoft und der dev-only Testzugang denselben Realite-Kernflow tragen.",
    fileName: "login-und-onboarding-pfade.md"
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
    slug: "sichtbarkeit-und-relevanz",
    title: "Sichtbarkeit und Relevanz",
    description: "Wie Realite soziale Kreise, Matching und Freigaben sauber trennt.",
    fileName: "sichtbarkeit-und-relevanz.md"
  },
  {
    slug: "vor-ort-sichtbarkeit",
    title: "Vor-Ort-Sichtbarkeit",
    description: "Wie Realite eventgebundene Presence bewusst und kontrolliert denkt.",
    fileName: "vor-ort-sichtbarkeit.md"
  },
  {
    slug: "sicherheit-bei-vor-ort-und-festival-kontexten",
    title: "Sicherheit bei Vor-Ort- und Festival-Kontexten",
    description: "Welche Schutzregeln für spätere On-Site- und Socializing-Fälle gelten sollen.",
    fileName: "sicherheit-bei-vor-ort-und-festival-kontexten.md"
  },
  {
    slug: "faq",
    title: "FAQ",
    description: "Häufige Fragen, Fehlerbilder und schnelle Lösungen.",
    fileName: "faq.md"
  },
  {
    slug: "mcp-und-oauth",
    title: "MCP und OAuth",
    description: "Realite per MCP verbinden, authentifizieren und verwenden.",
    fileName: "mcp-und-oauth.md"
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
