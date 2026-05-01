import { redirect } from "next/navigation";

import { SettingsPage } from "@/src/components/settings-page";
import { resolveProfileImageReadUrl } from "@/src/lib/profile-image-storage";
import { requireAppUser } from "@/src/lib/session";

export const dynamic = "force-dynamic";

export default async function UserSettingsPage() {
  const user = await requireAppUser();

  if (!user) {
    redirect("/");
  }

  const userImage = await resolveProfileImageReadUrl(user.image);

  return (
    <SettingsPage
      userName={user.name ?? user.email}
      userEmail={user.email}
      userImage={userImage}
      isAnonymous={user.email.toLowerCase().endsWith("@guest.realite.local")}
    />
  );
}
