"use client";

import { useState } from "react";

type OrganizerProfileEditorProps = {
  initialEnabled: boolean;
  initialDisplayName: string | null;
  initialBio: string | null;
  initialWebsiteUrl: string | null;
};

export function OrganizerProfileEditor({
  initialEnabled,
  initialDisplayName,
  initialBio,
  initialWebsiteUrl,
}: OrganizerProfileEditorProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const [bio, setBio] = useState(initialBio ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(initialWebsiteUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/organizer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          displayName: displayName.trim() || null,
          bio: bio.trim() || null,
          websiteUrl: websiteUrl.trim() || null,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Speichern fehlgeschlagen");
      }
      setMessage("Veranstalterprofil gespeichert.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">Veranstalterprofil bearbeiten</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Aktiviere dein Profil und passe Name, Kurzbeschreibung und Website an.
      </p>
      <form onSubmit={onSubmit} className="mt-4 grid gap-3">
        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4"
          />
          Als Veranstalter sichtbar
        </label>
        <label className="grid gap-1 text-sm">
          <span>Anzeigename</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={80}
            className="rounded-lg border border-input px-3 py-2"
            placeholder="z. B. Realite Community Köln"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>Kurzbeschreibung</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={600}
            rows={3}
            className="rounded-lg border border-input px-3 py-2"
            placeholder="Was macht deine Events besonders?"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>Website</span>
          <input
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            maxLength={500}
            className="rounded-lg border border-input px-3 py-2"
            placeholder="https://..."
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="w-fit rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
        >
          Speichern
        </button>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </form>
    </section>
  );
}
