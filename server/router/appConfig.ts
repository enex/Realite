import { z } from "zod";
import { publicRoute } from "../orpc";

// Minimale unterstützte Versionen für iOS und Android
const MIN_SUPPORTED_VERSIONS = {
  ios: "0.1.0",
  android: "0.1.0",
} as const;

export const appConfigRouter = {
  getMinSupportedVersions: publicRoute.handler(() => {
    return MIN_SUPPORTED_VERSIONS;
  }),

  checkVersionCompatibility: publicRoute
    .input(
      z.object({
        platform: z.enum(["ios", "android"]),
        currentVersion: z.string(),
      })
    )
    .handler(({ input }) => {
      const minVersion = MIN_SUPPORTED_VERSIONS[input.platform];
      const isSupported =
        compareVersions(input.currentVersion, minVersion) >= 0;

      return {
        isSupported,
        minVersion,
        currentVersion: input.currentVersion,
        needsUpdate: !isSupported,
      };
    }),
};

/**
 * Vergleicht zwei Versionsnummern im Format "x.y.z"
 * @param version1 Erste Version
 * @param version2 Zweite Version
 * @returns -1 wenn version1 < version2, 0 wenn gleich, 1 wenn version1 > version2
 */
function compareVersions(version1: string, version2: string): number {
  const v1Parts = version1.split(".").map(Number);
  const v2Parts = version2.split(".").map(Number);

  const maxLength = Math.max(v1Parts.length, v2Parts.length);

  for (let i = 0; i < maxLength; i++) {
    const v1Part = v1Parts[i] ?? 0;
    const v2Part = v2Parts[i] ?? 0;

    if (v1Part < v2Part) return -1;
    if (v1Part > v2Part) return 1;
  }

  return 0;
}
