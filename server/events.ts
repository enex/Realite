import { ActivityId } from "@/shared/activities";
import { Gender, RelationshipStatus } from "@/shared/validation";
import { CoreRepetition } from "@/shared/validation/plan";

export interface RealiteEvents {
  "realite.plan.created": {
    activity: ActivityId;
    startDate: string; // ISO date string
    endDate?: string; // ISO date string
    title?: string; // name of the realite
    inputText?: string; // text the user typed in to create the plan (if rest was LLM Generated)
    description?: string; // description of the realite
    url?: string; // url to information about the realite
    gathering?: string; // id of the gathering this plan is to participate in
    locations?: {
      title: string;
      address?: string;
      latitude: number;
      longitude: number;
      url?: string;
      description?: string;
      category?: string;
    }[]; // selected locations
    repetition?: CoreRepetition;
    maybe?: boolean; // if true, the user has not fully confirmed the plan yet
  };
  "realite.plan.changed": {
    name?: string; // name of the realite
    startDate?: string; // ISO date string
    endDate?: string; // ISO date string
    description?: string; // description of the realite
    url?: string; // url of the realite
    activity?: ActivityId;
    gathering?: string | null; // id of the gathering this plan is to participate in
    locations?: {
      title: string;
      address?: string;
      latitude: number;
      longitude: number;
      url?: string;
      description?: string;
      category?: string;
    }[]; // selected locations
    repetition?: CoreRepetition;
    maybe?: boolean; // if true, the user has not fully confirmed the plan yet
  };
  // this plan is no longer my plan
  "realite.plan.cancelled": {
    reason: "schedule-conflict" | "other";
    comment?: string; // comment about the cancellation, e.g. "I'm sorry, I can't make it this time."
  };
  // if the plan is realized, the user has executed the plan and did what they planned to do
  "realite.plan.realized": {
    comment?: string; // comment about the realization, e.g. "It was very nice to meet you!"
    rating?: number; // rating of the realization, e.g. 5 stars
    repeat?: boolean; // if true, the user wants to repeat the plan
  };
  // when a user participates in a plan by copying it
  "realite.plan.participated": {
    originalPlanId: string; // id of the original plan that was copied
    originalCreatorId: string; // id of the user who created the original plan
  };

  "realite.user.registered": {
    phoneNumber?: string;
    email?: string;
    name: string;
    deviceInfo: Record<string, unknown>;
    invitation?: {
      user: string;
      createdAt: number;
    };
  };
  "realite.user.onboarded": {};

  "realite.auth.token-refreshed": {};
  "realite.auth.phone-code-requested": {
    phoneNumber: string;
    deviceInfo?: Record<string, unknown>;
    code: string;
    expiresAt: string;
    userId?: string; // If the id ist known because it is for example added as a second factor
  };
  "realite.auth.phone-code-verified": {
    phoneNumber: string;
    userId: string;
  };
  "realite.auth.phone-code-invalid": {
    phoneNumber: string;
    reason: "code-invalid" | "code-expired" | "code-used";
  };

  "realite.profile.updated": {
    gender?: Gender;
    name?: string;
    image?: string;
    birthDate?: string; // ISO date string
    relationshipStatus?: RelationshipStatus;
    privacySettings?: {
      showGender?: boolean;
      showAge?: boolean;
      showRelationshipStatus?: boolean;
    };
  };

  "realite.contacts.imported": {
    hashes: string[];
  };
  "realite.contacts.unlinked": {
    userA: string;
    userB: string;
  };
}
