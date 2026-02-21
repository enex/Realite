import { redirect } from "next/navigation";

import { GroupsPage } from "@/src/components/groups-page";
import { getAuthSession } from "@/src/lib/auth";

export default async function GroupsOverviewPage() {
  const session = await getAuthSession();

  if (!session?.user.email) {
    redirect("/");
  }

  return (
    <GroupsPage
      userName={session.user.name ?? session.user.email}
      userEmail={session.user.email}
      userImage={session.user.image ?? null}
    />
  );
}
