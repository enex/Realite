/**
 * Shared query key and fetcher for /api/dashboard.
 * Used by dashboard, group-detail, groups-page, suggestions-page so they share cache.
 */
export const DASHBOARD_QUERY_KEY = ["dashboard"] as const;

export async function fetchDashboard(): Promise<unknown> {
  const res = await fetch("/api/dashboard", { cache: "no-store" });
  const payload = await res.json();
  if (!res.ok) {
    throw new Error((payload as { error?: string }).error ?? "Daten konnten nicht geladen werden");
  }
  return payload;
}
