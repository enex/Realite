import { redirect } from "next/navigation";

import { GroupDetail } from "@/src/components/group-detail";
import { getAuthSession } from "@/src/lib/auth";
import { resolveProfileImageReadUrl } from "@/src/lib/profile-image-storage";

export const dynamic = "force-dynamic";

export default async function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const session = await getAuthSession();

  if (!session?.user.email) {
    redirect("/");
  }

  const { groupId } = await params;

  const userImage = await resolveProfileImageReadUrl(session.user.image ?? null);

  return (
    <GroupDetail
      groupId={groupId}
      userName={session.user.name ?? session.user.email}
      userEmail={session.user.email}
      userImage={userImage}
    />
  );
}
