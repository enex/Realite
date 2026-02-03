import { Gender } from "@/shared/validation";

export interface PlanLocationOption {
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
}

export interface PlanLocationChoice {
  anyOf: PlanLocationOption[];
}

export type PlanLocation = PlanLocationOption | PlanLocationChoice;

export interface Plan {
  when?: { start: string; end: string };
  what?: {
    category?: string;
    activity?: string;
    title?: string;
    description?: string;
    url?: string;
  };
  where?: PlanLocation;
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
