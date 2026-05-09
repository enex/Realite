import { NextResponse } from "next/server";
import QRCode from "qrcode";

import { getPlaceholderQrBySlug } from "@/src/lib/placeholder-qr";
import { appendQrPrintVariant, normalizeQrPrintVariant } from "@/src/lib/qr-print-variants";
import { getRequestOrigin } from "@/src/lib/request-origin";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const qr = await getPlaceholderQrBySlug(slug);

  if (!qr) {
    return new NextResponse("QR-Code nicht gefunden", { status: 404 });
  }

  const requestUrl = new URL(request.url);
  const variant = normalizeQrPrintVariant(requestUrl.searchParams.get("s"));
  const url = appendQrPrintVariant(`${getRequestOrigin(request)}/q/${slug}`, variant);
  const svg = await QRCode.toString(url, {
    type: "svg",
    margin: 1,
    width: 768,
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
  });

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "private, max-age=60",
    },
  });
}
