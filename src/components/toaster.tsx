"use client";

import { Toaster as SonnerToaster } from "sonner";

import { useRealiteTheme } from "@/src/lib/theme";

const REVALIDATING_TOAST_ID = "revalidating";

/** Theme-erhaltender Toaster (Sonner). Für globale Toasts, z. B. „Aktualisierung im Hintergrund". */
export function Toaster() {
  const { resolvedTheme } = useRealiteTheme();

  return (
    <SonnerToaster
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="bottom-center"
      toastOptions={{
        classNames: {
          toast: "!border-border !bg-card !text-foreground !shadow-md",
          title: "!font-semibold !text-foreground",
          description: "!text-muted-foreground",
          loading: "!border-border !bg-card !text-foreground",
          closeButton: "!border-border !text-muted-foreground hover:!bg-muted",
        },
      }}
      className="toaster"
    />
  );
}

export { toast } from "sonner";
export { REVALIDATING_TOAST_ID };
