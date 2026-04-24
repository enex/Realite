import { NextResponse } from "next/server";
import { z } from "zod";

import {
  dismissWeeklySharePrompt,
  markWeeklyShareCampaignShared,
  updateWeeklyShareOpenIntentions,
} from "@/src/lib/repository";
import { requireAppUser } from "@/src/lib/session";

const bodySchema = z.object({
  token: z.string().trim().min(8),
  action: z.enum(["shared", "dismissed", "intentions"]),
  intentions: z.array(z.string().trim().min(1).max(80)).max(8).optional(),
});

export async function POST(request: Request) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  if (parsed.data.action === "shared") {
    await markWeeklyShareCampaignShared({ userId: user.id, token: parsed.data.token });
  } else if (parsed.data.action === "dismissed") {
    await dismissWeeklySharePrompt({ userId: user.id, token: parsed.data.token });
  } else {
    await updateWeeklyShareOpenIntentions({
      userId: user.id,
      token: parsed.data.token,
      intentions: parsed.data.intentions ?? [],
    });
  }

  return NextResponse.json({ ok: true });
}
