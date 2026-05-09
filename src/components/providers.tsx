"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { RealiteThemeProvider } from "@/src/lib/theme";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
          },
        },
      })
  );
  return (
    <RealiteThemeProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </RealiteThemeProvider>
  );
}
