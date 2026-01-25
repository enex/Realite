import { describe, expect, test } from "bun:test";
import { addSeconds } from "date-fns";
import {
  InMemoryStorage,
  type Plan,
  plansMatch,
  RealiteCore,
  specificity,
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
    await b.putPlan({
      what: plans1[0].what,
      who: plans1[0].who,
      when: {
        start: "2026-01-23T19:00:00",
        end: "2026-01-23T20:00:00",
      },
    });
    // a now sees the concrete plan
    const plans2 = await a.getSuggestions();
    expect(plans2).toHaveLength(1);
  });
});
