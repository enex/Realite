"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LinkSimple,
  LinkBreak,
  Trash,
  Check,
  Copy,
} from "@phosphor-icons/react";

type SinglesOption = {
  slug: string;
  name: string;
};

type Props = {
  slug: string;
  label: string | null;
  singlesSlug: string | null;
  singlesEventName: string | null;
  qrUrl: string;
  singlesOptions: SinglesOption[];
};

export function ManageQrContent({
  slug,
  label: initialLabel,
  singlesSlug,
  singlesEventName,
  qrUrl,
  singlesOptions,
}: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [selectedSinglesSlug, setSelectedSinglesSlug] = useState(
    singlesSlug ?? "",
  );
  const [label, setLabel] = useState(initialLabel ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleCopyUrl() {
    await navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleLink() {
    if (!selectedSinglesSlug) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/qr/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ singlesSlug: selectedSinglesSlug }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleUnlink() {
    setSaving(true);
    try {
      const res = await fetch(`/api/qr/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ singlesSlug: null }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveLabel() {
    setSaving(true);
    try {
      const res = await fetch(`/api/qr/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim() || null }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/qr/${slug}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.push("/q");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-foreground">
          {initialLabel ?? `QR-Code /${slug}`}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platzhalter-QR-Code
        </p>
      </div>

      {/* URL */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          QR-Code URL
        </p>
        <div className="mt-2 flex items-center gap-2">
          <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-sm font-mono text-foreground">
            {qrUrl}
          </code>
          <button
            type="button"
            onClick={handleCopyUrl}
            className="shrink-0 rounded-lg border border-input bg-background p-2 hover:bg-muted"
            title="URL kopieren"
          >
            {copied ? (
              <Check aria-hidden className="h-4 w-4 text-teal-600" />
            ) : (
              <Copy aria-hidden className="h-4 w-4 text-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Linked singles event */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Verknüpftes Singles-hier-Event
        </p>

        {singlesSlug && singlesEventName ? (
          <div className="mt-3 flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-foreground">
                {singlesEventName}
              </p>
              <a
                href={`/singles/${singlesSlug}`}
                className="mt-1 inline-block text-xs text-teal-600 hover:underline"
              >
                Event ansehen →
              </a>
            </div>
            <button
              type="button"
              onClick={handleUnlink}
              disabled={saving}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-60"
            >
              <LinkBreak aria-hidden className="h-3.5 w-3.5" />
              Trennen
            </button>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Kein Event verknüpft
          </p>
        )}

        <div className="mt-4 border-t border-border pt-4">
          <p className="text-xs font-semibold text-muted-foreground">
            {singlesSlug ? "Mit anderem Event verknüpfen" : "Event verknüpfen"}
          </p>

          {singlesOptions.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Du hast noch keine Singles-hier-Events.{" "}
              <a href="/singles/new" className="text-teal-600 hover:underline">
                Jetzt erstellen →
              </a>
            </p>
          ) : (
            <div className="mt-2 flex gap-2">
              <select
                value={selectedSinglesSlug}
                onChange={(e) => setSelectedSinglesSlug(e.target.value)}
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="">– Event auswählen –</option>
                {singlesOptions.map((ev) => (
                  <option key={ev.slug} value={ev.slug}>
                    {ev.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleLink}
                disabled={!selectedSinglesSlug || saving}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
              >
                <LinkSimple aria-hidden className="h-4 w-4" />
                Verknüpfen
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Label */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Bezeichnung (optional)
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Hilft dir, den QR-Code wiederzuerkennen (z. B. Standort oder Charge).
        </p>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="z. B. Eingang Biergarten, Flyer Charge 2 …"
            maxLength={60}
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={handleSaveLabel}
            disabled={saving}
            className="shrink-0 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
          >
            Speichern
          </button>
        </div>
      </div>

      {/* Delete */}
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-destructive">
          QR-Code löschen
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Der QR-Code wird dauerhaft gelöscht. Gedruckte Codes leiten danach auf
          die Startseite weiter.
        </p>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-destructive bg-background px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
        >
          <Trash aria-hidden className="h-4 w-4" />
          {confirmDelete ? "Wirklich löschen?" : "QR-Code löschen"}
        </button>
        {confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className="ml-2 mt-3 text-xs text-muted-foreground underline"
          >
            Abbrechen
          </button>
        ) : null}
      </div>
    </div>
  );
}
