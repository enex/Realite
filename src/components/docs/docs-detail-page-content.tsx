"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import type { DocsPage } from "@/src/lib/docs-pages";
import { MCP_SERVER_FLAG } from "@/src/lib/posthog/flag-keys";
import { useRealiteFeatureFlag, useRealiteFeatureFlagState } from "@/src/lib/posthog/feature-flags";

const MCP_DOCS_SLUG = "mcp-und-oauth";

export function DocsDetailPageContent({
  slug,
  html,
  allPages
}: {
  slug: string;
  html: string;
  allPages: DocsPage[];
}) {
  const router = useRouter();
  const mcpServerEnabled = useRealiteFeatureFlag(MCP_SERVER_FLAG, false);
  const mcpServerState = useRealiteFeatureFlagState(MCP_SERVER_FLAG);
  const mcpPageHidden = slug === MCP_DOCS_SLUG && mcpServerState === false;
  const visiblePages = allPages.filter((page) => page.slug !== MCP_DOCS_SLUG || mcpServerEnabled);

  useEffect(() => {
    if (mcpPageHidden) {
      router.replace("/docs");
    }
  }, [mcpPageHidden, router]);

  if (slug === MCP_DOCS_SLUG && mcpServerState !== true) {
    return null;
  }

  return (
    <>
      <article className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div
          className="docs-markdown text-foreground [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-input [&_blockquote]:pl-4 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_h1]:mb-4 [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:mb-3 [&_h2]:mt-7 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-xl [&_h3]:font-semibold [&_li]:mb-1 [&_p]:mb-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:p-4 [&_ul]:list-disc [&_ul]:pl-6"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </article>

      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Weitere Seiten</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {visiblePages
            .filter((entry) => entry.slug !== slug)
            .map((entry) => (
              <a
                key={entry.slug}
                href={`/docs/${entry.slug}`}
                className="rounded-lg border border-border px-3 py-2 text-sm text-foreground transition hover:border-teal-300 hover:bg-teal-50"
              >
                {entry.title}
              </a>
            ))}
        </div>
      </section>
    </>
  );
}
