import { redirect } from "next/navigation";

import { GroupsPage } from "@/src/components/groups-page";
import { resolveProfileImageReadUrl } from "@/src/lib/profile-image-storage";
import { requireAppUser } from "@/src/lib/session";

export const dynamic = "force-dynamic";

export default async function GroupsOverviewPage() {
  const user = await requireAppUser();

  if (!user) {
    redirect("/");
  }

  const userImage = await resolveProfileImageReadUrl(user.image);

  return (
    <GroupsPage
      userName={user.name ?? user.email}
      userEmail={user.email}
      userImage={userImage}
    />
  );
}
