"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "@phosphor-icons/react";

export function CreateQrButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    try {
      const res = await fetch("/api/qr", { method: "POST" });
      if (!res.ok) throw new Error("Fehler beim Erstellen");
      const data = (await res.json()) as { qr: { slug: string } };
      router.push(`/q/${data.qr.slug}/manage` as never);
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCreate}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
    >
      <Plus aria-hidden className="h-4 w-4" />
      {loading ? "Wird erstellt…" : "Neuer QR-Code"}
    </button>
  );
}
