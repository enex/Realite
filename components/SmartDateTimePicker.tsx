import { getAvailableTimeSlots } from "@/client/calendar";
import { MaterialIcons } from "@expo/vector-icons";
import Color from "color";
import * as Calendar from "expo-calendar";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Dimensions, Pressable, ScrollView, Text, View } from "react-native";

interface TimeSlot {
  start: Date;
  end: Date;
}

interface CalendarEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
}

interface SmartDateTimePickerProps {
  selectedDates: Date[];
  onDateSelect: (date: Date) => void;
  onDateRemove: (index: number) => void;
  onTimeRangesChange?: (
    ranges: { start: Date; end: Date; day: string }[]
  ) => void;
  accentColor: string;
}

interface CalendarDay {
  date: Date;
  isToday: boolean;
  isWeekend: boolean;
  availableSlots: TimeSlot[];
}

interface DayTimeSlot {
  timeSlot: Date;
  timeString: string;
  timeIndex: number;
  isPast: boolean;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Memoized time slot cell component
const TimeSlotCell = React.memo(function TimeSlotCell({
  isSelected,
  event,
  isPast,
  eventPosition,
  accentColor,
  onPress,
}: {
  isSelected: boolean;
  event: CalendarEvent | null;
  isPast: boolean;
  eventPosition: "start" | "middle" | "end" | null;
  accentColor: string;
  onPress: () => void;
}) {
  const backgroundColor = useMemo(() => {
    if (isPast) return "rgba(0, 0, 0, 0.05)";
    if (isSelected) return accentColor;
    if (event) return "rgba(255, 193, 7, 0.2)";
    return Color(accentColor).mix(Color("white"), 0.95).hex();
  }, [isPast, isSelected, event, accentColor]);

  const borderStyles = useMemo(
    () => ({
      borderTopWidth: eventPosition === "start" ? 2 : 0,
      borderBottomWidth: eventPosition === "end" ? 2 : 0,
      borderTopColor: eventPosition === "start" ? "#ff6b35" : "transparent",
      borderBottomColor: eventPosition === "end" ? "#ff6b35" : "transparent",
    }),
    [eventPosition]
  );

  return (
    <Pressable
      onPress={onPress}
      className="items-center justify-center"
      style={{
        height: 40,
        backgroundColor,
        opacity: isPast ? 0.3 : 1,
        ...borderStyles,
      }}
      disabled={isPast}
    >
      {event && eventPosition === "start" && (
        <View className="items-center justify-center px-1">
          <Text
            className="text-xs font-medium"
            style={{
              color: isSelected ? "white" : "#ff6b35",
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {event.title}
          </Text>
          <Text
            className="text-xs"
            style={{
              color: isSelected ? "white" : "#ff6b35",
              opacity: 0.8,
            }}
            numberOfLines={1}
          >
            {new Date(event.startDate).toLocaleTimeString("de-DE", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      )}
      {event && eventPosition === "end" && (
        <Text
          className="text-xs font-medium"
          style={{
            color: isSelected ? "white" : "#ff6b35",
          }}
          numberOfLines={1}
        >
          {new Date(event.endDate).toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      )}
      {event && eventPosition === "middle" && (
        <Text
          className="text-xs font-medium"
          style={{
            color: isSelected ? "white" : "#ff6b35",
          }}
          numberOfLines={1}
        >
          •
        </Text>
      )}
      {isSelected && !event && (
        <MaterialIcons name="check" size={14} color="white" />
      )}
    </Pressable>
  );
});

// Memoized day column component with manual shouldComponentUpdate logic
const DayColumn = React.memo(
  function DayColumn({
    dayTimeSlots,
    selectedTimesForDay,
    accentColor,
    dayColumnWidth,
    onTimeSlotPress,
    getEventAtTime,
    getEventPosition,
  }: {
    dayTimeSlots: DayTimeSlot[];
    selectedTimesForDay: Set<number>;
    accentColor: string;
    dayColumnWidth: number;
    onTimeSlotPress: (timeSlot: Date) => void;
    getEventAtTime: (date: Date) => CalendarEvent | null;
    getEventPosition: (
      event: CalendarEvent,
      timeSlot: Date
    ) => "start" | "middle" | "end" | null;
  }) {
    return (
      <View
        className="border-r border-border"
        style={{ width: dayColumnWidth }}
      >
        {dayTimeSlots.map((slot) => {
          const isSelected = selectedTimesForDay.has(slot.timeSlot.getTime());
          const event = getEventAtTime(slot.timeSlot);
          const eventPosition = event
            ? getEventPosition(event, slot.timeSlot)
            : null;

          return (
            <TimeSlotCell
              key={slot.timeIndex}
              isSelected={isSelected}
              event={event}
              isPast={slot.isPast}
              eventPosition={eventPosition}
              accentColor={accentColor}
              onPress={() => {
                if (!slot.isPast) {
                  onTimeSlotPress(slot.timeSlot);
                }
              }}
            />
          );
        })}
      </View>
    );
  },
  // Custom comparison function for manual shouldComponentUpdate
  (prevProps, nextProps) => {
    // Only re-render if selections for this specific day have changed
    const prevSelections = Array.from(prevProps.selectedTimesForDay).sort();
    const nextSelections = Array.from(nextProps.selectedTimesForDay).sort();

    // Check if selections are the same
    if (prevSelections.length !== nextSelections.length) {
      return false; // Re-render
    }

    for (let i = 0; i < prevSelections.length; i++) {
      if (prevSelections[i] !== nextSelections[i]) {
        return false; // Re-render
      }
    }

    // Also check if accent color changed (affects all days)
    if (prevProps.accentColor !== nextProps.accentColor) {
      return false; // Re-render
    }

    return true; // Skip re-render
  }
);

export default function SmartDateTimePicker({
  selectedDates,
  onDateSelect,
  onDateRemove,
  onTimeRangesChange,
  accentColor,
}: SmartDateTimePickerProps) {
  const [_availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);

  // Refs for synchronized scrolling
  const timeScrollRef = useRef<ScrollView>(null);
  const gridScrollRef = useRef<ScrollView>(null);
  const headerScrollRef = useRef<ScrollView>(null);

  // Memoize selected dates set for faster lookups
  const selectedDatesSet = useMemo(() => {
    return new Set(selectedDates.map((date) => date.getTime()));
  }, [selectedDates]);

  // Memoize time slots generation - extend to include 23:30
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = 6; hour <= 23; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      if (hour < 23) {
        slots.push(`${hour.toString().padStart(2, "0")}:30`);
      } else {
        slots.push("23:30");
      }
    }
    return slots;
  }, []);

  // Memoize calendar dimensions
  const dimensions = useMemo(() => {
    const timeColumnWidth = 60;
    const dayColumnWidth = Math.floor((screenWidth - timeColumnWidth - 16) / 7);
    const headerHeight = 120;
    const availableHeight = screenHeight - headerHeight;

    return {
      timeColumnWidth,
      dayColumnWidth,
      headerHeight,
      availableHeight,
    };
  }, []);

  // Pre-compute time slots for each day
  const dayTimeSlotsByDay = useMemo(() => {
    const slotsByDay = new Map<number, DayTimeSlot[]>();
    const now = new Date();

    calendarDays.slice(0, 42).forEach((day, dayIndex) => {
      const daySlots: DayTimeSlot[] = [];

      timeSlots.forEach((timeString, timeIndex) => {
        const [hours, minutes] = timeString.split(":").map(Number);
        const timeSlot = new Date(day.date);
        timeSlot.setHours(hours ?? 0, minutes ?? 0, 0, 0);

        daySlots.push({
          timeSlot,
          timeString,
          timeIndex,
          isPast: timeSlot < now,
        });
      });

      slotsByDay.set(dayIndex, daySlots);
    });

    return slotsByDay;
  }, [calendarDays, timeSlots]);

  // Group selected times by day for efficient lookups
  const selectedTimesByDay = useMemo(() => {
    const timesByDay = new Map<number, Set<number>>();

    // Initialize empty sets for all days
    for (let i = 0; i < 42; i++) {
      timesByDay.set(i, new Set());
    }

    // Group selected times by day
    selectedDates.forEach((selectedDate) => {
      const selectedTime = selectedDate.getTime();
      const selectedDateString = selectedDate.toDateString();

      calendarDays.slice(0, 42).forEach((day, dayIndex) => {
        if (day.date.toDateString() === selectedDateString) {
          timesByDay.get(dayIndex)?.add(selectedTime);
        }
      });
    });

    return timesByDay;
  }, [selectedDates, calendarDays]);

  useEffect(() => {
    // Initialize calendar immediately without waiting for events
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 42); // Next 6 weeks

    // Initialize calendar days immediately - don't wait for slots
    generateCalendarDays(startDate, endDate, []);

    // Load calendar events in background
    void loadCalendarData();
  }, []);

  const loadCalendarData = async () => {
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 42); // Next 6 weeks

      // Load available slots with extended hours (6:00 - 23:30)
      const slots = await getAvailableTimeSlots({
        startDate,
        endDate,
        duration: 30, // 30 minute meetings
        dayStartHour: 6,
        dayEndHour: 24, // Keep 24 for the utility but we show until 23:30
        excludeWeekends: false,
      });

      // Load existing calendar events for information only - don't block on this
      const events = await loadCalendarEvents(startDate, endDate);

      setAvailableSlots(slots);
      setCalendarEvents(events);
      // Don't regenerate calendar days - they're already initialized
    } catch (error) {
      console.error("Error loading calendar data:", error);
    }
  };

