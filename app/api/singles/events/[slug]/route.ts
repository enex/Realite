import { NextResponse } from "next/server";

import { getSinglesHerePresence } from "@/src/lib/repository";
import { requireAppUser } from "@/src/lib/session";

function serializePresence(
  presence: NonNullable<Awaited<ReturnType<typeof getSinglesHerePresence>>>,
) {
  return {
    event: {
      ...presence.event,
      startsAt: presence.event.startsAt.toISOString(),
      endsAt: presence.event.endsAt.toISOString(),
    },
    profile: presence.profile,
    profileUnlocked: presence.profileUnlocked,
    age: presence.age,
    currentUserStatus: presence.currentUserStatus,
    currentUserVisibleUntilIso:
      presence.currentUserVisibleUntil?.toISOString() ?? null,
    checkedInCount: presence.checkedInCount,
    matchingPeople: presence.matchingPeople.map((person) => ({
      ...person,
      visibleUntilIso: person.visibleUntil.toISOString(),
    })),
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const { slug } = await context.params;
  const presence = await getSinglesHerePresence({ userId: user.id, slug });
  if (!presence) {
    return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json(serializePresence(presence));
}
