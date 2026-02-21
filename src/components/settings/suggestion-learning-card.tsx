"use client";

type SuggestionCriterion = {
  key: string;
  label: string;
  weight: number;
  votes: number;
};

type SuggestionLearningCardProps = {
  positiveCriteria: SuggestionCriterion[];
  negativeCriteria: SuggestionCriterion[];
};

function CriteriaList({
  title,
  emptyLabel,
  criteria,
  tone
}: {
  title: string;
  emptyLabel: string;
  criteria: SuggestionCriterion[];
  tone: "positive" | "negative";
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {criteria.length === 0 ? <p className="mt-2 text-xs text-slate-500">{emptyLabel}</p> : null}
      <div className="mt-2 space-y-2">
        {criteria.map((criterion) => (
          <div key={criterion.key} className="rounded border border-slate-200 bg-white px-2 py-1.5">
            <p className="text-xs text-slate-800">{criterion.label}</p>
            <p className={`text-[11px] ${tone === "positive" ? "text-teal-700" : "text-rose-700"}`}>
              Gewicht {criterion.weight.toFixed(2)} · {criterion.votes} Feedbacks
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SuggestionLearningCard({ positiveCriteria, negativeCriteria }: SuggestionLearningCardProps) {
  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Nachvollziehbare Matching-Kriterien</h2>
      <p className="mt-2 text-sm text-slate-600">
        Diese Signale wurden aus deinen Zu- und Absagen gelernt und fließen direkt in die Vorschläge ein.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <CriteriaList
          title="Aktuell positiv gewichtet"
          emptyLabel="Noch keine positiven Signale."
          criteria={positiveCriteria}
          tone="positive"
        />
        <CriteriaList
          title="Aktuell negativ gewichtet"
          emptyLabel="Noch keine negativen Signale."
          criteria={negativeCriteria}
          tone="negative"
        />
      </div>
    </section>
  );
}
