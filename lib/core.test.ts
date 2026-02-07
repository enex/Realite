import { describe, expect, test } from "bun:test";
import { addSeconds } from "date-fns";
import {
  classifyByCertainty,
  combinePlans,
  getSelectedLocationOption,
  getSelectedTimeOption,
  isCollaborativePlan,
  isOpenInvitation,
  isPlanExpired,
  InMemoryStorage,
  type Plan,
  plansMatch,
  readinessScore,
  RealiteCore,
  selectPlanOptions,
  specificity,
  timesMatch,
  willLikelyExecute,
} from "./core";

describe("plansMatch", () => {
  test("Irgendwann boldern gehen & Irgendwann sport machen", () => {
    const planA: Plan = {
      what: { category: "sport", activity: "boldern" },
    };
    const planB: Plan = {
      what: { category: "sport" },
    };
    expect(plansMatch(planA, planB)).toBeTrue();
  });

  test("Lehre Pläne matchen alles", () => {
    const planA: Plan = {
      what: { category: "sport", activity: "boldern" },
    };
    const planB: Plan = {};
    expect(plansMatch(planA, planB)).toBeTrue();
  });

  test("locations match within radius", () => {
    const planA: Plan = {
      where: { latitude: 0, longitude: 0, radiusMeters: 1000 },
    };
    const planB: Plan = {
      where: { latitude: 0, longitude: 0.005 },
    };
    expect(plansMatch(planA, planB)).toBeTrue();
  });

  test("locations do not match outside radius", () => {
    const planA: Plan = {
      where: { latitude: 0, longitude: 0, radiusMeters: 1000 },
    };
    const planB: Plan = {
      where: { latitude: 0, longitude: 0.02 },
    };
    expect(plansMatch(planA, planB)).toBeFalse();
  });

  test("locations match with anyOf selection", () => {
    const planA: Plan = {
      where: {
        anyOf: [
          { name: "Club A", latitude: 52.52, longitude: 13.405 },
          { name: "Club B", latitude: 52.5205, longitude: 13.409 },
        ],
      },
    };
    const planB: Plan = {
      where: { name: "Club B", latitude: 52.5205, longitude: 13.409 },
    };
    const planC: Plan = {
      where: { name: "Club C", latitude: 48.137, longitude: 11.575 },
    };
    expect(plansMatch(planA, planB)).toBeTrue();
    expect(plansMatch(planA, planC)).toBeFalse();
  });
});

describe("specificity", () => {
  test("location is more specific than empty plan", () => {
    const planA: Plan = {
      what: { category: "sport" },
    };
    const planB: Plan = {};
    expect(specificity(planA)).toBeGreaterThan(specificity(planB));
  });
});

describe("plan model capabilities", () => {
  test("can represent and narrow multiple time and location options", () => {
    const proposal: Plan = {
      what: { category: "sport", activity: "jogging", title: "Joggen gehen" },
      whenOptions: [
        {
          id: "morning",
          start: "2026-01-24T08:00:00.000Z",
          end: "2026-01-24T09:00:00.000Z",
        },
        {
          id: "evening",
          start: "2026-01-24T18:00:00.000Z",
          end: "2026-01-24T19:00:00.000Z",
        },
      ],
      whereOptions: [
        {
          id: "aschaffenburg-city",
          name: "Aschaffenburg Innenstadt",
          latitude: 49.975,
          longitude: 9.145,
        },
        {
          id: "park-schoenbusch",
          name: "Schönbusch",
          latitude: 49.96,
          longitude: 9.129,
        },
      ],
      participation: {
        visibility: "specific",
        targetUsers: ["friend-a"],
        maxParticipants: 3,
      },
      certainty: 0.9,
    };

    const narrowed = selectPlanOptions(proposal, {
      whenOptionId: "morning",
      whereOptionId: "park-schoenbusch",
    });
    expect(getSelectedTimeOption(narrowed)?.id).toBe("morning");
    expect(getSelectedLocationOption(narrowed)?.id).toBe("park-schoenbusch");
    expect(narrowed.when).toEqual({
      start: "2026-01-24T08:00:00.000Z",
      end: "2026-01-24T09:00:00.000Z",
    });
    expect(narrowed.where).toMatchObject({ id: "park-schoenbusch" });
  });

  test("captures invitation visibility and collaboration mode", () => {
    const personal: Plan = {
      participation: { mode: "personal", visibility: "private" },
      certainty: 0.85,
    };
    const publicInvite: Plan = {
      participation: {
        mode: "collaborative",
        visibility: "public",
        maxParticipants: 8,
      },
      certainty: 0.8,
    };
    expect(isOpenInvitation(personal)).toBeFalse();
    expect(isCollaborativePlan(personal)).toBeFalse();
    expect(isOpenInvitation(publicInvite)).toBeTrue();
    expect(isCollaborativePlan(publicInvite)).toBeTrue();
  });

  test("supports recurrence, gathering linkage and lifecycle expiration", () => {
    const recurringGatheringPlan: Plan = {
      what: { category: "sport", activity: "running" },
      recurrence: {
        frequency: "WEEKLY",
        interval: 1,
        byWeekday: ["SA"],
      },
      gathering: {
        id: "run-club-ash",
        title: "Run Club Aschaffenburg",
        source: "manual",
      },
      lifecycle: {
        status: "open",
        expiresAt: "2026-01-24T07:00:00.000Z",
      },
      reminders: {
        remindBeforeMinutes: [60, 15],
      },
      certainty: 0.72,
    };

    expect(
      isPlanExpired(recurringGatheringPlan, new Date("2026-01-24T08:00:00.000Z")),
    ).toBeTrue();
    expect(specificity(recurringGatheringPlan)).toBeGreaterThan(0);
  });
});

