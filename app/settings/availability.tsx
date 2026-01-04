import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Icon } from "@/components/ui/icon";
import Page from "@/components/ui/page";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Stack, useRouter } from "expo-router";
import { ClockIcon, PlusIcon, TrashIcon } from "lucide-react-native";
import { useState } from "react";
import { Platform, Pressable, Switch, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Day labels (Monday first, German week)
const DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const DAY_FULL = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag",
];

// Helper to convert minutes since midnight to Date
const minutesToDate = (minutes: number): Date => {
  const date = new Date();
  date.setHours(Math.floor(minutes / 60));
  date.setMinutes(minutes % 60);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date;
};

// Helper to convert Date to minutes since midnight
const dateToMinutes = (date: Date): number => {
  return date.getHours() * 60 + date.getMinutes();
};

// Default availability: Mon-Fri 18:00-22:00
const DEFAULT_DAILY: [number, number][][] = [
  [[1080, 1320]], // Mo: 18:00-22:00
  [[1080, 1320]], // Di
  [[1080, 1320]], // Mi
  [[1080, 1320]], // Do
  [[1080, 1320]], // Fr
  [], // Sa
  [], // So
];

type TimeSlot = [number, number];

interface DayAvailability {
  enabled: boolean;
  slots: TimeSlot[];
}

