export const QR_PRINT_VARIANT_CODES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

export type QrPrintVariantCode = (typeof QR_PRINT_VARIANT_CODES)[number];

export type QrPrintCopyVariant = {
  code: QrPrintVariantCode;
  label: string;
  headline: string;
  benefit: string;
  footer: string;
};

export function normalizeQrPrintVariant(value: string | null): QrPrintVariantCode {
  return QR_PRINT_VARIANT_CODES.includes(value as QrPrintVariantCode)
    ? (value as QrPrintVariantCode)
    : "a";
}

export function appendQrPrintVariant(url: string, variant: QrPrintVariantCode) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}s=${variant}`;
}
