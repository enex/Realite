import { IconSymbol } from "@/components/ui/IconSymbol";
import {
  activities,
  type ActivityGroupId,
  type ActivityId,
} from "@/shared/activities";
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

type QuickRangeId = (typeof quickRanges)[number]["id"];

const extractGroupFromActivity = (
  activity?: ActivityId
): ActivityGroupId | undefined => {
  if (!activity) return undefined;
  const [groupId] = (activity as string).split("/");
  return activities[groupId as ActivityGroupId]
    ? (groupId as ActivityGroupId)
    : undefined;
};

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
    const [selectedQuick, setSelectedQuick] = useState<QuickRangeId>("7d");
    const [selectedActivity, setSelectedActivity] = useState<
      ActivityGroupId | undefined
    >(extractGroupFromActivity(initial?.activity));
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
      return Object.entries(activities).map(([groupId, group]) => ({
        id: groupId as ActivityGroupId,
        name: group.nameDe ?? group.name,
        emoji: group.emoji,
      }));
    }, []);

    const computeDates = useCallback(
      (quick: QuickRangeId): {
        startDate?: Date;
        endDate?: Date;
      } => {
        const now = new Date();
        if (quick === "today") {
          const start = new Date(now);
          const end = new Date(now);
          end.setHours(23, 59, 59, 999);
          return { startDate: start, endDate: end };
        }
        if (quick === "7d") {
          const start = new Date(now);
          const end = new Date(now);
          end.setDate(end.getDate() + 7);
          return { startDate: start, endDate: end };
        }
        if (quick === "30d") {
          const start = new Date(now);
          const end = new Date(now);
          end.setDate(end.getDate() + 30);
          return { startDate: start, endDate: end };
        }
        return { startDate: undefined, endDate: undefined };
      },
      []
    );

    const applyFilter = useCallback(
      (nextState: {
        quick: QuickRangeId;
        activity: ActivityGroupId | undefined;
        radius: number | null;
      }) => {
        const { startDate, endDate } = computeDates(nextState.quick);
        onApply({
          startDate,
          endDate,
          activity: nextState.activity,
          useLocation: canUseLocation ? nextState.radius !== null : false,
          radiusKm: nextState.radius,
        });
      },
      [canUseLocation, computeDates, onApply]
    );

    const handleReset = useCallback(() => {
      const defaultQuick: QuickRangeId = "7d";
      setSelectedQuick(defaultQuick);
      setSelectedActivity(undefined);
      applyFilter({
        quick: defaultQuick,
        activity: undefined,
        radius: radiusKm,
      });
    }, [applyFilter, radiusKm]);

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
                      onPress={() => {
                        const nextRadius = km as number | null;
                        setRadiusKm(nextRadius);
                        applyFilter({
                          quick: selectedQuick,
                          activity: selectedActivity,
                          radius: nextRadius,
                        });
                      }}
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
                  onPress={() => {
                    const nextQuick = range.id;
                    setSelectedQuick(nextQuick);
                    applyFilter({
                      quick: nextQuick,
                      activity: selectedActivity,
                      radius: radiusKm,
                    });
                  }}
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
                  onPress={() => {
                    setSelectedActivity(undefined);
                    applyFilter({
                      quick: selectedQuick,
                      activity: undefined,
                      radius: radiusKm,
                    });
                  }}
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
                    onPress={() => {
                      setSelectedActivity(a.id);
                      applyFilter({
                        quick: selectedQuick,
                        activity: a.id,
                        radius: radiusKm,
                      });
                    }}
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
                      {a.emoji ? `${a.emoji} ${a.name}` : a.name}
                    </Text>
                    {selectedActivity === a.id && (
                      <IconSymbol name="checkmark" size={16} color="#007AFF" />
                    )}
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Close */}
          <View style={{ marginTop: 16 }}>
            <Pressable
              onPress={handleDismiss}
              style={{
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
                Schließen
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
