import type { ReactNode } from "react";

type LegalPageLayoutProps = {
  label: string;
  title: string;
  summary: string;
  updatedAt: string;
  children: ReactNode;
};

export function LegalPageLayout({ label, title, summary, updatedAt, children }: LegalPageLayoutProps) {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-4">
        <a href="/" className="text-sm font-semibold text-teal-700 hover:text-teal-800">
          ← Zur Startseite
        </a>
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">{label}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-3 text-sm leading-7 text-slate-700">{summary}</p>
        <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">Stand: {updatedAt}</p>
        <div className="mt-8 space-y-7 text-sm leading-7 text-slate-700 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6">
          {children}
        </div>
      </article>
    </main>
  );
}