describe("matching and ranking", () => {
  test("time matching respects overlap for concrete plans", () => {
    const a: Plan = {
      when: {
        start: "2026-01-24T08:00:00.000Z",
        end: "2026-01-24T09:00:00.000Z",
      },
      certainty: 0.9,
    };
    const b: Plan = {
      when: {
        start: "2026-01-24T10:00:00.000Z",
        end: "2026-01-24T11:00:00.000Z",
      },
      certainty: 0.9,
    };
    expect(timesMatch(a, b)).toBeFalse();
    expect(plansMatch(a, b)).toBeFalse();
  });

  test("same certainty but higher specificity yields higher readiness", () => {
    const generic: Plan = {
      what: { category: "sport" },
      certainty: 0.9,
    };
    const specific: Plan = {
      what: { category: "sport", activity: "jogging", title: "Joggen morgen" },
      when: {
        start: "2026-01-24T08:00:00.000Z",
        end: "2026-01-24T09:00:00.000Z",
      },
      where: {
        name: "Aschaffenburg Innenstadt",
        latitude: 49.975,
        longitude: 9.145,
      },
      certainty: 0.9,
    };
    expect(classifyByCertainty(generic)).toBe("commitment");
    expect(classifyByCertainty(specific)).toBe("commitment");
    expect(readinessScore(specific)).toBeGreaterThan(readinessScore(generic));
  });
});

describe("combinePlans", () => {
  test("combining time windows does not mutate the base plan", () => {
    const base: Plan = {
      when: {
        start: "2026-01-24T08:00:00.000Z",
        end: "2026-01-24T11:00:00.000Z",
      },
      certainty: 0.9,
    };
    const incoming: Plan = {
      when: {
        start: "2026-01-24T09:00:00.000Z",
        end: "2026-01-24T10:00:00.000Z",
      },
      certainty: 0.8,
    };

    const combined = combinePlans(base, incoming);

    expect(base.when).toEqual({
      start: "2026-01-24T08:00:00.000Z",
      end: "2026-01-24T11:00:00.000Z",
    });
    expect(combined.when).toEqual({
      start: "2026-01-24T09:00:00.000Z",
      end: "2026-01-24T10:00:00.000Z",
    });
    expect(combined.certainty).toBeCloseTo(0.72, 8);
  });

  test("non-overlapping concrete times force certainty to zero", () => {
    const base: Plan = {
      when: {
        start: "2026-01-24T08:00:00.000Z",
        end: "2026-01-24T09:00:00.000Z",
      },
      certainty: 0.95,
    };
    const incoming: Plan = {
      when: {
        start: "2026-01-24T10:00:00.000Z",
        end: "2026-01-24T11:00:00.000Z",
      },
      certainty: 0.9,
    };

    const combined = combinePlans(base, incoming);
    expect(combined.certainty).toBe(0);
    expect(combined.when).toBeUndefined();
  });

  test("location options are narrowed and selected", () => {
    const base: Plan = {
      whereOptions: [
        { id: "center", name: "Aschaffenburg Innenstadt" },
        { id: "park", name: "Schönbusch" },
      ],
      certainty: 0.9,
    };
    const incoming: Plan = {
      whereOptions: [{ id: "park", name: "Schönbusch" }],
      certainty: 0.85,
    };

    const combined = combinePlans(base, incoming);
    expect(combined.whereOptions).toHaveLength(1);
    expect(combined.selectedWhereOptionId).toBe("park");
    expect(combined.where).toMatchObject({ id: "park", name: "Schönbusch" });
    expect(combined.certainty).toBeCloseTo(0.765, 8);
  });
});

