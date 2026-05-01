import { NextResponse } from "next/server";
import QRCode from "qrcode";

import { getPublicEventSharePreviewByShortId } from "@/src/lib/event-share";
import { getRequestOrigin } from "@/src/lib/request-origin";
import { getVisibleEventForUserById } from "@/src/lib/repository";
import { requireAppUser } from "@/src/lib/session";
import { enlargeUUID } from "@/src/lib/utils/short-uuid";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ shortEventId: string }> },
) {
  const { shortEventId } = await context.params;
  const eventPath = `/e/${encodeURIComponent(shortEventId)}`;
  const publicPreview = await getPublicEventSharePreviewByShortId(shortEventId);
  let eventExists = Boolean(publicPreview);

  if (!eventExists) {
    let eventId = "";
    try {
      eventId = enlargeUUID(shortEventId);
    } catch {
      return new NextResponse("Event nicht gefunden", { status: 404 });
    }

    const user = await requireAppUser();
    if (!user) {
      return new NextResponse("Event nicht gefunden", { status: 404 });
    }

    const event = await getVisibleEventForUserById({ userId: user.id, eventId });
    eventExists = Boolean(event);
  }

  if (!eventExists) {
    return new NextResponse("Event nicht gefunden", { status: 404 });
  }

  const url = `${getRequestOrigin(request)}${eventPath}`;
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
      "Cache-Control": publicPreview ? "public, max-age=300" : "private, max-age=60",
    },
  });
}
