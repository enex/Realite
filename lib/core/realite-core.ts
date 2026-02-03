import { v7 as uuidv7 } from "uuid";
import { combinePlans, plansMatch } from "./plans";
import { Plan, StoredPlan } from "./types";
import { Storage } from "./storage";

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
