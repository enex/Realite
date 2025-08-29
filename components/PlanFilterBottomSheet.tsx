import { IconSymbol } from "@/components/ui/IconSymbol";
import { activities, type ActivityId } from "@/shared/activities";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import React, { forwardRef, useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

export type PlanFilter = {
  startDate?: Date;
  endDate?: Date;
  activity?: ActivityId;
  useLocation?: boolean;
  radiusKm?: number | null;
};

type PlanFilterBottomSheetProps = {
  initial?: PlanFilter;
  onApply: (filter: PlanFilter) => void;
  canUseLocation?: boolean;
  onRequestLocation?: () => void;
  hideLocation?: boolean;
};

export type PlanFilterBottomSheetRef = {
  present: () => void;
  dismiss: () => void;
};

const quickRanges = [
  { id: "today", label: "Heute" },
  { id: "7d", label: "7 Tage" },
  { id: "30d", label: "30 Tage" },
  { id: "all", label: "Alle" },
] as const;

export const PlanFilterBottomSheet = forwardRef<
  PlanFilterBottomSheetRef,
  PlanFilterBottomSheetProps
>(
  (
    {
      initial,
      onApply,
      canUseLocation = false,
      onRequestLocation,
      hideLocation = false,
    },
    ref
  ) => {
    const [selectedQuick, setSelectedQuick] =
      useState<(typeof quickRanges)[number]["id"]>("7d");
    const [selectedActivity, setSelectedActivity] = useState<
      ActivityId | undefined
    >(initial?.activity);
    // We infer location usage from radiusKm presence; no explicit toggle needed
    const [radiusKm, setRadiusKm] = useState<number | null>(
      typeof initial?.radiusKm === "number" ? initial?.radiusKm : 50
    );

    const bottomSheetRef = React.useRef<BottomSheetModal>(null);

    const snapPoints = useMemo(() => ["50%", "80%"], []);

    const handlePresent = useCallback(() => {
      bottomSheetRef.current?.present();
    }, []);
    const handleDismiss = useCallback(() => {
      bottomSheetRef.current?.dismiss();
    }, []);

    React.useImperativeHandle(
      ref,
      () => ({ present: handlePresent, dismiss: handleDismiss }),
      [handlePresent, handleDismiss]
    );

    const activityList = useMemo(() => {
      const items: { id: ActivityId; name: string }[] = [];
      Object.entries(activities).forEach(([groupId, group]) => {
        Object.entries(group.subActivities).forEach(([subId, sub]) => {
          items.push({ id: subId as ActivityId, name: sub.name });
        });
      });
      return items;
    }, []);

    const computeDates = useCallback((): {
      startDate?: Date;
      endDate?: Date;
    } => {
      const now = new Date();
      if (selectedQuick === "today") {
        const start = new Date(now);
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        return { startDate: start, endDate: end };
      }
      if (selectedQuick === "7d") {
        const start = new Date(now);
        const end = new Date(now);
        end.setDate(end.getDate() + 7);
        return { startDate: start, endDate: end };
      }
      if (selectedQuick === "30d") {
        const start = new Date(now);
        const end = new Date(now);
        end.setDate(end.getDate() + 30);
        return { startDate: start, endDate: end };
      }
      return { startDate: undefined, endDate: undefined };
    }, [selectedQuick]);

    const handleReset = useCallback(() => {
      setSelectedQuick("7d");
      setSelectedActivity(undefined);
    }, []);

    const handleApply = useCallback(() => {
      const { startDate, endDate } = computeDates();
      onApply({
        startDate,
        endDate,
        activity: selectedActivity,
        useLocation: canUseLocation ? radiusKm !== null : false,
        radiusKm,
      });
      handleDismiss();
    }, [
      computeDates,
      onApply,
      selectedActivity,
      handleDismiss,
      radiusKm,
      canUseLocation,
    ]);

    return (
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        index={0}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: "#F2F2F7" }}
        handleIndicatorStyle={{ backgroundColor: "#C6C6C8" }}
      >
        <BottomSheetView
          style={{
            flex: 1,
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: 24,
          }}
        >
          {/* Header */}
          <View
            style={{
              marginBottom: 16,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: "700", color: "#1C1C1E" }}>
              Filter
            </Text>
            <Pressable
              onPress={handleReset}
              style={{ paddingHorizontal: 12, paddingVertical: 6 }}
            >
              <Text style={{ color: "#007AFF", fontWeight: "600" }}>
                Zurücksetzen
              </Text>
            </Pressable>
          </View>

          {/* Location filter */}
          {!hideLocation && (
            <View style={{ marginTop: 12, marginBottom: 8 }}>
              <Text style={{ fontSize: 14, color: "#8E8E93", marginBottom: 8 }}>
                Radius
              </Text>
              {canUseLocation ? (
                <View
                  style={{
                    flexDirection: "row",
                    gap: 8,
                    flexWrap: "wrap" as const,
                  }}
                >
                  {[null, 5, 10, 25, 50, 100, 250, 500].map((km) => (
                    <Pressable
                      key={km === null ? "any" : km}
                      onPress={() => setRadiusKm(km as number | null)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 16,
                        backgroundColor:
                          (km === null && radiusKm === null) || radiusKm === km
                            ? "#007AFF"
                            : "white",
                        borderWidth: 1,
                        borderColor:
                          (km === null && radiusKm === null) || radiusKm === km
                            ? "#007AFF"
                            : "#E5E5EA",
                      }}
                    >
                      <Text
                        style={{
                          color:
                            (km === null && radiusKm === null) ||
                            radiusKm === km
                              ? "white"
                              : "#1C1C1E",
                          fontWeight: "600",
                        }}
                      >
                        {km === null ? "Egal" : `${km} km`}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      backgroundColor: "#F8F8F8",
                      borderWidth: 1,
                      borderColor: "#E5E5EA",
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                    }}
                  >
                    <Text style={{ fontSize: 16, color: "#8E8E93" }}>
                      Standortzugriff nicht erlaubt
                    </Text>
                    {onRequestLocation && (
                      <Pressable onPress={onRequestLocation}>
                        <Text style={{ color: "#007AFF", fontWeight: "600" }}>
                          Zulassen
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Quick ranges */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, color: "#8E8E93", marginBottom: 8 }}>
              Zeitraum
            </Text>
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                flexWrap: "wrap" as const,
              }}
            >
              {quickRanges.map((range) => (
                <Pressable
                  key={range.id}
                  onPress={() => setSelectedQuick(range.id)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 16,
                    backgroundColor:
                      selectedQuick === range.id ? "#007AFF" : "white",
                    borderWidth: 1,
                    borderColor:
                      selectedQuick === range.id ? "#007AFF" : "#E5E5EA",
                  }}
                >
                  <Text
                    style={{
                      color: selectedQuick === range.id ? "white" : "#1C1C1E",
                      fontWeight: "600",
                    }}
                  >
                    {range.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Activity selection */}
          <View style={{ marginBottom: 8 }}>
            <Text style={{ fontSize: 14, color: "#8E8E93", marginBottom: 8 }}>
              Aktivität
            </Text>
            <ScrollView style={{ maxHeight: 220 }}>
              <View style={{ gap: 8 }}>
                <Pressable
                  onPress={() => setSelectedActivity(undefined)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor:
                      selectedActivity === undefined ? "#E5F0FF" : "white",
                    borderWidth: 1,
                    borderColor:
                      selectedActivity === undefined ? "#B7D4FF" : "#E5E5EA",
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                  }}
                >
                  <Text style={{ fontSize: 16, color: "#1C1C1E" }}>
                    Alle Aktivitäten
                  </Text>
                  {selectedActivity === undefined && (
                    <IconSymbol name="checkmark" size={16} color="#007AFF" />
                  )}
                </Pressable>
                {activityList.map((a) => (
                  <Pressable
                    key={a.id}
                    onPress={() => setSelectedActivity(a.id)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      backgroundColor:
                        selectedActivity === a.id ? "#E5F0FF" : "white",
                      borderWidth: 1,
                      borderColor:
                        selectedActivity === a.id ? "#B7D4FF" : "#E5E5EA",
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                    }}
                  >
                    <Text style={{ fontSize: 16, color: "#1C1C1E" }}>
                      {a.name}
                    </Text>
                    {selectedActivity === a.id && (
                      <IconSymbol name="checkmark" size={16} color="#007AFF" />
                    )}
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Apply */}
          <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
            <Pressable
              onPress={handleDismiss}
              style={{
                flex: 1,
                backgroundColor: "#F2F2F7",
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#E5E5EA",
              }}
            >
              <Text
                style={{ fontSize: 16, fontWeight: "600", color: "#8E8E93" }}
              >
                Abbrechen
              </Text>
            </Pressable>
            <Pressable
              onPress={handleApply}
              style={{
                flex: 2,
                backgroundColor: "#007AFF",
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
              }}
            >
              <IconSymbol
                name="line.3.horizontal.decrease.circle"
                size={18}
                color="white"
              />
              <Text style={{ fontSize: 16, fontWeight: "600", color: "white" }}>
                Filter anwenden
              </Text>
            </Pressable>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

PlanFilterBottomSheet.displayName = "PlanFilterBottomSheet";

export default PlanFilterBottomSheet;
