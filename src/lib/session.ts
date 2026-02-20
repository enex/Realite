import { getServerSession } from "next-auth";

import { authOptions } from "@/src/lib/auth";
import { ensureAlleGroupForUser, ensureKontakteGroupForUser, getUserByEmail } from "@/src/lib/repository";

export async function requireAppUser() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) {
    return null;
  }

  const user = await getUserByEmail(email);
  if (user) {
    await ensureAlleGroupForUser(user.id);
    await ensureKontakteGroupForUser(user.id);
  }
  return user;
}
