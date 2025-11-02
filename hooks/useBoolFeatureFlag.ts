import { useFeatureFlag } from "posthog-react-native";

export default function useBoolFeatureFlag<T>(
  flagName: string,
  defaultValue: T = undefined as T
): T | boolean {
  const value = useFeatureFlag(flagName);
  return value !== undefined ? Boolean(value) : defaultValue;
}
