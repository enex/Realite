"use client";

import { useEffect, useRef } from "react";

import { toast } from "@/src/components/toaster";

/** Zeigt einen Fehler-Toast, wenn eine React-Query-Laden-Anfrage scheitert (ohne wiederholtes Spammen bei Re-Renders). */
export function useQueryErrorToast(queryError: unknown) {
  const lastMessage = useRef<string | null>(null);

  useEffect(() => {
    if (!queryError) {
      lastMessage.current = null;
      return;
    }
    const msg =
      queryError instanceof Error ? queryError.message : String(queryError);
    if (lastMessage.current === msg) {
      return;
    }
    lastMessage.current = msg;
    toast.error(msg);
  }, [queryError]);
}
