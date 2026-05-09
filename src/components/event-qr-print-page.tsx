"use client";

import { Minus, Plus, Printer } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

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
};

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
    card:
      "border-teal-700/45 bg-[#fffaf0] text-black",
    bar: "bg-teal-700",
    badge: "bg-[#f59e5b] text-white",
    brand: "text-teal-800",
    headline: "text-teal-900",
    qrFrame: "border-teal-700 bg-white",
    footer: "text-teal-800",
  },
  b: {
    card:
      "border-slate-950 bg-white text-slate-950",
    bar: "bg-slate-950",
    badge: "bg-lime-500 text-slate-950",
    brand: "text-slate-700",
    headline: "text-slate-950",
    qrFrame: "border-slate-950 bg-white",
    footer: "text-slate-700",
  },
  c: {
    card:
      "border-cyan-700/55 bg-[#ecfeff] text-slate-950",
    bar: "bg-cyan-700",
    badge: "bg-rose-500 text-white",
    brand: "text-cyan-800",
    headline: "text-cyan-950",
    qrFrame: "border-cyan-700 bg-white",
    footer: "text-cyan-800",
  },
  d: {
    card:
      "border-zinc-900 bg-[#f7f7f4] text-zinc-950",
    bar: "bg-zinc-900",
    badge: "bg-amber-300 text-zinc-950",
    brand: "text-zinc-700",
    headline: "text-zinc-950",
    qrFrame: "border-zinc-900 bg-white",
    footer: "text-zinc-700",
  },
  e: {
    card:
      "border-emerald-700/60 bg-[#f0fdf4] text-slate-950",
    bar: "bg-emerald-700",
    badge: "bg-slate-950 text-white",
    brand: "text-emerald-800",
    headline: "text-emerald-950",
    qrFrame: "border-emerald-700 bg-white",
    footer: "text-emerald-800",
  },
  f: {
    card:
      "border-fuchsia-700/60 bg-[#fdf4ff] text-slate-950",
    bar: "bg-fuchsia-700",
    badge: "bg-orange-400 text-slate-950",
    brand: "text-fuchsia-800",
    headline: "text-fuchsia-950",
    qrFrame: "border-fuchsia-700 bg-white",
    footer: "text-fuchsia-800",
  },
  g: {
    card:
      "border-sky-800/60 bg-[#f8fafc] text-slate-950",
    bar: "bg-sky-800",
    badge: "bg-yellow-300 text-sky-950",
    brand: "text-sky-800",
    headline: "text-sky-950",
    qrFrame: "border-sky-800 bg-white",
    footer: "text-sky-800",
  },
  h: {
    card:
      "border-red-700/60 bg-[#fff7ed] text-slate-950",
    bar: "bg-red-700",
    badge: "bg-cyan-300 text-red-950",
    brand: "text-red-800",
    headline: "text-red-950",
    qrFrame: "border-red-700 bg-white",
    footer: "text-red-800",
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
              benefit: "Scannen, öffnen und mit einem Tap zeigen, dass du kommst.",
              footer: "Schneller planen",
            },
            {
              code: "c",
              label: "Spontan",
              headline: "Was geht hier?",
              benefit: "Scanne den Code und finde direkt zur gemeinsamen Aktivität.",
              footer: "Einfach dazukommen",
            },
            {
              code: "d",
              label: "Minimal",
              headline: "Kurz mitkommen?",
              benefit: "Ein Scan reicht, um das Event zu öffnen und dabei zu sein.",
              footer: "Wenig Aufwand",
            },
            {
              code: "e",
              label: "Gemeinsam",
              headline: "Wer ist dabei?",
              benefit: "Öffnen, zusagen und der Gruppe Planungssicherheit geben.",
              footer: "Mehr Überblick",
            },
            {
              code: "f",
              label: "Neugierig",
              headline: "Schon gesehen?",
              benefit: "Scanne den Code und schau, ob die Aktivität zu dir passt.",
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
              benefit: "Der Link führt dich direkt zur Aktivität und zur Zusage.",
              footer: "Einladung öffnen",
            },
          ],
    [copyVariants, scanBenefit, scanHeadline],
  );
  const [selectedVariant, setSelectedVariant] = useState<QrPrintVariantCode>(variants[0]?.code ?? "a");
  const activeVariant = variants.find((variant) => variant.code === selectedVariant) ?? variants[0];
  const selectedEventUrl = appendQrPrintVariant(eventUrl, activeVariant.code);
  const selectedQrImagePath = appendQrPrintVariant(qrImagePath, activeVariant.code);
  const selectedStyle = variantStyles[activeVariant.code];
  const codes = useMemo(() => Array.from({ length: count }, (_, index) => index), [count]);

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
          size: A4;
          margin: 10mm;
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
        }
      `}</style>

      <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <a href={backHref} className="text-sm font-semibold text-teal-700 hover:text-teal-800">
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
          <p className="text-sm font-semibold text-foreground">QR-Codes zum Ausschneiden</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Die Codes pitchen direkt den Mehrwert des Scans und verweisen auf den Event-Link.
            Die Stilvariante landet als kurze Kennung in der Scan-URL, zum Beispiel <code>?s=a</code>.
            Du steuerst nur diese Druckvorlage, keine Sichtbarkeit in Realite.
          </p>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Codes nebeneinander</span>
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
                  onChange={(event) => updateColumns(Number(event.target.value))}
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
              <span className="text-xs font-semibold text-muted-foreground">Anzahl Codes</span>
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
              <span className="text-xs font-semibold text-muted-foreground">Stil und Botschaft</span>
              <select
                value={activeVariant.code}
                onChange={(event) => setSelectedVariant(event.target.value as QrPrintVariantCode)}
                className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm font-semibold text-foreground outline-none"
              >
                {variants.map((variant) => (
                  <option key={variant.code} value={variant.code}>
                    {variant.label} (?s={variant.code}) - {variant.headline}
                  </option>
                ))}
              </select>
              <span className="mt-2 block rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{activeVariant.headline}</span>{" "}
                {activeVariant.benefit}
              </span>
            </label>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6 lg:px-8 print:max-w-none print:px-0 print:pb-0">
        <div
          className="qr-print-sheet grid gap-3"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {codes.map((index) => (
            <article
              key={index}
              className={`qr-print-card relative flex min-h-64 flex-col items-center justify-between overflow-hidden border border-dashed p-3 text-center shadow-sm ${selectedStyle.card}`}
            >
              <div className={`absolute inset-x-0 top-0 h-2 ${selectedStyle.bar}`} aria-hidden="true" />
              <div className={`absolute right-2 top-3 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] ${selectedStyle.badge}`} aria-hidden="true">
                Scan mich
              </div>
              <div className="w-full">
                <p className={`pr-20 text-[10px] font-black uppercase tracking-[0.16em] ${selectedStyle.brand}`}>Realite</p>
                <p className="mt-3 line-clamp-2 text-sm font-black leading-snug">{eventTitle}</p>
              </div>
              <div className="my-3 w-full">
                <p className={`mx-auto max-w-44 text-[15px] font-black leading-tight ${selectedStyle.headline}`}>
                  {activeVariant.headline}
                </p>
                <p className="mx-auto mt-1 max-w-48 text-[11px] font-semibold leading-snug text-neutral-800">{activeVariant.benefit}</p>
                <div className={`mx-auto mt-3 grid aspect-square w-full max-w-32 place-items-center rounded-2xl border-2 p-2 ${selectedStyle.qrFrame}`}>
                  <img
                    src={selectedQrImagePath}
                    alt={`QR-Code für ${eventTitle}`}
                    className="aspect-square w-full"
                  />
                </div>
              </div>
              <div className="w-full">
                <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${selectedStyle.footer}`}>
                  {activeVariant.footer}
                </p>
                <p className="mt-1 break-all text-[10px] leading-tight text-neutral-600">{selectedEventUrl}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
