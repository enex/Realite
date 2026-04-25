import { DocsIndexContent } from "@/src/components/docs/docs-index-content";
import { listDocsPages } from "@/src/lib/docs-pages";

export const metadata = {
  title: "Realite Docs",
  description: "Dokumentation zur Nutzung von Realite"
};

export default function DocsIndexPage() {
  const pages = listDocsPages();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Realite Docs</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">So nutzt du Realite</h1>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Diese Dokumentation erklärt, was Realite ist und wie du Gruppen, Kontakte, Events und Matching effektiv
          einsetzt.
        </p>
      </header>

      <DocsIndexContent pages={pages} />
    </main>
  );
}
