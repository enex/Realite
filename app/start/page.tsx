import { redirect, RedirectType } from "next/navigation";

import { buildLoginPath } from "@/src/lib/provider-adapters";
import { getActiveSinglesHereCheckedInSlugForUser } from "@/src/lib/repository";
import { requireAppUser } from "@/src/lib/session";

export const dynamic = "force-dynamic";

/**
 * Einstieg für „Realite öffnen“: Bei aktivem Singles-hier-Check-in direkt zur Eventseite.
 * Redirect per replace, damit „Zurück“ nicht auf diese URL looped.
 */
export default async function StartPage() {
  const user = await requireAppUser();

  if (!user) {
    redirect(buildLoginPath("/start") as never);
  }

  const slug = await getActiveSinglesHereCheckedInSlugForUser({
    userId: user.id,
    now: new Date(),
  });

  if (slug) {
    redirect(`/singles/${encodeURIComponent(slug)}`, RedirectType.replace);
  }

  redirect("/events");
}
