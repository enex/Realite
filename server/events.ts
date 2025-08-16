import { Gender, RelationshipStatus } from "@/shared/validation";

export interface RealiteEvents {
  "realite.plan.shared": {
    inputText?: string; // text the user typed in to create the plan (if rest was LLM Generated)
    title?: string; // name of the realite
    description?: string; // description of the realite
    url?: string; // url to information about the realite
    activity: string;
    gathering?: string; // id of the gathering this plan is to participate in
    location?: string; // id of the location this plan is to participate in
    alternativeLocations?: string[]; // ids of alternative locations this plan is to participate in
    times: { start: string; end: string }[];
    maybe?: boolean; // if true, the user has not fully confirmed the plan yet
  };
  "realite.plan.refined": {
    name?: string; // name of the realite
    description?: string; // description of the realite
    url?: string; // url of the realite
    activity?: string;
    gathering?: string | null; // id of the gathering this plan is to participate in
    location?: string; // id of the location this plan is to participate in
    alternativeLocations?: string[]; // ids of alternative locations this plan is to participate in
    times: { start: string; end: string }[];
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

  "realite.user.registered": {
    phoneNumber: string;
    name: string;
    deviceInfo: Record<string, unknown>;
  };
  "realite.user.onboarded": {};

  "realite.profile.updated": {
    gender?: Gender;
    name?: string;
    birthDate?: string; // ISO date string
    relationshipStatus?: RelationshipStatus;
    privacySettings?: {
      showGender: boolean;
      showAge: boolean;
      showRelationshipStatus: boolean;
    };
  };

  "realite.gathering.created": {
    name: string;
    description?: string;
    url?: string;
    startDate: string; // ISO date string
    endDate: string; // ISO date string
    locationId: string; // id of the location this gathering is to take place in
  };
  "realite.gathering.updated": {
    name?: string;
    description?: string;
    url?: string;
    startDate?: string; // ISO date string
    endDate?: string; // ISO date string
  };
  "realite.gathering.deleted": {};

  "realite.location.created": {
    name: string;
    url?: string;
    address?: string;
    city?: string;
    state?: string;
  };
  "realite.location.updated": {
    name?: string;
    url?: string;
    address?: string;
    city?: string;
    state?: string;
  };
  "realite.location.deleted": {};
}
