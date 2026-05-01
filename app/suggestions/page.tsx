import { redirect } from "next/navigation";

import { SuggestionsPage } from "@/src/components/suggestions-page";
import { resolveProfileImageReadUrl } from "@/src/lib/profile-image-storage";
import { requireAppUser } from "@/src/lib/session";

export const dynamic = "force-dynamic";

export default async function SuggestionsRoutePage() {
  const user = await requireAppUser();

  if (!user) {
    redirect("/");
  }

  const userImage = await resolveProfileImageReadUrl(user.image);

  return (
    <SuggestionsPage
      userName={user.name ?? user.email}
      userEmail={user.email}
      userImage={userImage}
    />
  );
}
