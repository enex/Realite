import { redirect } from "next/navigation";

import { Dashboard } from "@/src/components/dashboard";
import { getAuthSession } from "@/src/lib/auth";
import { resolveProfileImageReadUrl } from "@/src/lib/profile-image-storage";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const session = await getAuthSession();

  if (!session?.user.email) redirect("/");

  const userImage = await resolveProfileImageReadUrl(session.user.image ?? null);

  return (
    <Dashboard
      view="events"
      userName={session.user.name ?? session.user.email}
      userEmail={session.user.email}
      userImage={userImage}
    />
  );
}
