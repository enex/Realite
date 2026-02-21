import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAppUser } from "@/src/lib/session";

export const dynamic = "force-dynamic";

const geocodeQuerySchema = z.object({
  q: z.string().trim().min(2).max(180)
});

type NominatimSearchResult = {
  lat?: string;
  lon?: string;
  display_name?: string;
};

export async function GET(request: Request) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const requestUrl = new URL(request.url);
  const parsedQuery = geocodeQuerySchema.safeParse({
    q: requestUrl.searchParams.get("q") ?? ""
  });

  if (!parsedQuery.success) {
    return NextResponse.json({ error: "Ungültige Ortsangabe" }, { status: 400 });
  }

  try {
    const params = new URLSearchParams({
      q: parsedQuery.data.q,
      format: "jsonv2",
      limit: "1",
      addressdetails: "0"
    });

    const geocodeResponse = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        "User-Agent": "Realite/1.0 (Event-Geocoding)",
        "Accept-Language": "de"
      },
      cache: "no-store"
    });

    if (!geocodeResponse.ok) {
      return NextResponse.json({ error: "Ortsauflösung fehlgeschlagen" }, { status: 502 });
    }

    const payload = (await geocodeResponse.json()) as NominatimSearchResult[];
    const first = payload[0];
    if (!first?.lat || !first.lon) {
      return NextResponse.json({ result: null });
    }

    const lat = Number.parseFloat(first.lat);
    const lon = Number.parseFloat(first.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return NextResponse.json({ result: null });
    }

    return NextResponse.json({
      result: {
        lat,
        lon,
        displayName: first.display_name ?? null
      }
    });
  } catch (error) {
    console.error("Geocoding fehlgeschlagen", error);
    return NextResponse.json({ error: "Ortsauflösung fehlgeschlagen" }, { status: 500 });
  }
}
