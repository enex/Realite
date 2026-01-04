import DateTimePicker from "@react-native-community/datetimepicker";
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useMemo, useState } from "react";
import { Platform, Pressable, View } from "react-native";

import { ThemedText } from "@/components/themed-text";

export function BirthdateField({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (v?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const date = useMemo(() => {
    if (!value) return undefined;
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }, [value]);

  return (
    <View className="mb-4">
      <ThemedText className="mb-2 text-gray-600 dark:text-gray-400">
        Geburtstag
      </ThemedText>
      <Pressable
        onPress={() => setOpen(true)}
        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3"
      >
        <ThemedText className="text-gray-900 dark:text-white">
          {date ? date.toLocaleDateString() : "Auswählen"}
        </ThemedText>
      </Pressable>

      {open && (
        <View className="mt-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
          <DateTimePicker
            value={date ?? new Date(2000, 0, 1)}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "calendar"}
            maximumDate={new Date()}
            onChange={(event: DateTimePickerEvent, selectedDate) => {
              if (Platform.OS !== "ios") setOpen(false);
              if (event.type === "dismissed") return;
              if (!selectedDate) return;
              const iso = selectedDate.toISOString().slice(0, 10);
              onChange(iso);
            }}
          />
          <View className="mt-3 flex-row justify-between">
            <Pressable
              onPress={() => {
                onChange(undefined);
                setOpen(false);
              }}
              className="rounded-lg bg-muted px-4 py-2"
            >
              <ThemedText className="text-foreground">Entfernen</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setOpen(false)}
              className="rounded-lg bg-blue-600 px-4 py-2"
            >
              <ThemedText className="text-white">Fertig</ThemedText>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
