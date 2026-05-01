import { redirect } from "next/navigation";

import { Dashboard } from "@/src/components/dashboard";
import { resolveProfileImageReadUrl } from "@/src/lib/profile-image-storage";
import { requireAppUser } from "@/src/lib/session";

export const dynamic = "force-dynamic";

export default async function NowPage() {
  const user = await requireAppUser();

  if (!user) redirect("/");

  const userImage = await resolveProfileImageReadUrl(user.image);

  return (
    <Dashboard
      view="now"
      userName={user.name ?? user.email}
      userEmail={user.email}
      userImage={userImage}
    />
  );
}
