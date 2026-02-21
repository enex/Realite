import { NextResponse } from "next/server";

import { createInviteLink, isGroupMember } from "@/src/lib/repository";
import { requireAppUser } from "@/src/lib/session";

export async function POST(
  _request: Request,
  context: { params: Promise<{ groupId: string }> }
) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const { groupId } = await context.params;
  const allowed = await isGroupMember(groupId, user.id);

  if (!allowed) {
    return NextResponse.json({ error: "Keine Berechtigung für diese Gruppe" }, { status: 403 });
  }

  const invite = await createInviteLink({ groupId, createdBy: user.id });
  return NextResponse.json({
    token: invite.token,
    expiresAt: invite.expiresAt,
    inviteUrl: `${process.env.BETTER_AUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/join/${invite.token}`
  });
}
