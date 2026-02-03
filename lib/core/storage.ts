import { Storage, StoredPlan } from "./types";

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
