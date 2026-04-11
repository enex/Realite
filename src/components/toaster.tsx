"use client";

import { useTheme } from "next-themes";
import { Toaster as SonnerToaster } from "sonner";

const REVALIDATING_TOAST_ID = "revalidating";

/** Theme-erhaltender Toaster (Sonner). Für globale Toasts, z. B. „Aktualisierung im Hintergrund". */
export function Toaster() {
  const { resolvedTheme } = useTheme();

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
