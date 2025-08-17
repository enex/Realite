import { z } from "zod";

export const genders = [
  "MALE",
  "FEMALE",
  "NON_BINARY",
  "OTHER",
  "PREFER_NOT_TO_SAY",
] as const;
export type Gender = (typeof genders)[number];

export const relationshipStatuses = [
  "SINGLE",
  "IN_RELATIONSHIP",
  "MARRIED",
  "PREFER_NOT_TO_SAY",
  "COMPLICATED",
] as const;

export const genderSchema = z.enum(genders);
export const relationshipStatusSchema = z.enum(relationshipStatuses);
export type RelationshipStatus = (typeof relationshipStatuses)[number];

export const demographicCriteriaSchema = z.object({
  gender: z.array(genderSchema).optional(),
  relationshipStatus: z.array(relationshipStatusSchema).optional(),
});

export type DemographicCriteria = z.infer<typeof demographicCriteriaSchema>;

export const PHONE_NUMBER_HASH_NAMESPACE =
  "123e4567-e89b-12d3-a456-426614174000";
