import { NextResponse } from "next/server";
import { z } from "zod";

import {
  deletePlaceholderQr,
  linkSinglesEventToQr,
  unlinkSinglesEventFromQr,
  updateQrLabel,
} from "@/src/lib/placeholder-qr";
import { requireAppUser } from "@/src/lib/session";

const patchSchema = z.object({
  singlesSlug: z.string().min(1).max(64).nullable().optional(),
  label: z.string().max(60).nullable().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const { slug } = await context.params;
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingaben" }, { status: 400 });
  }

  const { singlesSlug, label } = parsed.data;

  try {
    let qr = null;

    if (singlesSlug !== undefined) {
      if (singlesSlug === null) {
        qr = await unlinkSinglesEventFromQr({ slug, userId: user.id });
      } else {
        qr = await linkSinglesEventToQr({ slug, userId: user.id, singlesSlug });
      }
    }

    if (label !== undefined) {
      qr = await updateQrLabel({ slug, userId: user.id, label });
    }

    if (!qr) {
      return NextResponse.json(
        { error: "QR-Code nicht gefunden oder keine Berechtigung" },
        { status: 404 },
      );
    }

    return NextResponse.json({ qr });
  } catch (error) {
    console.error("QR-Code konnte nicht aktualisiert werden", error);
    return NextResponse.json(
      { error: "Aktualisierung fehlgeschlagen" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const { slug } = await context.params;

  try {
    const deleted = await deletePlaceholderQr({ slug, userId: user.id });
    if (!deleted) {
      return NextResponse.json(
        { error: "QR-Code nicht gefunden oder keine Berechtigung" },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("QR-Code konnte nicht gelöscht werden", error);
    return NextResponse.json(
      { error: "Löschen fehlgeschlagen" },
      { status: 500 },
    );
  }
}
