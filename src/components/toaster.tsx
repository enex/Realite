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
          toast:
            "!border-teal-200 !bg-teal-50 !text-teal-800 !shadow-md",
          title: "!text-teal-900 !font-semibold",
          description: "!text-teal-700",
          loading: "!border-teal-200 !bg-teal-50 !text-teal-800",
          closeButton: "!text-teal-600 !border-teal-200 hover:!bg-teal-100",
        },
      }}
      className="toaster"
    />
  );
}

export { toast } from "sonner";
export { REVALIDATING_TOAST_ID };
