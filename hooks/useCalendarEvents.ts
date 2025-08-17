import { useEffect, useState } from "react";
import * as Calendar from "expo-calendar";

export interface CalendarEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  calendarTitle?: string;
}

export function useCalendarEvents(startDate?: Date, endDate?: Date) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!startDate || !endDate) {
      setEvents([]);
      return;
    }

    const loadEvents = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { status } = await Calendar.requestCalendarPermissionsAsync();
        if (status !== Calendar.PermissionStatus.GRANTED) {
          setError("Calendar permissions not granted");
          return;
        }

        const calendars = await Calendar.getCalendarsAsync(
          Calendar.EntityTypes.EVENT,
        );

        const allEvents = await Promise.all(
          calendars.map(async (calendar) => {
            try {
              const calendarEvents = await Calendar.getEventsAsync(
                [calendar.id],
                startDate,
                endDate,
              );
              return calendarEvents.map((event) => ({
                id: event.id,
                title: event.title || "Unbenannter Termin",
                startDate: new Date(event.startDate),
                endDate: new Date(event.endDate),
                calendarTitle: calendar.title,
              }));
            } catch (error) {
              console.error(
                `Error loading events from calendar "${calendar.title}":`,
                error,
              );
              return [];
            }
          }),
        );

        const flatEvents = allEvents.flat();
        // Sort events by start date
        flatEvents.sort(
          (a, b) => a.startDate.getTime() - b.startDate.getTime(),
        );

        setEvents(flatEvents);
      } catch (error) {
        console.error("Error loading calendar events:", error);
        setError("Fehler beim Laden der Kalender-Termine");
      } finally {
        setIsLoading(false);
      }
    };

    void loadEvents();
  }, [startDate, endDate]);

  return { events, isLoading, error };
}

// Helper function to get overlapping events for a specific time slot
export function getOverlappingEvents(
  events: CalendarEvent[],
  slotStart: Date,
  slotEnd: Date,
): CalendarEvent[] {
  return events.filter((event) => {
    // Check if the event overlaps with the time slot
    // Events overlap if: event starts before slot ends AND event ends after slot starts
    return event.startDate < slotEnd && event.endDate > slotStart;
  });
}
