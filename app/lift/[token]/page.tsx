import { redirect } from "next/navigation";

import { verifyLiftToken } from "@/src/lib/lift-token";
import { buildLoginPath } from "@/src/lib/provider-adapters";
import {
  addUserToKontakteGroupFromLift,
  getSinglesHereEventBySlug,
} from "@/src/lib/repository";
import { requireAppUser } from "@/src/lib/session";

export const dynamic = "force-dynamic";

export default async function LiftTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const verified = verifyLiftToken({ token });

  if (!verified.ok) {
    redirect("/");
  }

  const event = await getSinglesHereEventBySlug(verified.token.singlesSlug);
  if (!event) {
    redirect("/");
  }

  const eventPath = `/singles/${encodeURIComponent(event.slug)}`;
  const user = await requireAppUser();
  if (!user) {
    redirect(buildLoginPath(`/lift/${encodeURIComponent(token)}`) as never);
  }

  await addUserToKontakteGroupFromLift({
    ownerUserId: verified.token.ownerUserId,
    visitorUserId: user.id,
  });

  redirect(eventPath as never);
}
