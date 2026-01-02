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
  person: "person-outline",
  "map.fill": "explore",
  // added mappings
  location: "location-on",
  "location.fill": "location-on",
  calendar: "calendar-today",
  clock: "access-time",
  tag: "sell",
  "questionmark.circle": "help-outline",
  close: "close",
  plus: "add",
  add: "add",
  // activity icons used in PlanCard (fallbacks for Android/Web)
  "fork.knife": "restaurant",
  "mountain.2": "terrain",
  "person.2": "people",
  "figure.run": "directions-run",
  theatermasks: "theater-comedy",
  book: "menu-book",
  airplane: "flight",
  heart: "favorite",
  house: "home",
  // commonly used extras
  magnifyingglass: "search",
  "line.3.horizontal.decrease.circle": "filter-list",
  xmark: "close",
  checkmark: "check",
  check: "check",
  "check-circle": "check-circle",
  "location-on": "location-on",
  place: "location-on",
  event: "event",
  schedule: "schedule",
  description: "description",
  people: "people",
  group: "group",
  verified: "verified",
  "checkmark-circle": "check-circle",
  "add-circle": "add-circle",
  notifications: "notifications",
  bell: "notifications",
  "bell.fill": "notifications",
  contacts: "contacts",
  phone: "phone",
  "phone.fill": "phone",
  "chevron-right": "chevron-right",
  "bug-report": "bug-report",
  "event-busy": "event-busy",
  "system-update": "system-update",
  pencil: "edit",
  ellipsis: "more-vert",
  trash: "delete",
  "trash.fill": "delete",
  "xmark.circle.fill": "cancel",
  "plus.circle.fill": "add-circle",
  "mappin.and.ellipse": "place",
  "person.circle": "account-circle",
  sparkles: "auto-awesome",
  "square.and.arrow.up": "share",
  link: "link",
} as Partial<IconMapping>;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function Icon({
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
