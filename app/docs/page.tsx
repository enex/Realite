import { listDocsPages } from "@/src/lib/docs";

export const metadata = {
  title: "Realite Docs",
  description: "Dokumentation zur Nutzung von Realite"
};

export default function DocsIndexPage() {
  const pages = listDocsPages();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Realite Docs</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">So nutzt du Realite</h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          Diese Dokumentation erklärt, was Realite ist und wie du Gruppen, Kontakte, Events und Matching effektiv
          einsetzt.
        </p>
      </header>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        {pages.map((page) => (
          <a
            key={page.slug}
            href={`/docs/${page.slug}`}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-300 hover:bg-teal-50"
          >
            <p className="text-lg font-semibold text-slate-900">{page.title}</p>
            <p className="mt-1 text-sm text-slate-600">{page.description}</p>
          </a>
        ))}
      </section>
    </main>
  );
}
