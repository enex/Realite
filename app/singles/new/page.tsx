import { buildLoginPath } from "@/src/lib/provider-adapters";
import { requireAppUser } from "@/src/lib/session";
import { SinglesHereCreatePage } from "@/src/components/singles-here-create-page";

export const dynamic = "force-dynamic";

export default async function NewSinglesHereEventPage() {
  const user = await requireAppUser();

  if (!user) {
    const loginPath = buildLoginPath("/singles/new");
    return (
      <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-6 py-12">
        <p className="text-sm font-semibold text-teal-700">Realite Experiment</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Singles-hier Event anlegen
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Nur angemeldete Nutzer können eine Event-URL mit QR-Code erstellen.
        </p>
        <a
          href={loginPath}
          className="mt-6 inline-flex w-fit rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Anmelden
        </a>
      </main>
    );
  }

  return <SinglesHereCreatePage />;
}
