const FOOTER_LINKS = [
  { href: "/docs", label: "Docs" },
  { href: "/datenschutz", label: "Datenschutz" },
  { href: "/agb", label: "AGB" },
  { href: "/impressum", label: "Impressum" }
];

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+5rem)] sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between md:pb-4">
        <p className="text-xs text-slate-500">© {new Date().getFullYear()} Realite</p>
        <nav className="flex flex-wrap items-center gap-4" aria-label="Rechtliches">
          {FOOTER_LINKS.map((item) => (
            <a key={item.href} href={item.href} className="text-xs font-semibold text-slate-600 hover:text-teal-700">
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
