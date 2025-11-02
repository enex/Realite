import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import React, { useEffect, useRef, useState } from "react";

function TextEditBottomSheet({
  title,
  initialValue,
  multiline = false,
  accentColor,
  onClose,
  onSave,
}: {
  title: string;
  initialValue: string;
  multiline?: boolean;
  accentColor: string;
  onClose: () => void;
  onSave: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const textInputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();
  const keyboardBehavior =
    Platform.OS === "ios" ? "padding" : ("height" as const);
  const keyboardVerticalOffset = Platform.OS === "ios" ? insets.bottom : 0;

  useEffect(() => {
    if (textInputRef.current) {
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 100);
    }
  }, []);

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
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={keyboardBehavior}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <View
            style={{
              backgroundColor: "#fff",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingBottom: 24 + insets.bottom,
              paddingTop: 8,
              maxHeight: "80%",
            }}
          >
            <View
              style={{
                height: 4,
                width: 44,
                backgroundColor: "#D1D1D6",
                borderRadius: 2,
                alignSelf: "center",
                marginBottom: 8,
              }}
            />
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: "700" as const,
                    lineHeight: 28,
                    color: "#0F172A",
                    marginBottom: 12,
                  }}
                >
                  {title}
                </Text>
                <TextInput
                  ref={textInputRef}
                  style={{
                    backgroundColor: "#F9FAFB",
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    fontSize: 17,
                    color: "#0F172A",
                    minHeight: multiline ? 120 : 44,
                    maxHeight: multiline ? 200 : 44,
                    textAlignVertical: multiline ? "top" : "center",
                  }}
                  placeholder={
                    multiline ? "Beschreibung eingeben..." : "Text eingeben..."
                  }
                  placeholderTextColor="#9CA3AF"
                  multiline={multiline}
                  value={value}
                  onChangeText={setValue}
                  autoFocus
                />
              </View>
            </ScrollView>
            <View style={{ paddingHorizontal: 16, gap: 8, paddingTop: 8 }}>
              <Pressable
                onPress={() => {
                  if (value.trim()) {
                    onSave(value.trim());
                  } else {
                    onClose();
                  }
                }}
                style={{
                  backgroundColor: accentColor,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    lineHeight: 20,
                    fontWeight: "600",
                    color: "#FFFFFF",
                  }}
                >
                  Speichern
                </Text>
              </Pressable>
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
                    fontSize: 15,
                    fontWeight: "400" as const,
                    lineHeight: 20,
                    color: "#1C1C1E",
                  }}
                >
                  Abbrechen
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

export default React.memo(TextEditBottomSheet);
