"use client";

type AccountDeleteCardProps = {
  busy: boolean;
  error: string | null;
  onDelete: () => void;
};

export function AccountDeleteCard({ busy, error, onDelete }: AccountDeleteCardProps) {
  return (
    <section className="mt-6 rounded-2xl border border-red-200 bg-red-50/60 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-red-900">Account löschen</h2>
      <p className="mt-2 text-sm text-red-800">
        Dieser Schritt ist endgültig. Realite entfernt dabei dein Profil inklusive zugehöriger Daten aus der Datenbank.
      </p>
      <p className="mt-1 text-sm text-red-800">
        Zusätzlich werden zuvor von Realite angelegte Kalendereinträge aus deinem Kalender entfernt.
      </p>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-300 bg-white/70 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      <div className="mt-4">
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Lösche Account..." : "Account endgültig löschen"}
        </button>
      </div>
    </section>
  );
}
