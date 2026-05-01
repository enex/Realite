import { redirect } from "next/navigation";

import { GroupDetail } from "@/src/components/group-detail";
import { resolveProfileImageReadUrl } from "@/src/lib/profile-image-storage";
import { requireAppUser } from "@/src/lib/session";

export const dynamic = "force-dynamic";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const user = await requireAppUser();

  if (!user) {
    redirect("/");
  }

  const { groupId } = await params;

  const userImage = await resolveProfileImageReadUrl(user.image);

  return (
    <GroupDetail
      groupId={groupId}
      userName={user.name ?? user.email}
      userEmail={user.email}
      userImage={userImage}
    />
  );
}
