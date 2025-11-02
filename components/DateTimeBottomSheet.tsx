import { Pressable, Text, View } from "react-native";

import SmartDateTimePicker from "@/components/SmartDateTimePicker";
import React, { useState } from "react";

function DateTimeBottomSheet({
  title,
  initialDate,
  onClose,
  onSelect,
  accentColor,
}: {
  title: string;
  initialDate: Date;
  onClose: () => void;
  onSelect: (d: Date) => void;
  accentColor: string;
}) {
  const [selected, setSelected] = useState<Date[]>([initialDate]);
  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        top: 0,
        backgroundColor: "rgba(0,0,0,0.2)",
        justifyContent: "flex-end",
      }}
    >
      <Pressable style={{ flex: 1 }} onPress={onClose} />
      <View
        style={{
          backgroundColor: "#fff",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingBottom: 12,
          paddingTop: 8,
        }}
      >
        <View style={{ alignItems: "center", paddingVertical: 6 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: "400" as const,
              lineHeight: 20,
              color: "#1C1C1E",
            }}
          >
            {title}
          </Text>
        </View>
        <View style={{ height: 420 }}>
          <SmartDateTimePicker
            selectedDates={selected}
            onDateSelect={(d) => {
              setSelected([d]);
              onSelect(d);
            }}
            onDateRemove={() => {}}
            accentColor={accentColor}
          />
        </View>
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <Pressable
            onPress={onClose}
            style={{
              backgroundColor: "#E5E5EA",
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: "#1C1C1E",
                fontSize: 15,
                fontWeight: "400" as const,
                lineHeight: 20,
              }}
            >
              Abbrechen
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default React.memo(DateTimeBottomSheet);
