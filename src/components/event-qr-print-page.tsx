"use client";

import { Minus, Plus, Printer } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";

import {
  appendQrPrintVariant,
  type QrPrintCopyVariant,
  type QrPrintVariantCode,
} from "@/src/lib/qr-print-variants";

type EventQrPrintPageProps = {
  eventTitle: string;
  scanHeadline: string;
  scanBenefit: string;
  eventUrl: string;
  qrImagePath: string;
  backHref: string;
  copyVariants?: QrPrintCopyVariant[];
  persistenceKey?: string;
};

type PrintLayoutMode = "stickers" | "poster" | "poster_full_a4";
type PrintPaperFormat = "a4" | "a3";

const MIN_COLUMNS = 1;
const MAX_COLUMNS = 5;
const MIN_COUNT = 1;
const MAX_COUNT = 60;

const variantStyles: Record<
  QrPrintVariantCode,
  {
    card: string;
    bar: string;
    badge: string;
    brand: string;
    headline: string;
    qrFrame: string;
    footer: string;
  }
> = {
  a: {
    card: "border-teal-700/45 bg-[#fffaf0] text-black",
    bar: "bg-teal-700",
    badge: "bg-[#f59e5b] text-white",
    brand: "text-teal-800",
    headline: "text-teal-900",
    qrFrame: "border-teal-700 bg-white",
    footer: "text-teal-800",
  },
  b: {
    card: "border-slate-950 bg-white text-slate-950",
    bar: "bg-slate-950",
    badge: "bg-lime-500 text-slate-950",
    brand: "text-slate-700",
    headline: "text-slate-950",
    qrFrame: "border-slate-950 bg-white",
    footer: "text-slate-700",
  },
  c: {
    card: "border-cyan-700/55 bg-[#ecfeff] text-slate-950",
    bar: "bg-cyan-700",
    badge: "bg-rose-500 text-white",
    brand: "text-cyan-800",
    headline: "text-cyan-950",
    qrFrame: "border-cyan-700 bg-white",
    footer: "text-cyan-800",
  },
  d: {
    card: "border-zinc-900 bg-[#f7f7f4] text-zinc-950",
    bar: "bg-zinc-900",
    badge: "bg-amber-300 text-zinc-950",
    brand: "text-zinc-700",
    headline: "text-zinc-950",
    qrFrame: "border-zinc-900 bg-white",
    footer: "text-zinc-700",
  },
  e: {
    card: "border-emerald-700/60 bg-[#f0fdf4] text-slate-950",
    bar: "bg-emerald-700",
    badge: "bg-slate-950 text-white",
    brand: "text-emerald-800",
    headline: "text-emerald-950",
    qrFrame: "border-emerald-700 bg-white",
    footer: "text-emerald-800",
  },
  f: {
    card: "border-fuchsia-700/60 bg-[#fdf4ff] text-slate-950",
    bar: "bg-fuchsia-700",
    badge: "bg-orange-400 text-slate-950",
    brand: "text-fuchsia-800",
    headline: "text-fuchsia-950",
    qrFrame: "border-fuchsia-700 bg-white",
    footer: "text-fuchsia-800",
  },
  g: {
    card: "border-sky-800/60 bg-[#f8fafc] text-slate-950",
    bar: "bg-sky-800",
    badge: "bg-yellow-300 text-sky-950",
    brand: "text-sky-800",
    headline: "text-sky-950",
    qrFrame: "border-sky-800 bg-white",
    footer: "text-sky-800",
  },
  h: {
    card: "border-red-700/60 bg-[#fff7ed] text-slate-950",
    bar: "bg-red-700",
    badge: "bg-cyan-300 text-red-950",
    brand: "text-red-800",
    headline: "text-red-950",
    qrFrame: "border-red-700 bg-white",
    footer: "text-red-800",
  },
  i: {
    card: "border-indigo-700/60 bg-[#eef2ff] text-slate-950",
    bar: "bg-indigo-700",
    badge: "bg-emerald-300 text-indigo-950",
    brand: "text-indigo-800",
    headline: "text-indigo-950",
    qrFrame: "border-indigo-700 bg-white",
    footer: "text-indigo-800",
  },
  j: {
    card: "border-amber-700/60 bg-[#fffbeb] text-slate-950",
    bar: "bg-amber-700",
    badge: "bg-slate-900 text-amber-100",
    brand: "text-amber-800",
    headline: "text-amber-950",
    qrFrame: "border-amber-700 bg-white",
    footer: "text-amber-800",
  },
  k: {
    card: "border-violet-700/60 bg-[#f5f3ff] text-slate-950",
    bar: "bg-violet-700",
    badge: "bg-cyan-200 text-violet-950",
    brand: "text-violet-800",
    headline: "text-violet-950",
    qrFrame: "border-violet-700 bg-white",
    footer: "text-violet-800",
  },
  l: {
    card: "border-lime-700/60 bg-[#f7fee7] text-slate-950",
    bar: "bg-lime-700",
    badge: "bg-fuchsia-300 text-lime-950",
    brand: "text-lime-800",
    headline: "text-lime-950",
    qrFrame: "border-lime-700 bg-white",
    footer: "text-lime-800",
  },
};

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

