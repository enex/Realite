// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolViewProps, SymbolWeight } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<
  SymbolViewProps["name"],
  ComponentProps<typeof MaterialIcons>["name"]
>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "person.fill": "person",
  "map.fill": "explore",
  // added mappings
  location: "location-on",
  calendar: "calendar-today",
  clock: "access-time",
  tag: "sell",
  "questionmark.circle": "help-outline",
  close: "close",
  add: "add",
  check: "checkmark",
  "check-circle": "checkmark-circle",
  "location-on": "location",
  place: "location",
  event: "calendar",
  schedule: "time",
  description: "document-text",
  people: "people",
  group: "people",
  verified: "checkmark-circle",
  "add-circle": "add-circle",
  notifications: "notifications",
  contacts: "people-circle",
  "chevron-right": "chevron-forward",
  "bug-report": "bug",
  "event-busy": "calendar",
  "system-update": "refresh",
} as Partial<IconMapping>;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return (
    <MaterialIcons
      color={color}
      size={size}
      name={MAPPING[name]}
      style={style}
    />
  );
}
