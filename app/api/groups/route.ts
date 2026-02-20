import { NextResponse } from "next/server";
import { z } from "zod";

import { createGroup, listGroupsForUser } from "@/src/lib/repository";
import { requireAppUser } from "@/src/lib/session";

const createGroupSchema = z.object({
  name: z.string().min(2).max(60),
  description: z.string().max(240).optional(),
  hashtags: z.array(z.string().max(40)).optional(),
  visibility: z.enum(["public", "private"]).default("private")
});

export async function GET() {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const groups = await listGroupsForUser(user.id);
  return NextResponse.json({ groups });
}

export async function POST(request: Request) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createGroupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingaben" }, { status: 400 });
  }

  const group = await createGroup({
    userId: user.id,
    name: parsed.data.name,
    description: parsed.data.description,
    hashtags: parsed.data.hashtags,
    visibility: parsed.data.visibility
  });

  return NextResponse.json({ group });
}
