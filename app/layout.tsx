import type { Metadata, Viewport } from "next";

import { SiteFooter } from "@/src/components/site-footer";

import "./globals.css";

const SITE_DESCRIPTION = "Gruppenbasierte Event-Matches auf Basis deines Kalenders";
const DEFAULT_OG_IMAGE_PATH = "/opengraph-image";
const DEFAULT_OG_IMAGE_ALT = "Realite - Weniger Scrollen. Mehr echte Momente.";

function resolveMetadataBase() {
  const configured =
    process.env.REALITE_APP_URL ?? process.env.BETTER_AUTH_URL ?? process.env.NEXTAUTH_URL ?? "https://realite.app";

  try {
    return new URL(configured);
  } catch {
    return new URL(`https://${configured}`);
  }
}

export const metadata: Metadata = {
  title: "Realite",
  description: SITE_DESCRIPTION,
  applicationName: "Realite",
  metadataBase: resolveMetadataBase(),
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    locale: "de_DE",
    siteName: "Realite",
    url: "/",
    title: "Realite",
    description: SITE_DESCRIPTION,
    images: [
      {
        url: DEFAULT_OG_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: DEFAULT_OG_IMAGE_ALT
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Realite",
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE_PATH]
  },
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png", sizes: "48x48" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" }
    ],
    shortcut: [{ url: "/favicon.png", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }]
  }
};

export const viewport: Viewport = {
  themeColor: "#2F5D50"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-slate-100 text-slate-900">
        <div className="flex min-h-screen flex-col">
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
