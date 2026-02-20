import { NextResponse } from "next/server";
import { z } from "zod";

import { updateGroupHashtags } from "@/src/lib/repository";
import { requireAppUser } from "@/src/lib/session";

const patchGroupSchema = z.object({
  hashtags: z.array(z.string().max(40))
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
    return NextResponse.json({ error: "Ungültige Hashtags" }, { status: 400 });
  }

  const { groupId } = await context.params;

  try {
    const group = await updateGroupHashtags({
      groupId,
      userId: user.id,
      hashtags: parsed.data.hashtags
    });

    return NextResponse.json({ group });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Hashtags konnten nicht aktualisiert werden";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
