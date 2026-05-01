"use client";

import { useState } from "react";

import { toast } from "@/src/components/toaster";

export function JoinPageClient({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "joining" | "done" | "error">("idle");

  async function joinGroup() {
    setState("joining");

    const response = await fetch(`/api/groups/join/${token}`, {
      method: "POST"
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setState("error");
      toast.error(payload.error ?? "Beitritt fehlgeschlagen");
      return;
    }

    setState("done");
    toast.success("Du bist jetzt Mitglied der Gruppe. Zurück zum Dashboard.");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-4 py-16">
      <section className="w-full rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-foreground">Gruppe beitreten</h1>
        <p className="mt-3 text-muted-foreground">
          {state === "done"
            ? "Du bist Mitglied. Über „Zur App“ kommst du zum Dashboard."
            : state === "error"
              ? "Der Beitritt ist fehlgeschlagen. Bitte versuche es erneut oder nutze einen neuen Einladungslink."
              : "Du kannst dieser Gruppe mit einem Klick beitreten."}
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={joinGroup}
            disabled={state === "joining" || state === "done"}
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {state === "joining" ? "Wird beigetreten..." : "Jetzt beitreten"}
          </button>
          <a href="/" className="rounded-lg border border-input px-4 py-2 text-sm font-semibold text-foreground">
            Zur App
          </a>
        </div>
      </section>
    </main>
  );
}
