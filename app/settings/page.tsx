import { redirect } from "next/navigation";

import { SettingsPage } from "@/src/components/settings-page";
import { getAuthSession } from "@/src/lib/auth";

export const dynamic = "force-dynamic";

export default async function UserSettingsPage() {
  const session = await getAuthSession();

  if (!session?.user.email) {
    redirect("/");
  }

  return (
    <SettingsPage
      userName={session.user.name ?? session.user.email}
      userEmail={session.user.email}
      userImage={session.user.image ?? null}
    />
  );
}
