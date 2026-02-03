import { isWithinRadius } from "@/shared/utils/distance";
import { PlanLocation, PlanLocationChoice, PlanLocationOption } from "./types";

export function hasCoords(location: PlanLocationOption): boolean {
  return (
    typeof location.latitude === "number" &&
    typeof location.longitude === "number"
  );
}

export function isChoice(location: PlanLocation): location is PlanLocationChoice {
  return "anyOf" in location;
}

export function locationSpecificity(location: PlanLocationOption): number {
  let score = 0;
  if (location.name) score += 1;
  if (location.address) score += 1;
  if (hasCoords(location)) score += 2;
  if (typeof location.radiusMeters === "number") score -= 1;
  return score;
}

export function normalizeOptions(location: PlanLocation): PlanLocationOption[] {
  return isChoice(location) ? location.anyOf : [location];
}

export function locationsMatch(a: PlanLocation, b: PlanLocation): boolean {
  const optionsA = normalizeOptions(a);
  const optionsB = normalizeOptions(b);
  for (const optionA of optionsA) {
    for (const optionB of optionsB) {
      if (locationOptionsMatch(optionA, optionB)) return true;
    }
  }
  return false;
}

export function locationOptionsMatch(
  a: PlanLocationOption,
  b: PlanLocationOption,
): boolean {
  if (a.name && b.name && a.name !== b.name) return false;
  if (a.address && b.address && a.address !== b.address) return false;

  if (hasCoords(a) && hasCoords(b)) {
    const radiusA =
      typeof a.radiusMeters === "number" ? a.radiusMeters : undefined;
    const radiusB =
      typeof b.radiusMeters === "number" ? b.radiusMeters : undefined;
    if (radiusA || radiusB) {
      if (radiusA && radiusB) {
        return (
          isWithinRadius(
            a.latitude!,
            a.longitude!,
            b.latitude!,
            b.longitude!,
            radiusA + radiusB,
          ) || false
        );
      }
      const radius = radiusA ?? radiusB ?? 0;
      const center = radiusA ? a : b;
      const target = radiusA ? b : a;
      return isWithinRadius(
        center.latitude!,
        center.longitude!,
        target.latitude!,
        target.longitude!,
        radius,
      );
    }
    return a.latitude === b.latitude && a.longitude === b.longitude;
  }

  return true;
}

export function mergeLocations(
  current: PlanLocation,
  incoming: PlanLocation,
): PlanLocation {
  if (isChoice(current) && isChoice(incoming)) {
    const intersection = current.anyOf.filter((option) =>
      incoming.anyOf.some((other) => locationOptionsMatch(option, other)),
    );
    return intersection.length > 0 ? { anyOf: intersection } : incoming;
  }

  if (isChoice(current) && !isChoice(incoming)) return incoming;
  if (!isChoice(current) && isChoice(incoming)) return current;

  if (!isChoice(current) && !isChoice(incoming)) {
    const currentScore = locationSpecificity(current);
    const incomingScore = locationSpecificity(incoming);
    return incomingScore > currentScore ? incoming : current;
  }

  return incoming;
}
