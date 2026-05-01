import { redirect } from "next/navigation";

import { SettingsPage } from "@/src/components/settings-page";
import { getAuthSession } from "@/src/lib/auth";
import { resolveProfileImageReadUrl } from "@/src/lib/profile-image-storage";

export const dynamic = "force-dynamic";

export default async function UserSettingsPage() {
  const session = await getAuthSession();

  if (!session?.user.email) {
    redirect("/");
  }

  const userImage = await resolveProfileImageReadUrl(session.user.image ?? null);

  return (
    <SettingsPage
      userName={session.user.name ?? session.user.email}
      userEmail={session.user.email}
      userImage={userImage}
      isAnonymous={session.user.isAnonymous === true}
    />
  );
}
