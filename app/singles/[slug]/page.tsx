import { notFound } from "next/navigation";

import { SinglesHerePage } from "@/src/components/singles-here-page";
import { buildLoginPath } from "@/src/lib/provider-adapters";
import {
  getSinglesHereEventBySlug,
  getSinglesHerePresence,
} from "@/src/lib/repository";
import { buildSinglesHereClientPayload } from "@/src/lib/singles-here-payload";
import { requireAppUser } from "@/src/lib/session";

export const dynamic = "force-dynamic";

export default async function SinglesHereRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await requireAppUser();

  if (!user) {
    const event = await getSinglesHereEventBySlug(slug);
    if (!event) {
      notFound();
    }
    const loginPath = buildLoginPath(`/singles/${encodeURIComponent(event.slug)}`);
    return (
      <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-6 py-12">
        <p className="text-sm font-semibold text-teal-700">Realite Singles hier</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{event.name}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Melde dich an, um dich bewusst vor Ort sichtbar zu machen und passende
          andere Personen zu sehen.
        </p>
        <a
          href={loginPath}
          className="mt-6 inline-flex w-fit rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Schnell anmelden
        </a>
      </main>
    );
  }

  const presence = await getSinglesHerePresence({ userId: user.id, slug });
  if (!presence) {
    notFound();
  }

  const initialPayload = await buildSinglesHereClientPayload(presence, user.image);

  return (
    <SinglesHerePage
      initialPayload={initialPayload}
      currentUserName={user.name}
      currentUserId={user.id}
    />
  );
}
