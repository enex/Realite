import {
  googleCalendarProvider,
  type CalendarProvider,
} from "@/src/lib/google-calendar";
import {
  syncGoogleContactsToGroups,
  type ContactsSyncStats,
} from "@/src/lib/google-contacts";
import {
  syncSmartMeetingsForUser,
  type SmartMeetingSyncStats,
} from "@/src/lib/smart-meetings";
import { systemNow, type NowFn } from "@/src/lib/time";

type SyncState = {
  running: boolean;
  lastTriggeredAt: number | null;
  lastCompletedAt: number | null;
  warning: string | null;
  stats: { synced: number; scanned: number } | null;
  contactsWarning: string | null;
  contactsStats: ContactsSyncStats | null;
  smartWarning: string | null;
  smartStats: SmartMeetingSyncStats | null;
  inFlight: Promise<void> | null;
};

type SyncSnapshot = {
  revalidating: boolean;
  lastTriggeredAt: string | null;
  lastCompletedAt: string | null;
  warning: string | null;
  stats: { synced: number; scanned: number } | null;
  contactsWarning: string | null;
  contactsStats: ContactsSyncStats | null;
  smartWarning: string | null;
  smartStats: SmartMeetingSyncStats | null;
};

type DashboardBackgroundSyncDependencies = {
  calendar: Pick<CalendarProvider, "syncPublicEvents">;
  syncContacts(userId: string): Promise<ContactsSyncStats>;
  syncSmartMeetings(userId: string): Promise<SmartMeetingSyncStats>;
  now: NowFn;
};

const DASHBOARD_SYNC_INTERVAL_MS = 90_000;

function shouldStartSync(
  state: SyncState,
  force: boolean,
  nowTimestamp: number,
) {
  if (force) {
    return !state.running;
  }

  if (state.running) {
    return false;
  }

  if (!state.lastTriggeredAt) {
    return true;
  }

  return nowTimestamp - state.lastTriggeredAt >= DASHBOARD_SYNC_INTERVAL_MS;
}

export function createDashboardBackgroundSyncService(
  dependencies: DashboardBackgroundSyncDependencies,
) {
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
      smartWarning: null,
      smartStats: null,
      inFlight: null,
    };

    syncByUserId.set(userId, created);
    return created;
  }

  function triggerDashboardBackgroundSync(
    userId: string,
    options?: { force?: boolean },
  ) {
    const state = getOrCreateSyncState(userId);
    const nowTimestamp = dependencies.now().getTime();
    if (!shouldStartSync(state, options?.force ?? false, nowTimestamp)) {
      return;
    }

    state.running = true;
    state.lastTriggeredAt = nowTimestamp;

    state.inFlight = (async () => {
      let warning: string | null = null;
      let stats: { synced: number; scanned: number } | null = null;
      let contactsWarning: string | null = null;
      let contactsStats: ContactsSyncStats | null = null;
      let smartWarning: string | null = null;
      let smartStats: SmartMeetingSyncStats | null = null;

      try {
        stats = await dependencies.calendar.syncPublicEvents(userId);
      } catch (error) {
        warning =
          error instanceof Error
            ? error.message
            : "Kalender-Sync fehlgeschlagen";
      }

      try {
        contactsStats = await dependencies.syncContacts(userId);
      } catch (error) {
        contactsWarning =
          error instanceof Error
            ? error.message
            : "Kontakte-Sync fehlgeschlagen";
      }

      try {
        smartStats = await dependencies.syncSmartMeetings(userId);
      } catch (error) {
        smartWarning =
          error instanceof Error
            ? error.message
            : "Smart-Treffen-Sync fehlgeschlagen";
      }

      state.warning = warning;
      state.stats = stats;
      state.contactsWarning = contactsWarning;
      state.contactsStats = contactsStats;
      state.smartWarning = smartWarning;
      state.smartStats = smartStats;
      state.lastCompletedAt = dependencies.now().getTime();
    })().finally(() => {
      state.running = false;
      state.inFlight = null;
    });
  }

  function getDashboardSyncSnapshot(userId: string): SyncSnapshot {
    const state = getOrCreateSyncState(userId);

    return {
      revalidating: state.running,
      lastTriggeredAt: state.lastTriggeredAt
        ? new Date(state.lastTriggeredAt).toISOString()
        : null,
      lastCompletedAt: state.lastCompletedAt
        ? new Date(state.lastCompletedAt).toISOString()
        : null,
      warning: state.warning,
      stats: state.stats,
      contactsWarning: state.contactsWarning,
      contactsStats: state.contactsStats,
      smartWarning: state.smartWarning,
      smartStats: state.smartStats,
    };
  }

  async function waitForIdle(userId: string) {
    const state = getOrCreateSyncState(userId);
    await state.inFlight;
  }

  return {
    triggerDashboardBackgroundSync,
    getDashboardSyncSnapshot,
    waitForIdle,
  };
}

const defaultBackgroundSyncService = createDashboardBackgroundSyncService({
  calendar: googleCalendarProvider,
  syncContacts: syncGoogleContactsToGroups,
  syncSmartMeetings: syncSmartMeetingsForUser,
  now: systemNow,
});

export function triggerDashboardBackgroundSync(
  userId: string,
  options?: { force?: boolean },
) {
  return defaultBackgroundSyncService.triggerDashboardBackgroundSync(
    userId,
    options,
  );
}

export function getDashboardSyncSnapshot(userId: string) {
  return defaultBackgroundSyncService.getDashboardSyncSnapshot(userId);
}
