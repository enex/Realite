export type DashboardFeedFocus = "prioritized" | "momentum" | "involved";

export type DashboardFeedEvent = {
  id: string;
  startsAt: string;
  createdBy: string;
  acceptedCount: number;
  isAccepted: boolean;
  isOwnEvent: boolean;
};

export function rankDashboardFeedEvents(events: DashboardFeedEvent[]) {
  return [...events].sort((left, right) => {
    const priorityDiff = getDashboardFeedPriority(left) - getDashboardFeedPriority(right);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime();
  });
}

export function filterDashboardFeedEvents(events: DashboardFeedEvent[], focus: DashboardFeedFocus) {
  if (focus === "momentum") {
    return events.filter((event) => event.acceptedCount > 0);
  }

  if (focus === "involved") {
    return events.filter((event) => event.isAccepted || event.isOwnEvent);
  }

  return events;
}

function getDashboardFeedPriority(event: DashboardFeedEvent) {
  if (!event.isOwnEvent && !event.isAccepted && event.acceptedCount > 0) {
    return 0;
  }

  if (!event.isOwnEvent && !event.isAccepted) {
    return 1;
  }

  if (event.isAccepted) {
    return 2;
  }

  return 3;
}
