"use client";

import { useEffect, useState } from "react";

function UrlRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <code className="mt-2 block break-all text-xs text-foreground">{value}</code>
    </div>
  );
}

export function MpcSettingsCard() {
  const [origin, setOrigin] = useState("https://realite.app");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const mcpUrl = `${origin}/api/mcp`;
  const metadataUrl = `${origin}/.well-known/oauth-protected-resource/api/mcp`;
  const docsUrl = `${origin}/docs/mcp-und-oauth`;

  return (
    <section className="mt-6 rounded-2xl border border-teal-200 bg-teal-50/60 p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">AI & MCP</p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">Realite mit deinem AI-Tool verbinden</h2>
          <p className="mt-2 max-w-2xl text-sm text-foreground">
            Realite hat einen eigenen MCP-Server. Du kannst ihn in kompatiblen AI-Tools eintragen, um Gruppen, Events,
            Vorschläge und Einstellungen direkt aus dem Tool zu lesen und zu ändern.
          </p>
        </div>
        <a
          href="/docs/mcp-und-oauth"
          className="inline-flex items-center justify-center rounded-full border border-teal-300 bg-card px-4 py-2 text-sm font-semibold text-teal-800 transition hover:bg-teal-100"
        >
          Anleitung öffnen
        </a>
      </div>

      <div className="mt-5 grid gap-3">
        <UrlRow label="MCP Server URL" value={mcpUrl} />
        <UrlRow label="OAuth Discovery URL" value={metadataUrl} />
      </div>

      <ol className="mt-5 space-y-2 text-sm text-foreground">
        <li>1. Öffne in deinem bevorzugten AI-Tool die MCP- oder Integrations-Einstellungen.</li>
        <li>2. Trage dort die MCP-Server-URL ein. Wenn das Tool Discovery bevorzugt, nutze die OAuth-Discovery-URL.</li>
        <li>3. Starte die Verbindung. Das Tool führt dich dann automatisch durch Login und Zugriff-Freigabe.</li>
      </ol>

      <p className="mt-4 text-xs text-muted-foreground">
        Detaillierte Hinweise und die unterstützten Endpunkte findest du unter{" "}
        <a href={docsUrl} className="font-semibold text-teal-800 underline underline-offset-2">
          {docsUrl}
        </a>
        .
      </p>
    </section>
  );
}
