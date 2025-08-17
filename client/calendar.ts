import * as Calendar from "expo-calendar";

interface TimeSlot {
  start: Date;
  end: Date;
}

interface GetAvailableTimeSlotsOptions {
  startDate: Date;
  endDate: Date;
  duration: number; // duration in minutes
  dayStartHour?: number; // e.g., 9 for 9 AM
  dayEndHour?: number; // e.g., 17 for 5 PM
  excludeWeekends?: boolean;
}

export async function getAvailableTimeSlots({
  startDate,
  endDate,
  duration,
  dayStartHour = 6,
  dayEndHour = 24,
  excludeWeekends = true,
}: GetAvailableTimeSlotsOptions): Promise<TimeSlot[]> {
  try {
    // Request calendar permissions
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== Calendar.PermissionStatus.GRANTED) {
      throw new Error("Calendar permissions not granted");
    }

    // Get all calendars
    const calendars = await Calendar.getCalendarsAsync(
      Calendar.EntityTypes.EVENT,
    );

    // Get all events from all calendars within the date range
    const events = await Promise.all(
      calendars.map((calendar) =>
        Calendar.getEventsAsync([calendar.id], startDate, endDate),
      ),
    );

    // Flatten events array and sort by start time
    const allEvents = events
      .flat()
      .sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      );

    // Initialize available slots array
    const availableSlots: TimeSlot[] = [];
    let currentDate = new Date(startDate);

    // Iterate through each day in the range
    while (currentDate <= endDate) {
      if (
        excludeWeekends &&
        (currentDate.getDay() === 0 || currentDate.getDay() === 6)
      ) {
        currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
        continue;
      }

      // Set day start and end times
      const dayStart = new Date(currentDate);
      dayStart.setHours(dayStartHour, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(dayEndHour, 0, 0, 0);

      // Get events for current day
      const dayEvents = allEvents.filter(
        (event) =>
          new Date(event.startDate) <= dayEnd &&
          new Date(event.endDate) >= dayStart,
      );

      // Find free slots between events
      let slotStart = dayStart;

      for (const event of dayEvents) {
        const eventStart = new Date(event.startDate);
        const eventEnd = new Date(event.endDate);

        // Check if there's enough time before the event
        if (eventStart.getTime() - slotStart.getTime() >= duration * 60000) {
          availableSlots.push({
            start: new Date(slotStart),
            end: new Date(eventStart),
          });
        }

        slotStart = eventEnd;
      }

      // Check for available slot after last event until day end
      if (dayEnd.getTime() - slotStart.getTime() >= duration * 60000) {
        availableSlots.push({
          start: new Date(slotStart),
          end: new Date(dayEnd),
        });
      }

      // Move to next day
      currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
    }

    return availableSlots;
  } catch (error) {
    console.error("Error getting available time slots:", error);
    throw error;
  }
}

// Helper function to check if a specific time slot is available
export async function isTimeSlotAvailable(
  startTime: Date,
  endTime: Date,
): Promise<boolean> {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== Calendar.PermissionStatus.GRANTED) {
      throw new Error("Calendar permissions not granted");
    }

    const calendars = await Calendar.getCalendarsAsync(
      Calendar.EntityTypes.EVENT,
    );
    const events = await Promise.all(
      calendars.map((calendar) =>
        Calendar.getEventsAsync([calendar.id], startTime, endTime),
      ),
    );

    // If there are any events during this time slot, it's not available
    return events.flat().length === 0;
  } catch (error) {
    console.error("Error checking time slot availability:", error);
    throw error;
  }
}
