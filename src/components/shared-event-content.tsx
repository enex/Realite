type SharedEventContentProps = {
  title: string;
  startsAtIso: string;
  endsAtIso: string;
  description?: string | null;
  location?: string | null;
  groupName?: string | null;
  createdByShortId?: string | null;
  createdByName?: string | null;
  createdByEmail?: string | null;
};

export function SharedEventContent(props: SharedEventContentProps) {
  const startsAt = new Date(props.startsAtIso);
  const endsAt = new Date(props.endsAtIso);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{props.title}</h1>
        {props.groupName ? (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{props.groupName}</span>
        ) : null}
      </div>

      <p className="mt-3 text-sm text-slate-600 sm:text-base">
        {startsAt.toLocaleDateString("de-DE", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric"
        })}{" "}
        · {startsAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} bis{" "}
        {endsAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
      </p>

      {props.location ? <p className="mt-2 text-sm text-slate-700">Ort: {props.location}</p> : null}

      {props.createdByEmail ? (
        <p className="mt-2 text-sm text-slate-500">
          Von{" "}
          {props.createdByShortId ? (
            <a href={`/u/${props.createdByShortId}`} className="font-medium text-teal-700 hover:text-teal-800">
              {props.createdByName ?? props.createdByEmail}
            </a>
          ) : (
            props.createdByName ?? props.createdByEmail
          )}
          {props.createdByName ? ` (${props.createdByEmail})` : ""}
        </p>
      ) : null}

      {props.description ? <p className="mt-4 whitespace-pre-wrap text-sm text-slate-700">{props.description}</p> : null}
    </section>
  );
}
