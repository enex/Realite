import { NextResponse } from "next/server";
import { z } from "zod";

import { createPlaceholderQr } from "@/src/lib/placeholder-qr";
import { requireAppUser } from "@/src/lib/session";

const createSchema = z.object({
  label: z.string().max(60).optional().nullable(),
});

export async function POST(request: Request) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  let label: string | null | undefined = null;
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (parsed.success) {
      label = parsed.data.label;
    }
  } catch {
    // Body is optional for this endpoint
  }

  try {
    const qr = await createPlaceholderQr({ ownedBy: user.id, label });
    return NextResponse.json({ qr });
  } catch (error) {
    console.error("QR-Code konnte nicht erstellt werden", error);
    return NextResponse.json({ error: "QR-Code konnte nicht erstellt werden" }, { status: 500 });
  }
}
