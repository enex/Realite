import { Gender } from "@/shared/validation";
import { v7 as uuidv7 } from "uuid";

export interface Plan {
  when?: { start: string; end: string };
  what?: {
    category?: string;
    activity?: string;
    title?: string;
    description?: string;
    url?: string;
  };
  where?: { name?: string; address?: string };
  who?: { gender?: Gender[]; explicit?: string[] };
  certainty?: number;
}

export interface PlanWithCreator extends Plan {
  creator: string;
}

export interface PlanWithCertainty extends Plan {
  /**
   * Certainty of the plan taking place. Plans with 0 Certainty will never take place.
   * Plans with 100 % will happen for sure, no matter what.
   *
   * When there is no plan we assume a certainty of 1 %, this way we can show suggestions even if nothing was selected.
   */
  certainty: number;
}

export function plansMatch(a: Plan, b: Plan): boolean {
  if (a.what && b.what) {
    if (
      a.what.category &&
      b.what.category &&
      a.what.category !== b.what.category
    )
      return false;
    if (
      a.what.activity &&
      b.what.activity &&
      a.what.activity !== b.what.activity
    )
      return false;
  }
  return true;
}

export function specificity(plan: Plan): number {
  let score = 0;
  if (plan.when) score += 2;
  if (plan.what) {
    if (plan.what.category) score += 1;
    if (plan.what.activity) score += 1;
  }
  if (plan.where) score += 2;
  if (plan.who) score += 2;
  return score;
}

export function combinePlans<P extends Plan>(base: P, ...plans: Plan[]): P {
  const combined = { certainty: 1, ...base };
  for (const plan of plans) {
    if (plan.when) {
      if (combined.when) {
        combined.when.start = maxDate(combined.when.start, plan.when.start);
        combined.when.end = minDate(combined.when.end, plan.when.end);
      } else {
        combined.when = plan.when;
      }
    }
    if (plan.what) combined.what = plan.what;
    if (plan.where) combined.where = plan.where;
    if (plan.who) combined.who = plan.who;
    if (typeof plan.certainty === "number")
      combined.certainty *= plan.certainty ?? 1;
  }
  return combined;
}

function minDate(a: string, b: string): string {
  return new Date(a).getTime() < new Date(b).getTime() ? a : b;
}

function maxDate(a: string, b: string): string {
  return new Date(a).getTime() > new Date(b).getTime() ? a : b;
}

export interface StoredPlan extends Plan, PlanWithCreator {
  certainty: number;
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Storage {
  putPlan(plan: StoredPlan): Promise<void>;
  deletePlan(id: string): Promise<void>;
  getPlans(): Promise<StoredPlan[]>;
}

export class InMemoryStorage implements Storage {
  private plans = new Map<string, StoredPlan>();

  async putPlan(plan: StoredPlan) {
    this.plans.set(plan.id, plan);
  }

  async deletePlan(id: string) {
    this.plans.delete(id);
  }

  async getPlans() {
    return Array.from(this.plans.values());
  }
}

export class RealiteCore {
  constructor(
    private storage: Storage,
    private user: { id: string },
    private now: () => Date = () => new Date(),
    private id: () => string = () => uuidv7(),
  ) {}

  async putPlan(plan: Partial<StoredPlan>): Promise<StoredPlan> {
    const at = this.now();
    const fullPlan: StoredPlan = {
      createdAt: at.toISOString(),
      updatedAt: at.toISOString(),
      certainty: 1,
      ...plan,
      id: plan.id || this.id(),
      creator: plan.creator || this.user.id,
    };
    await this.storage.putPlan(fullPlan);
    return fullPlan;
  }

  async acceptPlan(
    { id, creator, createdAt, updatedAt, ...plan }: StoredPlan,
    additional?: Partial<StoredPlan>,
  ): Promise<StoredPlan> {
    return this.putPlan({ ...plan, ...additional });
  }

  /**
   * this function can be called to import blocked times from a Calendar of the user
   * This way we will only suggest stuff not colliding with those events.
   */
  async importBlockedTimes(
    blockedTimes: { start: string; end: string; id: string }[],
  ): Promise<void> {
    for (const blockedTime of blockedTimes) {
      await this.putPlan({
        id: blockedTime.id,
        when: {
          start: blockedTime.start,
          end: blockedTime.end,
        },
        certainty: 0,
      });
    }
  }

  async getSuggestions({ limit = 10 }: { limit?: number } = {}) {
    const plans = await this.storage.getPlans();
    const myPlans = plans.filter((p) => p.creator === this.user.id);
    const otherPlans = plans.filter((p) => p.creator !== this.user.id);

    const res: StoredPlan[] = [];
    for (const plan of otherPlans) {
      const concrete = { who: { explicit: [plan.creator] } };
      const matching = myPlans.filter((p) => plansMatch(p, plan));
      const finalPlan = combinePlans(plan, concrete, ...matching);
      if (finalPlan.certainty > 0) res.push(finalPlan);
    }
    return res.sort((a, b) => b.certainty - a.certainty).slice(0, limit);
  }

  async myPlans({ limit = 10 }: { limit?: number }) {
    const plans = await this.storage.getPlans();
    return plans.filter((p) => p.creator === this.user.id).slice(0, limit);
  }

  /** given a plan from another user, returns options what the user may deny */
  async denyOptions(
    planToDeny: Plan,
  ): Promise<{ title: string; plan: Plan }[]> {
    const res: { title: string; plan: Plan }[] = [];

    res.push({
      title:
        "Ich kann oder will nicht mit dieser Person " +
        [
          planToDeny.when && "zu dieser Zeit",
          planToDeny.where && "an diesem Ort",
          planToDeny.what && "zu dieser Aktivität",
        ]
          .filter(Boolean)
          .join(" "),
      plan: { ...planToDeny, certainty: 0 },
    });

    if (planToDeny.when) {
      res.push({
        title: "Ich kann oder will generell nicht zu dieser Zeit",
        plan: { when: planToDeny.when, certainty: 0 },
      });
    }

    if (planToDeny.what) {
      res.push({
        title: "Ich mag generell nicht zu dieser Aktivität",
        plan: { what: planToDeny.what, certainty: 0 },
      });
    }

    return res;
  }
}
