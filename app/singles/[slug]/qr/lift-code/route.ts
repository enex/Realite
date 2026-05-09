import { NextResponse } from "next/server";
import QRCode from "qrcode";

import { createLiftToken } from "@/src/lib/lift-token";
import { getRequestOrigin } from "@/src/lib/request-origin";
import {
  getSinglesHereEventBySlug,
  getSinglesHerePresence,
} from "@/src/lib/repository";
import { requireAppUser } from "@/src/lib/session";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const user = await requireAppUser();
  if (!user) {
    return new NextResponse("Nicht eingeloggt", { status: 401 });
  }

  const { slug } = await context.params;
  const [event, presence] = await Promise.all([
    getSinglesHereEventBySlug(slug),
    getSinglesHerePresence({ userId: user.id, slug }),
  ]);

  if (!event || !presence) {
    return new NextResponse("Event nicht gefunden", { status: 404 });
  }

  const token = createLiftToken({
    ownerUserId: user.id,
    singlesSlug: event.slug,
  });
  const url = `${getRequestOrigin(request)}/lift/${encodeURIComponent(token)}`;
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
      "Cache-Control": "private, no-store",
    },
  });
}
