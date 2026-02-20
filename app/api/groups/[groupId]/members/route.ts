import { NextResponse } from "next/server";
import { z } from "zod";

import { addEmailToGoogleContactsGroup } from "@/src/lib/google-contacts";
import { addMemberToGroupByEmail } from "@/src/lib/repository";
import { requireAppUser } from "@/src/lib/session";

const addMemberSchema = z.object({
  email: z.string().email()
});

export async function POST(
  request: Request,
  context: { params: Promise<{ groupId: string }> }
) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const { groupId } = await context.params;
  const body = await request.json();
  const parsed = addMemberSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige E-Mail" }, { status: 400 });
  }

  try {
    const result = await addMemberToGroupByEmail({
      groupId,
      requesterId: user.id,
      email: parsed.data.email
    });

    let warning: string | null = null;

    if (result.group?.syncProvider === "google_contacts" && result.group.syncEnabled) {
      try {
        await addEmailToGoogleContactsGroup({
          userId: user.id,
          email: result.email,
          contactGroupResourceName: result.group.syncReference
        });
      } catch (syncError) {
        warning = syncError instanceof Error ? syncError.message : "Google Kontakte Sync fehlgeschlagen";
      }
    }

    return NextResponse.json({ ok: true, result, warning });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mitglied konnte nicht hinzugefügt werden";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
