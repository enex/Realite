import { notFound } from "next/navigation";

import { DocsDetailPageContent } from "@/src/components/docs/docs-detail-page-content";
import { renderDocsPageHtml } from "@/src/lib/docs";
import { getDocsPageBySlug, listDocsPages } from "@/src/lib/docs-pages";

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

      <DocsDetailPageContent slug={slug} html={rendered.html} allPages={allPages} />
    </main>
  );
}
