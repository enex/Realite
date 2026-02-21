import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { SettingsPage } from "@/src/components/settings-page";
import { authOptions } from "@/src/lib/auth";

export default async function UserSettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/");
  }

  return <SettingsPage userName={session.user.name ?? session.user.email} />;
}
