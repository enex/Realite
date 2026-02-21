import { redirect } from "next/navigation";

import { GroupDetail } from "@/src/components/group-detail";
import { getAuthSession } from "@/src/lib/auth";

export default async function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const session = await getAuthSession();

  if (!session?.user.email) {
    redirect("/");
  }

  const { groupId } = await params;

  return (
    <GroupDetail
      groupId={groupId}
      userName={session.user.name ?? session.user.email}
      userEmail={session.user.email}
      userImage={session.user.image ?? null}
    />
  );
}
