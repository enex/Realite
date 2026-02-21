import { syncPublicEventsFromGoogleCalendar } from "@/src/lib/google-calendar";
import { syncGoogleContactsToGroups } from "@/src/lib/google-contacts";

type SyncState = {
  running: boolean;
  lastTriggeredAt: number | null;
  lastCompletedAt: number | null;
  warning: string | null;
  stats: { synced: number; scanned: number } | null;
  contactsWarning: string | null;
  contactsStats: { syncedGroups: number; syncedMembers: number; scannedContacts: number } | null;
  inFlight: Promise<void> | null;
};

type SyncSnapshot = {
  revalidating: boolean;
  lastTriggeredAt: string | null;
  lastCompletedAt: string | null;
  warning: string | null;
  stats: { synced: number; scanned: number } | null;
  contactsWarning: string | null;
  contactsStats: { syncedGroups: number; syncedMembers: number; scannedContacts: number } | null;
};

const DASHBOARD_SYNC_INTERVAL_MS = 90_000;
const syncByUserId = new Map<string, SyncState>();

function getOrCreateSyncState(userId: string): SyncState {
  const existing = syncByUserId.get(userId);
  if (existing) {
    return existing;
  }

  const created: SyncState = {
    running: false,
    lastTriggeredAt: null,
    lastCompletedAt: null,
    warning: null,
    stats: null,
    contactsWarning: null,
    contactsStats: null,
    inFlight: null
  };

  syncByUserId.set(userId, created);
  return created;
}

function shouldStartSync(state: SyncState, force: boolean) {
  if (force) {
    return !state.running;
  }

  if (state.running) {
    return false;
  }

  if (!state.lastTriggeredAt) {
    return true;
  }

  return Date.now() - state.lastTriggeredAt >= DASHBOARD_SYNC_INTERVAL_MS;
}

export function triggerDashboardBackgroundSync(userId: string, options?: { force?: boolean }) {
  const state = getOrCreateSyncState(userId);
  if (!shouldStartSync(state, options?.force ?? false)) {
    return;
  }

  state.running = true;
  state.lastTriggeredAt = Date.now();

  state.inFlight = (async () => {
    let warning: string | null = null;
    let stats: { synced: number; scanned: number } | null = null;
    let contactsWarning: string | null = null;
    let contactsStats: { syncedGroups: number; syncedMembers: number; scannedContacts: number } | null = null;

    try {
      stats = await syncPublicEventsFromGoogleCalendar(userId);
    } catch (error) {
      warning = error instanceof Error ? error.message : "Kalender-Sync fehlgeschlagen";
    }

    try {
      contactsStats = await syncGoogleContactsToGroups(userId);
    } catch (error) {
      contactsWarning = error instanceof Error ? error.message : "Kontakte-Sync fehlgeschlagen";
    }

    state.warning = warning;
    state.stats = stats;
    state.contactsWarning = contactsWarning;
    state.contactsStats = contactsStats;
    state.lastCompletedAt = Date.now();
  })()
    .finally(() => {
      state.running = false;
      state.inFlight = null;
    });
}

export function getDashboardSyncSnapshot(userId: string): SyncSnapshot {
  const state = getOrCreateSyncState(userId);

  return {
    revalidating: state.running,
    lastTriggeredAt: state.lastTriggeredAt ? new Date(state.lastTriggeredAt).toISOString() : null,
    lastCompletedAt: state.lastCompletedAt ? new Date(state.lastCompletedAt).toISOString() : null,
    warning: state.warning,
    stats: state.stats,
    contactsWarning: state.contactsWarning,
    contactsStats: state.contactsStats
  };
}
