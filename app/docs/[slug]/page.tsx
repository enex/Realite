import { notFound } from "next/navigation";

import { getDocsPageBySlug, listDocsPages, renderDocsPageHtml } from "@/src/lib/docs";

export async function generateStaticParams() {
  return listDocsPages().map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = getDocsPageBySlug(slug);

  if (!page) {
    return {
      title: "Docs"
    };
  }

  return {
    title: `${page.title} | Realite Docs`,
    description: page.description
  };
}

export default async function DocsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const rendered = await renderDocsPageHtml(slug);

  if (!rendered) {
    notFound();
  }

  const allPages = listDocsPages();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between">
        <a href="/docs" className="text-sm font-semibold text-teal-700 hover:text-teal-800">
          ← Zur Docs-Übersicht
        </a>
      </div>

      <article className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div
          className="docs-markdown text-foreground [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-input [&_blockquote]:pl-4 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_h1]:mb-4 [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:mb-3 [&_h2]:mt-7 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-xl [&_h3]:font-semibold [&_li]:mb-1 [&_p]:mb-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:p-4 [&_ul]:list-disc [&_ul]:pl-6"
          dangerouslySetInnerHTML={{ __html: rendered.html }}
        />
      </article>

      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Weitere Seiten</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {allPages
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
    </main>
  );
}
