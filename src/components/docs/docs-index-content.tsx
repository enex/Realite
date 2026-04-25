"use client";

import type { DocsPage } from "@/src/lib/docs-pages";
import { MCP_SERVER_FLAG } from "@/src/lib/posthog/flag-keys";
import { useRealiteFeatureFlag } from "@/src/lib/posthog/feature-flags";

const MCP_DOCS_SLUG = "mcp-und-oauth";

export function DocsIndexContent({ pages }: { pages: DocsPage[] }) {
  const mcpServerEnabled = useRealiteFeatureFlag(MCP_SERVER_FLAG, false);
  const visiblePages = pages.filter((page) => page.slug !== MCP_DOCS_SLUG || mcpServerEnabled);

  return (
    <section className="mt-6 grid gap-4 sm:grid-cols-2">
      {visiblePages.map((page) => (
        <a
          key={page.slug}
          href={`/docs/${page.slug}`}
          className="rounded-xl border border-border bg-card p-5 shadow-sm transition hover:border-teal-300 hover:bg-teal-50"
        >
          <p className="text-lg font-semibold text-foreground">{page.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{page.description}</p>
        </a>
      ))}
    </section>
  );
}
