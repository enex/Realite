import { redirect } from "next/navigation";

import { SuggestionsPage } from "@/src/components/suggestions-page";
import { getAuthSession } from "@/src/lib/auth";

export const dynamic = "force-dynamic";

export default async function SuggestionsRoutePage() {
  const session = await getAuthSession();

  if (!session?.user.email) {
    redirect("/");
  }

  return (
    <SuggestionsPage
      userName={session.user.name ?? session.user.email}
      userEmail={session.user.email}
      userImage={session.user.image ?? null}
    />
  );
}
