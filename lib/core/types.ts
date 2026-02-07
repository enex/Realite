import { Gender } from "@/shared/validation";
import { RelationshipStatus } from "@/shared/validation";

export interface PlanLocationOption {
  id?: string;
  label?: string;
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

export interface PlanTimeOption {
  id?: string;
  label?: string;
  start: string;
  end: string;
}

export type PlanVisibility = "private" | "contacts" | "public" | "specific";

export type PlanMode = "personal" | "collaborative" | "gathering";

export type PlanStatus =
  | "draft"
  | "open"
  | "proposed"
  | "accepted"
  | "declined"
  | "cancelled"
  | "completed"
  | "expired";

export type PlanRecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY";

export interface PlanRecurrenceRule {
  frequency: PlanRecurrenceFrequency;
  interval?: number;
  byWeekday?: string[];
  count?: number;
  until?: string;
  exceptions?: string[];
}

export interface PlanParticipationSettings {
  visibility?: PlanVisibility;
  mode?: PlanMode;
  minParticipants?: number;
  maxParticipants?: number;
  hostApprovalRequired?: boolean;
  targetUsers?: string[];
  preferences?: {
    contactsOnly?: boolean;
    genders?: Gender[];
    relationshipStatuses?: RelationshipStatus[];
  };
}

export interface PlanGatheringLink {
  id: string;
  title?: string;
  source?: string;
}

export interface PlanCollaborationMetadata {
  threadId?: string;
  basedOnPlanId?: string;
  responseToPlanId?: string;
  negotiationStep?: number;
}

export interface PlanLifecycle {
  status?: PlanStatus;
  createdAt?: string;
  updatedAt?: string;
  expiresAt?: string;
  completedAt?: string;
}

export interface PlanReminderSettings {
  expiresAt?: string;
  remindAt?: string[];
  remindBeforeMinutes?: number[];
}

export interface PlanDiscoverySignals {
  activityTypes?: string[];
  tags?: string[];
  suggestedUserIds?: string[];
  reconnectWithUserIds?: string[];
}

export interface Plan {
  when?: { start: string; end: string };
  whenOptions?: PlanTimeOption[];
  selectedWhenOptionId?: string;
  timeZone?: string;
  what?: {
    category?: string;
    activity?: string;
    title?: string;
    description?: string;
    url?: string;
  };
  where?: PlanLocation;
  whereOptions?: PlanLocationOption[];
  selectedWhereOptionId?: string;
  who?: { gender?: Gender[]; explicit?: string[] };
  participation?: PlanParticipationSettings;
  recurrence?: PlanRecurrenceRule;
  gathering?: PlanGatheringLink;
  collaboration?: PlanCollaborationMetadata;
  lifecycle?: PlanLifecycle;
  reminders?: PlanReminderSettings;
  discovery?: PlanDiscoverySignals;
  certainty?: number;
}

export interface PlanWithCreator extends Plan {
  creator: string;
}

export interface PlanWithCertainty extends Plan {
  /**
   * Certainty as probability in range [0, 1].
   * Plans with 0 certainty are effectively declined.
   * Plans with 1 certainty are fully committed.
   *
   * When omitted in persisted plans, use a default of 1 (fully certain).
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
