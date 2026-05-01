import { NextResponse } from "next/server";
import QRCode from "qrcode";

import { getRequestOrigin } from "@/src/lib/request-origin";
import { getSinglesHereEventBySlug } from "@/src/lib/repository";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const event = await getSinglesHereEventBySlug(slug);
  if (!event) {
    return new NextResponse("Event nicht gefunden", { status: 404 });
  }

  const url = `${getRequestOrigin(request)}/singles/${encodeURIComponent(event.slug)}`;
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
      "Cache-Control": "public, max-age=300",
    },
  });
}