  const loadCalendarEvents = async (
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> => {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== Calendar.PermissionStatus.GRANTED) {
        console.log("Calendar permission not granted");
        return [];
      }

      const calendars = await Calendar.getCalendarsAsync(
        Calendar.EntityTypes.EVENT
      );

      console.log(`Found ${calendars.length} calendars`);

      const events = await Promise.all(
        calendars.map(async (calendar) => {
          try {
            const calendarEvents = await Calendar.getEventsAsync(
              [calendar.id],
              startDate,
              endDate
            );
            console.log(
              `Calendar "${calendar.title}": ${calendarEvents.length} events`
            );
            return calendarEvents;
          } catch (error) {
            console.error(
              `Error loading events from calendar "${calendar.title}":`,
              error
            );
            return [];
          }
        })
      );

      const flatEvents = events.flat();
      console.log(`Total events loaded: ${flatEvents.length}`);

      const mappedEvents = flatEvents
        .filter((event) => {
          // Filter out all-day events - they shouldn't block time slots
          const eventStart = new Date(event.startDate);
          const eventEnd = new Date(event.endDate);

          // Check if it's an all-day event (typically starts at midnight and is 24+ hours long)
          const isAllDay =
            event.allDay ||
            (eventStart.getHours() === 0 &&
              eventStart.getMinutes() === 0 &&
              eventEnd.getTime() - eventStart.getTime() >= 24 * 60 * 60 * 1000);

          // Only include non-all-day events for display purposes
          return !isAllDay;
        })
        .map((event) => {
          const mappedEvent = {
            id: event.id,
            title: event.title || "Unbenannter Termin",
            startDate:
              typeof event.startDate === "string"
                ? event.startDate
                : event.startDate.toISOString(),
            endDate:
              typeof event.endDate === "string"
                ? event.endDate
                : event.endDate.toISOString(),
          };

          console.log(
            `Event: ${mappedEvent.title} from ${mappedEvent.startDate} to ${mappedEvent.endDate}`
          );
          return mappedEvent;
        });

      return mappedEvents;
    } catch (error) {
      console.error("Error loading calendar events:", error);
      return [];
    }
  };

  const generateCalendarDays = (
    startDate: Date,
    endDate: Date,
    _slots: TimeSlot[] // Not used anymore - all slots are selectable
  ) => {
    const days: CalendarDay[] = [];
    const today = new Date();
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      // All time slots are now available for selection
      // We only use calendar events for display purposes
      days.push({
        date: new Date(currentDate),
        isToday: currentDate.toDateString() === today.toDateString(),
        isWeekend: currentDate.getDay() === 0 || currentDate.getDay() === 6,
        availableSlots: [], // Not used anymore
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    setCalendarDays(days);
  };

  // Memoize event lookup functions
  const getEventAtTime = useCallback(
    (date: Date): CalendarEvent | null => {
      return (
        calendarEvents.find((event) => {
          const eventStart = new Date(event.startDate);
          const eventEnd = new Date(event.endDate);
          const slotEnd = new Date(date.getTime() + 30 * 60 * 1000); // 30 minutes later

          // Check if this time slot overlaps with the event
          // A slot overlaps if it starts before the event ends AND ends after the event starts
          return date < eventEnd && slotEnd > eventStart;
        }) || null
      );
    },
    [calendarEvents]
  );

  const getEventPosition = useCallback(
    (
      event: CalendarEvent,
      timeSlot: Date
    ): "start" | "middle" | "end" | null => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      const slotEnd = new Date(timeSlot.getTime() + 30 * 60 * 1000); // 30 minutes later

      // Check if this slot overlaps with the event
      const overlaps = timeSlot < eventEnd && slotEnd > eventStart;

      if (!overlaps) {
        return null;
      }

      // Determine position within the event
      // First slot: event starts during this slot or this is the first overlapping slot
      const isFirstSlot = eventStart >= timeSlot && eventStart < slotEnd;
      // Last slot: event ends during this slot or this is the last overlapping slot
      const isLastSlot = eventEnd > timeSlot && eventEnd <= slotEnd;

      // Check if this is the only slot for this event
      const eventDurationMinutes =
        (eventEnd.getTime() - eventStart.getTime()) / (60 * 1000);
      const isSingleSlot = eventDurationMinutes <= 30;

      if (isSingleSlot || (isFirstSlot && isLastSlot)) {
        return "start"; // Single slot event or very short event
      } else if (isFirstSlot) {
        return "start";
      } else if (isLastSlot) {
        return "end";
      } else {
        return "middle";
      }
    },
    []
  );

  // Optimized time slot press handler
  const handleTimeSlotPress = useCallback(
    (timeSlot: Date) => {
      const isSelected = selectedDatesSet.has(timeSlot.getTime());

      if (isSelected) {
        const selectedIndex = selectedDates.findIndex(
          (d) => d.getTime() === timeSlot.getTime()
        );
        if (selectedIndex !== -1) {
          onDateRemove(selectedIndex);
        }
      } else {
        onDateSelect(timeSlot);
      }
      if (onTimeRangesChange) {
        const newSelectedDates = isSelected
          ? selectedDates.filter((d) => d.getTime() !== timeSlot.getTime())
          : [...selectedDates, timeSlot];

        const ranges = combineSelectedTimesToRanges(newSelectedDates);
        onTimeRangesChange(ranges);
      }
    },
    [
      selectedDates,
      selectedDatesSet,
      onDateSelect,
      onDateRemove,
      onTimeRangesChange,
    ]
  );

  // Memoize legend colors
  const legendColors = useMemo(
    () => ({
      selectable: Color(accentColor).mix(Color("white"), 0.95).hex(),
      occupied: "rgba(255, 193, 7, 0.2)",
      selected: accentColor,
    }),
    [accentColor]
  );

  return (
    <View className="flex flex-1 flex-col" style={{ height: screenHeight }}>
      {/* Calendar Grid */}
      <View className="flex-1">
        {/* Combined Header and Grid with sticky time column */}
        <View className="flex-1 flex-row">
          {/* Sticky Time Column */}
          <View
            className="border-r border-border bg-muted/50"
            style={{ width: dimensions.timeColumnWidth }}
          >
            {/* Time column header spacer */}
            <View
              className="items-center justify-center border-b border-border bg-background"
              style={{ height: 60 }}
            >
              <Text className="text-xs font-medium text-muted-foreground">
                Zeit
              </Text>
            </View>

            {/* Time labels - scrollable */}
            <ScrollView
              ref={timeScrollRef}
              className="flex-1"
              showsVerticalScrollIndicator={false}
              style={{ height: dimensions.availableHeight - 60 }}
              scrollEnabled={false}
            >
              {timeSlots.map((timeString, timeIndex) => (
                <View
                  key={timeIndex}
                  className="items-center justify-center bg-muted/50"
                  style={{
                    height: 40,
                    borderBottomWidth: 1,
                    borderBottomColor: "rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <Text className="text-xs font-medium text-muted-foreground">
                    {timeString}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Scrollable Calendar Content */}
          <View className="flex-1">
            {/* Day Headers - Scrollable horizontally */}
            <View
              className="border-b border-border bg-background"
              style={{ height: 60 }}
            >
              <ScrollView
                ref={headerScrollRef}
                horizontal
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={{ paddingRight: 16 }}
                scrollEnabled={false}
              >
                <View className="flex-row">
                  {/* Day headers */}
                  {calendarDays.slice(0, 42).map((day, index) => (
                    <View
                      key={index}
                      className="items-center justify-center border-r border-border py-2"
                      style={{ width: dimensions.dayColumnWidth }}
                    >
                      <Text className="text-xs font-medium text-muted-foreground">
                        {day.date.toLocaleDateString("de-DE", {
                          weekday: "short",
                        })}
                      </Text>
                      <Text
                        className="text-sm font-semibold"
                        style={{
                          color: day.isToday
                            ? accentColor
                            : day.isWeekend
                              ? "#999"
                              : "#333",
                        }}
                      >
                        {day.date.getDate()}
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        {day.date.toLocaleDateString("de-DE", {
                          month: "short",
                        })}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Time Grid - Scrollable both directions */}
            <ScrollView
              ref={gridScrollRef}
              className="flex-1"
              showsVerticalScrollIndicator={true}
              style={{ height: dimensions.availableHeight - 60 }}
              onScroll={(event) => {
                const offsetY = event.nativeEvent.contentOffset.y;
                timeScrollRef.current?.scrollTo({
                  y: offsetY,
                  animated: false,
                });
              }}
              scrollEventThrottle={16}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={{ paddingRight: 16 }}
                onScroll={(event) => {
                  const offsetX = event.nativeEvent.contentOffset.x;
                  headerScrollRef.current?.scrollTo({
                    x: offsetX,
                    animated: false,
                  });
                }}
                scrollEventThrottle={16}
                overScrollMode="never"
              >
                <View className="flex-row">
                  {/* Day Columns */}
                  {calendarDays.slice(0, 42).map((day, dayIndex) => {
                    const dayTimeSlots = dayTimeSlotsByDay.get(dayIndex) || [];
                    const selectedTimesForDay =
                      selectedTimesByDay.get(dayIndex) || new Set();

                    return (
                      <DayColumn
                        key={dayIndex}
                        dayTimeSlots={dayTimeSlots}
                        selectedTimesForDay={selectedTimesForDay}
                        accentColor={accentColor}
                        dayColumnWidth={dimensions.dayColumnWidth}
                        onTimeSlotPress={handleTimeSlotPress}
                        getEventAtTime={getEventAtTime}
                        getEventPosition={getEventPosition}
                      />
                    );
                  })}
                </View>
              </ScrollView>
            </ScrollView>
          </View>
        </View>
      </View>

      {/* Legend - Fixed at bottom */}
      <View className="border-t border-border bg-background p-4">
        <View className="flex-row flex-wrap gap-4">
          <View className="flex-row items-center gap-2">
            <View
              className="h-3 w-3 rounded-sm"
              style={{
                backgroundColor: legendColors.selectable,
              }}
            />
            <Text className="text-xs text-muted-foreground">Auswählbar</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View
              className="h-3 w-3 rounded-sm border-b-2 border-t-2"
              style={{
                backgroundColor: legendColors.occupied,
                borderTopColor: "#ff6b35",
                borderBottomColor: "#ff6b35",
              }}
            />
            <Text className="text-xs text-muted-foreground">
              Termin-Zeitraum
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: legendColors.selected }}
            />
            <Text className="text-xs text-muted-foreground">Ausgewählt</Text>
          </View>
        </View>
        <Text className="mt-2 text-xs text-muted-foreground">
          Termine werden zur Information angezeigt. Alle Zeiten sind auswählbar.
        </Text>
      </View>

      {calendarDays.length === 0 && (
        <View className="flex-1 items-center justify-center">
          <MaterialIcons name="event-busy" size={48} color="#666" />
          <Text className="mt-2 text-center text-muted-foreground">
            Keine verfügbaren Zeiten gefunden
          </Text>
          <Text className="mt-1 text-center text-xs text-muted-foreground">
            Überprüfe deine Kalender-Berechtigungen
          </Text>
        </View>
      )}
    </View>
  );
}

function combineSelectedTimesToRanges(
  dates: Date[]
): { start: Date; end: Date; day: string }[] {
  if (dates.length === 0) return [];

  // Group dates by day
  const datesByDay = new Map<string, Date[]>();

  dates.forEach((date) => {
    const dayKey = date.toDateString();
    if (!datesByDay.has(dayKey)) {
      datesByDay.set(dayKey, []);
    }
    datesByDay.get(dayKey)!.push(date);
  });

  const ranges: { start: Date; end: Date; day: string }[] = [];

  // For each day, combine consecutive time slots into ranges
  datesByDay.forEach((dayDates) => {
    // Sort dates by time
    const sortedDates = dayDates.sort((a, b) => a.getTime() - b.getTime());

    if (sortedDates.length === 0) return;

    let rangeStart = sortedDates[0]!;
    let rangeEnd = sortedDates[0]!;

    for (let i = 1; i < sortedDates.length; i++) {
      const currentDate = sortedDates[i]!;
      const previousDate = sortedDates[i - 1]!;

      // Check if current date is consecutive (30 minutes after previous)
      const timeDiff = currentDate.getTime() - previousDate.getTime();
      const isConsecutive = timeDiff === 30 * 60 * 1000; // 30 minutes in milliseconds

      if (isConsecutive) {
        // Extend the current range
        rangeEnd = currentDate;
      } else {
        // End current range and start a new one
        const endTime = new Date(rangeEnd.getTime() + 30 * 60 * 1000); // Add 30 minutes to end time
        ranges.push({
          start: rangeStart,
          end: endTime,
          day: rangeStart.toLocaleDateString("de-DE", {
            weekday: "long",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }),
        });

        rangeStart = currentDate;
        rangeEnd = currentDate;
      }
    }

    // Add the final range
    const endTime = new Date(rangeEnd.getTime() + 30 * 60 * 1000); // Add 30 minutes to end time
    ranges.push({
      start: rangeStart,
      end: endTime,
      day: rangeStart.toLocaleDateString("de-DE", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    });
  });

  return ranges.sort((a, b) => a.start.getTime() - b.start.getTime());
}