describe("certainty semantics", () => {
  test("likely execution is decided by threshold", () => {
    const uncertain: Plan = { certainty: 0.5 };
    const likely: Plan = { certainty: 0.75 };

    expect(willLikelyExecute(uncertain)).toBeFalse();
    expect(willLikelyExecute(likely)).toBeTrue();
    expect(willLikelyExecute(uncertain, 0.5)).toBeTrue();
  });
});

describe("RealiteCore", () => {
  function create() {
    const store = new InMemoryStorage();
    let now = new Date("2026-01-23T18:00:00+01:00");
    let i = 0;
    let j = 1;
    return {
      store,
      user: (uid: string) =>
        new RealiteCore(
          store,
          { id: uid },
          () => {
            now = addSeconds(now, i++);
            return now;
          },
          () => {
            return `${j++}`;
          },
        ),
    };
  }

  test("add and get plans", async () => {
    const c = create();
    const a = c.user("a");
    const b = c.user("b");
    await a.putPlan({
      when: {
        start: "2026-01-23T18:00:00",
        end: "2026-01-23T20:00:00",
      },
      what: { category: "sport" },
    });
    await b.putPlan({
      when: {
        start: "2026-01-23T19:00:00",
        end: "2026-01-23T22:00:00",
      },
      what: { category: "sport" },
    });
    const plans = await b.getSuggestions({ limit: 10 });
    expect(plans[0]).toMatchObject({
      when: {
        start: "2026-01-23T19:00:00",
        end: "2026-01-23T20:00:00",
      },
      what: { category: "sport" },
    });
  });

  test("no options because the exact time is not available", async () => {
    const c = create();
    const a = c.user("a");
    const b = c.user("b");
    await a.putPlan({
      when: {
        start: "2026-01-23T18:00:00",
        end: "2026-01-23T20:00:00",
      },
      certainty: 0,
    });
    await b.putPlan({
      when: {
        start: "2026-01-23T18:00:00",
        end: "2026-01-23T20:00:00",
      },
      what: { category: "sport" },
    });

    const plans = await a.getSuggestions();
    expect(plans).toHaveLength(0);

    const plansOther = await b.getSuggestions();
    expect(plansOther).toHaveLength(0);
  });

  test("two people get to a specific plan with several plans", async () => {
    const c = create();
    const a = c.user("a");
    const b = c.user("b");
    await a.putPlan({
      what: {
        category: "eat",
        title: "Mal pizza essen gehen und unterhalten",
      },
    });
    const plans1 = await b.getSuggestions();
    expect(plans1).toHaveLength(1);
    // accept the plan and make it more specific
    await b.acceptPlan(plans1[0], {
      when: {
        start: "2026-01-23T19:00:00",
        end: "2026-01-23T21:00:00",
      },
    });
    // a now sees the concrete plan
    const plans2 = await a.getSuggestions();
    expect(plans2).toHaveLength(1);
  });

  test("only suggest stuff not collidating with my event in my calendar", async () => {
    const c = create();
    const a = c.user("a");
    const b = c.user("b");
    await a.importBlockedTimes([
      {
        start: "2026-01-23T18:00:00",
        end: "2026-01-23T20:00:00",
        id: "blocked-1",
      },
      {
        start: "2026-02-14T13:00:00",
        end: "2026-02-14T16:00:00",
        id: "blocked-2",
      },
    ]);
  });

  test("location choices narrow to the selected location", async () => {
    const c = create();
    const a = c.user("a");
    const b = c.user("b");
    await a.putPlan({
      what: { category: "eat" },
      where: {
        anyOf: [
          { name: "Club A", latitude: 52.52, longitude: 13.405 },
          { name: "Club B", latitude: 52.5205, longitude: 13.409 },
        ],
      },
    });
    await b.putPlan({
      what: { category: "eat" },
      where: { name: "Club B", latitude: 52.5205, longitude: 13.409 },
    });

    const plans = await b.getSuggestions();
    expect(plans).toHaveLength(1);
    expect(plans[0].where).toMatchObject({
      name: "Club B",
      latitude: 52.5205,
      longitude: 13.409,
    });
  });
});
