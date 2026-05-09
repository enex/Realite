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

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_1.4fr]">
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

            <fieldset>
              <legend className="text-xs font-semibold text-muted-foreground">Stil und Botschaft</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
                {variants.map((variant) => (
                  <button
                    key={variant.code}
                    type="button"
                    onClick={() => setSelectedVariant(variant.code)}
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                      activeVariant.code === variant.code
                        ? "border-teal-700 bg-teal-50 text-teal-950"
                        : "border-input bg-background text-foreground hover:bg-muted"
                    }`}
                    aria-pressed={activeVariant.code === variant.code}
                  >
                    <span className="flex items-center justify-between gap-2 font-semibold">
                      {variant.label}
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        ?s={variant.code}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">{variant.headline}</span>
                  </button>
                ))}
              </div>
            </fieldset>
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