export function EventQrPrintPage({
  eventTitle,
  scanHeadline,
  scanBenefit,
  eventUrl,
  qrImagePath,
  backHref,
  copyVariants,
  persistenceKey,
}: EventQrPrintPageProps) {
  const [columns, setColumns] = useState(3);
  const [count, setCount] = useState(12);
  const variants = useMemo<QrPrintCopyVariant[]>(
    () =>
      copyVariants?.length
        ? copyVariants
        : [
            {
              code: "a",
              label: "Klassisch",
              headline: scanHeadline,
              benefit: scanBenefit,
              footer: "Mitmachen statt suchen",
            },
            {
              code: "b",
              label: "Direkt",
              headline: "Heute dabei?",
              benefit:
                "Scannen, öffnen und mit einem Tap zeigen, dass du kommst.",
              footer: "Schneller planen",
            },
            {
              code: "c",
              label: "Spontan",
              headline: "Was geht hier?",
              benefit:
                "Scanne den Code und finde direkt zur gemeinsamen Aktivität.",
              footer: "Einfach dazukommen",
            },
            {
              code: "d",
              label: "Minimal",
              headline: "Kurz mitkommen?",
              benefit:
                "Ein Scan reicht, um das Event zu öffnen und dabei zu sein.",
              footer: "Wenig Aufwand",
            },
            {
              code: "e",
              label: "Gemeinsam",
              headline: "Wer ist dabei?",
              benefit:
                "Öffnen, zusagen und der Gruppe Planungssicherheit geben.",
              footer: "Mehr Überblick",
            },
            {
              code: "f",
              label: "Neugierig",
              headline: "Schon gesehen?",
              benefit:
                "Scanne den Code und schau, ob die Aktivität zu dir passt.",
              footer: "Erst ansehen",
            },
            {
              code: "g",
              label: "Klar",
              headline: "Plan steht.",
              benefit: "Scannen, Details öffnen und direkt entscheiden.",
              footer: "Ohne Chat-Chaos",
            },
            {
              code: "h",
              label: "Warm",
              headline: "Komm vorbei.",
              benefit:
                "Der Link führt dich direkt zur Aktivität und zur Zusage.",
              footer: "Einladung öffnen",
            },
          ],
    [copyVariants, scanBenefit, scanHeadline],
  );
  const [selectedVariant, setSelectedVariant] = useState<QrPrintVariantCode>(
    variants[0]?.code ?? "a",
  );
  const [layoutMode, setLayoutMode] = useState<PrintLayoutMode>("stickers");
  const [paperFormat, setPaperFormat] = useState<PrintPaperFormat>("a4");
  const activeVariant =
    variants.find((variant) => variant.code === selectedVariant) ?? variants[0];
  const [customHeadline, setCustomHeadline] = useState(activeVariant.headline);
  const [customBenefit, setCustomBenefit] = useState(activeVariant.benefit);
  const [customFooter, setCustomFooter] = useState(activeVariant.footer);
  const [customCta, setCustomCta] = useState("Jetzt scannen");
  const selectedEventUrl = appendQrPrintVariant(eventUrl, activeVariant.code);
  const selectedQrImagePath = appendQrPrintVariant(
    qrImagePath,
    activeVariant.code,
  );
  const selectedStyle = variantStyles[activeVariant.code];
  const codes = useMemo(
    () => Array.from({ length: count }, (_, index) => index),
    [count],
  );
  const storageKey = `realite:print-template:${persistenceKey ?? eventUrl}`;
  const printPageSize =
    layoutMode === "poster_full_a4" ? "A4 portrait" : paperFormat.toUpperCase();
  const printPageMarginMm = layoutMode === "poster_full_a4" ? 0 : 10;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as {
        selectedVariant?: QrPrintVariantCode;
        layoutMode?: PrintLayoutMode;
        paperFormat?: PrintPaperFormat;
        customHeadline?: string;
        customBenefit?: string;
        customFooter?: string;
        customCta?: string;
      };
      if (parsed.selectedVariant) {
        setSelectedVariant(parsed.selectedVariant);
      }
      if (parsed.layoutMode) {
        setLayoutMode(parsed.layoutMode);
      }
      if (parsed.paperFormat) {
        setPaperFormat(parsed.paperFormat);
      }
      if (typeof parsed.customHeadline === "string") {
        setCustomHeadline(parsed.customHeadline);
      }
      if (typeof parsed.customBenefit === "string") {
        setCustomBenefit(parsed.customBenefit);
      }
      if (typeof parsed.customFooter === "string") {
        setCustomFooter(parsed.customFooter);
      }
      if (typeof parsed.customCta === "string") {
        setCustomCta(parsed.customCta);
      }
    } catch {
      // ignore invalid persisted state
    }
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const payload = {
      selectedVariant,
      layoutMode,
      paperFormat,
      customHeadline,
      customBenefit,
      customFooter,
      customCta,
    };
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  }, [
    customBenefit,
    customCta,
    customFooter,
    customHeadline,
    layoutMode,
    paperFormat,
    selectedVariant,
    storageKey,
  ]);

  function updateColumns(value: number) {
    setColumns(clamp(value, MIN_COLUMNS, MAX_COLUMNS));
  }

  function updateCount(value: number) {
    setCount(clamp(value, MIN_COUNT, MAX_COUNT));
  }

  return (
    <main className="min-h-dvh bg-background text-foreground print:bg-white print:text-black">
      <style>{`
        @page {
          size: ${printPageSize};
          margin: ${printPageMarginMm}mm;
        }

        @media print {
          body {
            background: white !important;
          }

          .qr-print-sheet {
            gap: 0 !important;
          }

          .qr-print-card {
            break-inside: avoid;
            border-color: #9ca3af !important;
            box-shadow: none !important;
          }

          .qr-print-full-a4 {
            width: 210mm !important;
            min-height: 297mm !important;
            max-width: 210mm !important;
            border-radius: 0 !important;
            margin: 0 auto !important;
          }
        }
      `}</style>

      <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <a
            href={backHref}
            className="text-sm font-semibold text-teal-700 hover:text-teal-800"
          >
            Zur Eventseite
          </a>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
          >
            <Printer aria-hidden className="h-4 w-4" />
            Drucken
          </button>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-sm font-semibold text-foreground">
            QR- und Poster-Studio
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Passe Texte frei an, wechsle zwischen Sticker-Bogen und Poster und
            drucke in DIN A4 oder DIN A3. Die Stilvariante landet als kurze
            Kennung in der Scan-URL, zum Beispiel <code>?s=a</code>.
          </p>
          <p className="mt-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs leading-5 text-teal-900">
            Der QR-Code hilft vor Ort beim Einordnen: Personen wählen im Profil
            bewusst, ob sie nur fürs Dating, für Dating und Social oder nur für
            Social offen sind. Beim Scan sieht man nur passende, aktiv
            eingecheckte Personen.
          </p>

          <div className="mt-4 grid gap-4 lg:grid-cols-4">
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">
                Layout
              </span>
              <select
                value={layoutMode}
                onChange={(event) =>
                  setLayoutMode(event.target.value as PrintLayoutMode)
                }
                className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm font-semibold text-foreground outline-none"
              >
                <option value="stickers">Sticker / mehrere QR-Codes</option>
                <option value="poster">Poster</option>
                <option value="poster_full_a4">
                  A4 Poster (vollflächig zum Aushängen)
                </option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">
                Papierformat
              </span>
              <select
                value={paperFormat}
                onChange={(event) =>
                  setPaperFormat(event.target.value as PrintPaperFormat)
                }
                className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm font-semibold text-foreground outline-none"
              >
                <option value="a4">DIN A4</option>
                <option value="a3">DIN A3</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">
                Codes nebeneinander
              </span>
              <div className="mt-2 flex h-11 items-center overflow-hidden rounded-lg border border-input bg-background">
                <button
                  type="button"
                  onClick={() => updateColumns(columns - 1)}
                  className="flex h-full w-11 items-center justify-center border-r border-input text-foreground hover:bg-muted"
                  aria-label="Weniger Spalten"
                >
                  <Minus aria-hidden className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  min={MIN_COLUMNS}
                  max={MAX_COLUMNS}
                  value={columns}
                  onChange={(event) =>
                    updateColumns(Number(event.target.value))
                  }
                  className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-center text-sm font-semibold outline-none"
                />
                <button
                  type="button"
                  onClick={() => updateColumns(columns + 1)}
                  className="flex h-full w-11 items-center justify-center border-l border-input text-foreground hover:bg-muted"
                  aria-label="Mehr Spalten"
                >
                  <Plus aria-hidden className="h-4 w-4" />
                </button>
              </div>
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">
                Anzahl Codes
              </span>
              <div className="mt-2 flex h-11 items-center overflow-hidden rounded-lg border border-input bg-background">
                <button
                  type="button"
                  onClick={() => updateCount(count - columns)}
                  className="flex h-full w-11 items-center justify-center border-r border-input text-foreground hover:bg-muted"
                  aria-label="Weniger Codes"
                >
                  <Minus aria-hidden className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  min={MIN_COUNT}
                  max={MAX_COUNT}
                  value={count}
                  onChange={(event) => updateCount(Number(event.target.value))}
                  className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-center text-sm font-semibold outline-none"
                />
                <button
                  type="button"
                  onClick={() => updateCount(count + columns)}
                  className="flex h-full w-11 items-center justify-center border-l border-input text-foreground hover:bg-muted"
                  aria-label="Mehr Codes"
                >
                  <Plus aria-hidden className="h-4 w-4" />
                </button>
              </div>
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">
                Stil und Botschaft
              </span>
              <select
                value={activeVariant.code}
                onChange={(event) => {
                  const code = event.target.value as QrPrintVariantCode;
                  const next = variants.find(
                    (variant) => variant.code === code,
                  );
                  setSelectedVariant(code);
                  if (next) {
                    setCustomHeadline(next.headline);
                    setCustomBenefit(next.benefit);
                    setCustomFooter(next.footer);
                  }
                }}
                className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm font-semibold text-foreground outline-none"
              >
                {variants.map((variant) => (
                  <option key={variant.code} value={variant.code}>
                    {variant.label} (?s={variant.code}) - {variant.headline}
                  </option>
                ))}
              </select>
              <span className="mt-2 block rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {activeVariant.headline}
                </span>{" "}
                {activeVariant.benefit}
              </span>
            </label>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
              Headline
              <input
                value={customHeadline}
                onChange={(event) =>
                  setCustomHeadline(event.target.value.slice(0, 90))
                }
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-semibold text-foreground"
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
              CTA
              <input
                value={customCta}
                onChange={(event) =>
                  setCustomCta(event.target.value.slice(0, 60))
                }
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-semibold text-foreground"
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-muted-foreground lg:col-span-2">
              Benefit-Text
              <textarea
                value={customBenefit}
                onChange={(event) =>
                  setCustomBenefit(event.target.value.slice(0, 180))
                }
                rows={2}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-muted-foreground lg:col-span-2">
              Footer
              <input
                value={customFooter}
                onChange={(event) =>
                  setCustomFooter(event.target.value.slice(0, 80))
                }
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
            </label>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6 lg:px-8 print:max-w-none print:px-0 print:pb-0">
        {layoutMode === "stickers" ? (
          <div
            className="qr-print-sheet grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {codes.map((index) => (
              <article
                key={index}
                className={`qr-print-card relative flex min-h-64 flex-col items-center justify-between overflow-hidden border border-dashed p-3 text-center shadow-sm ${selectedStyle.card}`}
              >
                <div
                  className={`absolute inset-x-0 top-0 h-2 ${selectedStyle.bar}`}
                  aria-hidden="true"
                />
                <div
                  className={`absolute right-2 top-3 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] ${selectedStyle.badge}`}
                  aria-hidden="true"
                >
                  {customCta || "Scan mich"}
                </div>
                <div className="w-full">
                  <p
                    className={`pr-20 text-[10px] font-black uppercase tracking-[0.16em] ${selectedStyle.brand}`}
                  >
                    Realite
                  </p>
                  {eventTitle && (
                    <p className="mt-3 line-clamp-2 text-sm font-black leading-snug">
                      {eventTitle}
                    </p>
                  )}
                </div>
                <div className="my-3 w-full">
                  <p
                    className={`mx-auto max-w-44 text-[15px] font-black leading-tight ${selectedStyle.headline}`}
                  >
                    {customHeadline}
                  </p>
                  <p className="mx-auto mt-1 max-w-48 text-[11px] font-semibold leading-snug text-neutral-800">
                    {customBenefit}
                  </p>
                  <div
                    className={`mx-auto mt-3 grid aspect-square w-full max-w-32 place-items-center rounded-2xl border-2 p-2 ${selectedStyle.qrFrame}`}
                  >
                    <img
                      src={selectedQrImagePath}
                      alt={`QR-Code für ${eventTitle || "Realite"}`}
                      className="aspect-square w-full"
                    />
                  </div>
                </div>
                <div className="w-full">
                  <p
                    className={`text-[10px] font-black uppercase tracking-[0.14em] ${selectedStyle.footer}`}
                  >
                    {customFooter}
                  </p>
                  <p className="mt-1 break-all text-[10px] leading-tight text-neutral-600">
                    {selectedEventUrl}
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : layoutMode === "poster" ? (
          <article
            className={`qr-print-card relative mx-auto flex min-h-[72vh] max-w-3xl flex-col items-center justify-between overflow-hidden rounded-2xl border p-8 text-center shadow-sm ${selectedStyle.card}`}
          >
            <div
              className={`absolute inset-x-0 top-0 h-3 ${selectedStyle.bar}`}
              aria-hidden="true"
            />
            <div className="w-full">
              <p
                className={`text-xs font-black uppercase tracking-[0.16em] ${selectedStyle.brand}`}
              >
                Realite Event
              </p>
              <h2 className="mt-6 text-3xl font-black leading-tight text-foreground">
                {customHeadline}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-lg font-semibold text-neutral-800">
                {customBenefit}
              </p>
            </div>
            <div
              className={`mt-8 grid aspect-square w-full max-w-72 place-items-center rounded-3xl border-2 bg-white p-4 ${selectedStyle.qrFrame}`}
            >
              <img
                src={selectedQrImagePath}
                alt={`QR-Code für ${eventTitle || "Realite"}`}
                className="aspect-square w-full"
              />
            </div>
            <div className="w-full">
              <p className="text-sm font-black uppercase tracking-[0.14em] text-foreground">
                {customCta}
              </p>
              <p
                className={`mt-2 text-base font-semibold ${selectedStyle.footer}`}
              >
                {customFooter}
              </p>
              <p className="mt-2 break-all text-xs text-neutral-600">
                {selectedEventUrl}
              </p>
            </div>
          </article>
        ) : (
          <article
            className={`qr-print-card qr-print-full-a4 relative mx-auto flex aspect-[210/297] w-full max-w-[800px] flex-col items-center justify-between overflow-hidden border p-10 text-center shadow-sm ${selectedStyle.card}`}
          >
            <div
              className={`absolute inset-x-0 top-0 h-5 ${selectedStyle.bar}`}
              aria-hidden="true"
            />
            <div className="w-full pt-6">
              <p
                className={`text-sm font-black uppercase tracking-[0.2em] ${selectedStyle.brand}`}
              >
                Realite vor Ort
              </p>
              <h2 className="mx-auto mt-10 max-w-3xl text-5xl font-black leading-tight text-foreground">
                {customHeadline}
              </h2>
              <p className="mx-auto mt-6 max-w-3xl text-2xl font-semibold leading-relaxed text-neutral-800">
                {customBenefit}
              </p>
            </div>
            <div
              className={`mt-10 grid aspect-square w-full max-w-[420px] place-items-center rounded-3xl border-2 bg-white p-6 ${selectedStyle.qrFrame}`}
            >
              <img
                src={selectedQrImagePath}
                alt={`QR-Code für ${eventTitle || "Realite"}`}
                className="aspect-square w-full"
              />
            </div>
            <div className="w-full pb-4">
              <p className="text-xl font-black uppercase tracking-[0.14em] text-foreground">
                {customCta}
              </p>
              <p
                className={`mt-3 text-2xl font-semibold ${selectedStyle.footer}`}
              >
                {customFooter}
              </p>
              <p className="mx-auto mt-5 max-w-3xl break-all text-sm text-neutral-600">
                {selectedEventUrl}
              </p>
            </div>
          </article>
        )}
      </section>
    </main>
  );
}
