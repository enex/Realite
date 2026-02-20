import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { GroupDetail } from "@/src/components/group-detail";
import { authOptions } from "@/src/lib/auth";

export default async function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/");
  }

  const { groupId } = await params;

  return <GroupDetail groupId={groupId} userName={session.user.name ?? session.user.email} />;
}