export default function AvailabilityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Initialize with default availability
  const [days, setDays] = useState<DayAvailability[]>(
    DEFAULT_DAILY.map((slots) => ({
      enabled: slots.length > 0,
      slots: slots.length > 0 ? slots : [[1080, 1320]], // Default slot if none
    }))
  );

  const toggleDay = (index: number) => {
    setDays((prev) =>
      prev.map((day, i) =>
        i === index ? { ...day, enabled: !day.enabled } : day
      )
    );
  };

  const updateSlot = (
    dayIndex: number,
    slotIndex: number,
    field: "start" | "end",
    date: Date
  ) => {
    const minutes = dateToMinutes(date);
    setDays((prev) =>
      prev.map((day, i) => {
        if (i !== dayIndex) return day;
        const newSlots = [...day.slots];
        if (field === "start") {
          newSlots[slotIndex] = [minutes, newSlots[slotIndex][1]];
        } else {
          newSlots[slotIndex] = [newSlots[slotIndex][0], minutes];
        }
        return { ...day, slots: newSlots };
      })
    );
  };

  const addSlot = (dayIndex: number) => {
    setDays((prev) =>
      prev.map((day, i) => {
        if (i !== dayIndex) return day;
        return { ...day, slots: [...day.slots, [720, 840]] }; // 12:00-14:00 default
      })
    );
  };

  const removeSlot = (dayIndex: number, slotIndex: number) => {
    setDays((prev) =>
      prev.map((day, i) => {
        if (i !== dayIndex) return day;
        if (day.slots.length <= 1) return day; // Keep at least one slot
        return { ...day, slots: day.slots.filter((_, si) => si !== slotIndex) };
      })
    );
  };

  const toaster = useToast();

  const save = () => {
    // TODO: Save via realite.availability.set event
    // For now, just show success and go back
    toaster.success("Verfügbarkeit gespeichert");
    router.back();
  };

  // Count enabled days
  const enabledDaysCount = days.filter((d) => d.enabled).length;

  return (
    <Page
      contentContainerStyle={{
        flexDirection: "column",
        gap: 16,
        paddingTop: 16,
        paddingBottom: 32 + insets.bottom,
      }}
    >
      <Text className="text-muted-foreground mb-2">
        Definiere, wann du typischerweise Zeit für Aktivitäten hast. Andere
        können diese Information sehen, um passende Zeiten vorzuschlagen.
      </Text>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Button size="sm" onPress={save}>
              Speichern
            </Button>
          ),
        }}
      />

      {/* Week Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Wochenübersicht</CardTitle>
        </CardHeader>
        <CardContent>
          <View className="flex-row gap-2 mb-4">
            {DAY_LABELS.map((day, index) => (
              <Pressable
                key={day}
                onPress={() => toggleDay(index)}
                className={cn(
                  "flex-1 items-center justify-center py-3 rounded-xl border-2 transition-colors",
                  days[index].enabled
                    ? "bg-primary/10 border-primary"
                    : "bg-muted/50 border-border"
                )}
              >
                <Text
                  variant="caption"
                  className={cn(
                    "font-semibold",
                    days[index].enabled
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {day}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text variant="caption" className="text-muted-foreground text-center">
            {enabledDaysCount > 0
              ? `${enabledDaysCount} Tag${enabledDaysCount > 1 ? "e" : ""} aktiv`
              : "Keine Tage aktiv"}
          </Text>
        </CardContent>
      </Card>

      {/* Day Details */}
      {DAY_LABELS.map((day, dayIndex) => (
        <Card key={day}>
          <CardHeader>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Icon name={ClockIcon} size={18} />
                <CardTitle>{DAY_FULL[dayIndex]}</CardTitle>
              </View>
              <Switch
                value={days[dayIndex].enabled}
                onValueChange={() => toggleDay(dayIndex)}
                trackColor={{ false: "#D1D5DB", true: "#6366F1" }}
                thumbColor={
                  Platform.OS === "android"
                    ? days[dayIndex].enabled
                      ? "#ffffff"
                      : "#f4f4f5"
                    : undefined
                }
                ios_backgroundColor="#D1D5DB"
              />
            </View>
          </CardHeader>

          {days[dayIndex].enabled && (
            <CardContent>
              {days[dayIndex].slots.map((slot, slotIndex) => (
                <View key={slotIndex}>
                  <View className="flex-row items-end gap-3 mb-4">
                    {/* Start Time */}
                    <View className="flex-1">
                      <TimeSelector
                        label="Von"
                        value={minutesToDate(slot[0])}
                        onChange={(date) => {
                          if (date)
                            updateSlot(dayIndex, slotIndex, "start", date);
                        }}
                      />
                    </View>

                    {/* End Time */}
                    <View className="flex-1">
                      <TimeSelector
                        label="Bis"
                        value={minutesToDate(slot[1])}
                        onChange={(date) => {
                          if (date)
                            updateSlot(dayIndex, slotIndex, "end", date);
                        }}
                      />
                    </View>

                    {/* Remove Slot */}
                    {days[dayIndex].slots.length > 1 && (
                      <Pressable
                        onPress={() => removeSlot(dayIndex, slotIndex)}
                        className="p-2 mb-2"
                      >
                        <Icon
                          name={TrashIcon}
                          size={20}
                          className="text-destructive"
                        />
                      </Pressable>
                    )}
                  </View>

                  {slotIndex < days[dayIndex].slots.length - 1 && (
                    <Separator style={{ marginBottom: 16 }} />
                  )}
                </View>
              ))}

              {/* Add Slot Button */}
              <Button
                variant="outline"
                onPress={() => addSlot(dayIndex)}
                className="mt-2"
                icon={PlusIcon}
                size="sm"
              >
                Weiteres Zeitfenster
              </Button>
            </CardContent>
          )}
        </Card>
      ))}

      {/* Save Button */}
      <Button onPress={save} className="mt-4">
        Speichern
      </Button>
    </Page>
  );
}

// Platform-specific Time Selector
// Uses native Android TimePickerDialog on Android, BNA UI DatePicker on iOS
function TimeSelector({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
}) {
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);

  if (Platform.OS === "android") {
    const handleAndroidChange = (
      event: DateTimePickerEvent,
      selectedDate?: Date
    ) => {
      setShowAndroidPicker(false);
      if (event.type === "set" && selectedDate) {
        onChange(selectedDate);
      }
    };

    return (
      <View>
        <Pressable
          onPress={() => setShowAndroidPicker(true)}
          className="bg-muted px-4 py-3 rounded-xl flex flex-row gap-2"
        >
          <Text variant="caption" className="text-muted-foreground mb-1">
            {label}
          </Text>
          <Text className="text-center font-medium">
            {value.toLocaleTimeString("de-DE", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </Pressable>
        {showAndroidPicker && (
          <DateTimePicker
            value={value}
            mode="time"
            is24Hour={true}
            onChange={handleAndroidChange}
          />
        )}
      </View>
    );
  }

  // iOS: Use BNA UI DatePicker
  return (
    <DatePicker
      mode="time"
      value={value}
      onChange={(date) => {
        if (date) onChange(date);
      }}
      placeholder={label}
      variant="filled"
      label={label}
    />
  );
}
