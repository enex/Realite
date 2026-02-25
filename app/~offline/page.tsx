export const metadata = {
  title: "Offline – Realite"
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-xl font-semibold text-slate-800">Du bist offline</h1>
      <p className="mt-2 text-slate-600">
        Bitte prüfe deine Internetverbindung und lade die Seite neu.
      </p>
    </main>
  );
}
