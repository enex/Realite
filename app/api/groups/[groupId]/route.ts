import { NextResponse } from "next/server";
import { z } from "zod";

import { deleteOrHideGroup, setGroupHiddenState, updateGroupHashtags } from "@/src/lib/repository";
import { requireAppUser } from "@/src/lib/session";

const patchGroupSchema = z.object({
  hashtags: z.array(z.string().max(40)).optional(),
  isHidden: z.boolean().optional()
}).refine((value) => (value.hashtags !== undefined) !== (value.isHidden !== undefined), {
  message: "Genau ein Feld muss gesetzt sein"
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ groupId: string }> }
) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = patchGroupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Gruppendaten" }, { status: 400 });
  }

  const { groupId } = await context.params;

  try {
    if (parsed.data.hashtags !== undefined) {
      const group = await updateGroupHashtags({
        groupId,
        userId: user.id,
        hashtags: parsed.data.hashtags
      });
      return NextResponse.json({ group, updated: "hashtags" as const });
    }

    const group = await setGroupHiddenState({
      groupId,
      userId: user.id,
      isHidden: parsed.data.isHidden ?? false
    });

    return NextResponse.json({ group, updated: "isHidden" as const });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gruppe konnte nicht aktualisiert werden";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ groupId: string }> }
) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const { groupId } = await context.params;

  try {
    const result = await deleteOrHideGroup({
      groupId,
      userId: user.id
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gruppe konnte nicht gelöscht werden";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
