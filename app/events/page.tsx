import { redirect } from "next/navigation";

import { Dashboard } from "@/src/components/dashboard";
import { getAuthSession } from "@/src/lib/auth";

export default async function EventsPage() {
  const session = await getAuthSession();

  if (!session?.user.email) {
    redirect("/");
  }

  return (
    <Dashboard
      userName={session.user.name ?? session.user.email}
      userEmail={session.user.email}
      userImage={session.user.image ?? null}
    />
  );
}
