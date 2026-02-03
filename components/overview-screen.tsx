import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { normalizeOptions, Plan, PlanLocation, PlanLocationOption } from "@/lib/core";
import {
    activities,
    getActivityIconColor,
    getActivityLabel,
    getGroupIdFromActivity,
    type ActivityGroupId,
    type ActivityId,
} from "@/shared/activities";
import { getActivityIcon } from "@/shared/activity-icons";
import { formatLocalDateTime, formatLocalTime } from "@/shared/utils/datetime";
import { isSameDay } from "date-fns";
import { GlassView } from "expo-glass-effect";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { MapPinIcon } from "lucide-react-native";
import { useCallback, useRef } from "react";
import { Animated, Pressable, View } from "react-native";
import tinycolor from "tinycolor2";
import AppScreen, { AppScreenScrollableContent } from "./ui/app-screen";
import { Button } from "./ui/button";
import { ScrollView } from "./ui/scroll-view";

export default function OverviewScreen() {
    return (
        <AppScreen>
            <AppScreenScrollableContent noHorizontalPadding>
                <Header />
                <PlanFilterChips />
                <MyPlans />
                <PlanSuggestions />
            </AppScreenScrollableContent>
        </AppScreen>
    );
}

function Header() {
    const router = useRouter();
    return <View className="flex-row items-center gap-2">
        <Button variant="ghost" size="icon" onPress={() => router.push("/profile")}>
            <Avatar name="John Doe" image="https://github.com/shadcn.png" size={40} />
        </Button>
        <View className="flex flex-col gap-0">
            <Text variant="caption">Was möchtest du machen?</Text>
            <Text className="text-base font-semibold">John Doe</Text>
        </View>
    </View>;
}

function PlanFilterChips() {
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-1 py-1">
            <PlanFilterChip>Heute</PlanFilterChip>
            <PlanFilterChip>Meine</PlanFilterChip>
            <PlanFilterChip>Abgelehnt</PlanFilterChip>
            <PlanFilterChip>Sonst</PlanFilterChip>
            <PlanFilterChip>Sonst</PlanFilterChip>
            <PlanFilterChip>Sonst</PlanFilterChip>
            <PlanFilterChip>Sonst</PlanFilterChip>
        </ScrollView>
    );
}

function PlanFilterChip({ children }: { children: React.ReactNode }) {
    return (
        <Button
            variant="outline"
            size="sm"
            style={{
                paddingLeft: 8,
                paddingRight: 8,
                paddingTop: 2,
                paddingBottom: 2,
                height: undefined,
            }}
        >
            {children}
        </Button>
    );
}

function MyPlans() {
    return (
        <View className="px-4">
            <Text variant="heading">My Plans</Text>
            <Text variant="subtitle">Your plans</Text>
        </View>
    );
}

function PlanSuggestions() {
    const plans: Plan[] = [
        {
            what: {
                title: "Mal pizza essen gehen und unterhalten",
                category: "eat",
                activity: "pizza",
            },
        },
        {
            when: {
                start: "2026-01-23T18:00:00",
                end: "2026-01-23T20:00:00",
            },
            who: {
                explicit: ["Me"],
            },
        },
        {
            when: {
                start: "2026-01-20T00:00:00",
                end: "2026-01-25T24:59:59",
            },
            certainty: 0
        }
    ];
    return <View className="gap-2 px-4">{plans.map((plan, i) => <PlanCard key={i} plan={plan} />)}</View>;
}


// Helper functions
function getActivityGradientForMode(activityId: ActivityId | undefined, isDark: boolean): readonly [string, string, string] {
    if (!activityId) {
        return isDark
            ? ["#1e293b", "#334155", "#475569"] as const
            : ["#e2e8f0", "#cbd5e1", "#94a3b8"] as const;
    }

    const groupId = getGroupIdFromActivity(activityId);
    const base = (groupId && activities[groupId]?.color) || "#94a3b8";

    if (isDark) {
        // Dark mode: darker, more saturated gradients
        const c1 = tinycolor(base).darken(25).saturate(10).toHexString();
        const c2 = tinycolor(base).darken(15).saturate(5).toHexString();
        const c3 = tinycolor(base).darken(5).toHexString();
        return [c1, c2, c3] as const;
    } else {
        // Light mode: original light gradients
        const c1 = tinycolor(base).lighten(35).toHexString();
        const c2 = tinycolor(base).lighten(15).toHexString();
        const c3 = tinycolor(base).toHexString();
        return [c1, c2, c3] as const;
    }
}

function getActivityIdFromPlan(plan: Plan): ActivityId | undefined {
    if (!plan.what) return undefined;
    const { category, activity } = plan.what;

    if (category && activity) {
        const groupId = category as ActivityGroupId;
        const group = activities[groupId];
        if (group && group.subActivities[activity as keyof typeof group.subActivities]) {
            return `${category}/${activity}` as ActivityId;
        }
    }

    if (category && activities[category as ActivityGroupId]) {
        return category as ActivityId;
    }

    return undefined;
}

function getPrimaryLocation(location: PlanLocation): PlanLocationOption | undefined {
    const options = normalizeOptions(location);
    return options[0];
}

function derivePlanTitle(plan: Plan): string {
    if (plan.what?.title) return plan.what.title;

    const activityId = getActivityIdFromPlan(plan);
    if (activityId) {
        const label = getActivityLabel(activityId);
        if (label) return label;
    }

    if (plan.what?.activity) {
        // Capitalize first letter
        return plan.what.activity.charAt(0).toUpperCase() + plan.what.activity.slice(1);
    }

    if (plan.what?.category) {
        const categoryName = activities[plan.what.category as ActivityGroupId]?.nameDe || plan.what.category;
        return categoryName;
    }

    if (plan.where) {
        const primary = getPrimaryLocation(plan.where);
        if (primary?.name) {
            return `Treffen bei ${primary.name}`;
        }
    }

    if (plan.when) {
        const start = new Date(plan.when.start);
        return formatLocalDateTime(start, {
            includeTime: false,
            dateOptions: { weekday: "long", day: "numeric", month: "long" }
        });
    }

    return "Plan";
}

function getFirstName(name: string): string {
    const trimmed = String(name).trim();
    if (!trimmed) return "";
    return trimmed.split(/\s+/)[0];
}

// Helper to check if times are the same (within 1 minute)
function isSameTime(start: string, end: string): boolean {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = Math.abs(endDate.getTime() - startDate.getTime());
    return diffMs < 60 * 1000; // Less than 1 minute difference
}

// Focused sub-components
function PlanTimeChip({ when, isDark, certainty }: { when: { start: string; end: string }; isDark: boolean; certainty?: number }) {
    const start = new Date(when.start);
    const end = new Date(when.end);

    // Check if it's a single time (same or very close)
    const isSingleTime = isSameTime(when.start, when.end);

    let timeStr: string;
    if (isSingleTime) {
        // Single time: show as availability
        if (certainty === 0) {
            timeStr = "Nicht verfügbar";
        } else {
            timeStr = "Verfügbarkeit";
        }
    } else if (isSameDay(when.start, when.end)) {
        // Same day: show date and time range
        timeStr = formatLocalDateTime(start, {
            includeTime: true,
            dateOptions: { weekday: "short", day: "2-digit", month: "short" },
        });
        const endTime = formatLocalTime(end);
        timeStr = `${timeStr} - ${endTime}`;
    } else {
        // Multi-day: show start date/time
        timeStr = formatLocalDateTime(start, {
            includeTime: true,
            dateOptions: { weekday: "short", day: "2-digit", month: "short" },
        });
    }

    return (
        <View className="absolute top-3 right-3" pointerEvents="none">
            <GlassView
                className="rounded-xl px-3 py-1.5 overflow-hidden border border-white/60 dark:border-white/20 shadow-sm"
                style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 2,
                }}
            >
                <Text className={isDark ? "text-zinc-50" : "text-zinc-900"} style={{ fontSize: 12, fontWeight: "600", lineHeight: 16 }}>
                    {timeStr}
                </Text>
            </GlassView>
        </View>
    );
}

function PlanTitle({ title, isDark }: { title: string; isDark: boolean }) {
    return (
        <Text className={`text-xl font-semibold leading-[25px] mb-2 ${isDark ? "text-white" : "text-[#1C1C1E]"}`}>
            {title}
        </Text>
    );
}

function PlanLocationView({ where, isDark }: { where: PlanLocation; isDark: boolean }) {
    const primary = getPrimaryLocation(where);
    if (!primary?.name && !primary?.address) return null;

    const iconColor = isDark ? "#ffffff" : "#1C1C1E";
    const textColor = isDark ? "text-white" : "text-[#1C1C1E]";

    return (
        <View className="flex-row items-center gap-2 mb-2">
            <Icon name={MapPinIcon} size={14} color={iconColor} />
            <Text className={`text-[15px] font-normal leading-5 ${textColor}`}>
                {primary.name || primary.address}
            </Text>
        </View>
    );
}

function PlanParticipants({ who, isDark }: { who: { explicit?: string[] }; isDark: boolean }) {
    if (!who.explicit || who.explicit.length === 0) return null;

    const participants = who.explicit.map(name => ({ name, image: undefined }));

    return (
        <View className="flex-row items-center justify-start">
            <View className="flex-row items-center">
                <View className="flex-row mr-2">
                    {participants.slice(0, 5).map((p, idx) => (
                        <View
                            key={`${p.name}-${idx}`}
                            className={`rounded-[14px] border-2 ${isDark ? "border-white/30 bg-white/20" : "border-white/50 bg-white/90"}`}
                            style={{
                                marginLeft: idx > 0 ? -10 : 0,
                                zIndex: participants.length - idx,
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.1,
                                shadowRadius: 4,
                                elevation: 2,
                            }}
                        >
                            <Avatar name={p.name} image={p.image} size={28} />
                        </View>
                    ))}
                </View>
                <Text className={`text-xs font-normal leading-4 ${isDark ? "text-white" : "text-[#1C1C1E]"}`} numberOfLines={1}>
                    {(() => {
                        const firstTwo = participants
                            .slice(0, 2)
                            .map((p) => getFirstName(p.name));
                        const remaining = participants.length - firstTwo.length;
                        const label =
                            remaining > 0
                                ? `${firstTwo.join(", ")} +${remaining}`
                                : firstTwo.join(", ");
                        return participants.length > 1
                            ? `Gruppe: ${label}`
                            : firstTwo.join(", ");
                    })()}
                </Text>
            </View>
        </View>
    );
}

function PlanStatus({ certainty, isDark, when }: { certainty: number; isDark: boolean; when?: { start: string; end: string } }) {
    // If it's a single time, don't show status here (it's shown in the time chip)
    if (when && isSameTime(when.start, when.end)) {
        return null;
    }

    if (certainty === 0) {
        return (
            <View className="mt-2">
                <Text className={`text-[13px] font-normal leading-[18px] ${isDark ? "text-red-400" : "text-red-600"}`}>
                    Abgelehnt
                </Text>
            </View>
        );
    }

    if (certainty < 1) {
        return (
            <View className="mt-2">
                <Text className={`text-[13px] font-normal leading-[18px] ${isDark ? "text-white/70" : "text-[#1C1C1E]/70"}`}>
                    {Math.round(certainty * 100)}% Wahrscheinlichkeit
                </Text>
            </View>
        );
    }

    return null;
}

function PlanCard({ plan }: { plan: Plan }) {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";

    const handlePressIn = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Animated.spring(scaleAnim, {
            toValue: 0.98,
            useNativeDriver: true,
            tension: 150,
            friction: 8,
        }).start();
    }, [scaleAnim]);

    const handlePressOut = useCallback(() => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 150,
            friction: 8,
        }).start();
    }, [scaleAnim]);

    const activityId = getActivityIdFromPlan(plan);
    const title = derivePlanTitle(plan);
    const gradient = getActivityGradientForMode(activityId, isDark);
    const icon = activityId ? getActivityIcon(activityId) : undefined;
    const iconColor = activityId ? getActivityIconColor(activityId) : undefined;

    return (
        <Animated.View
            style={{
                transform: [{ scale: scaleAnim }],
            }}
            className="mb-4"
        >
            <Pressable
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                className="rounded-[20px]"
            >
                <View
                    className="rounded-[20px] overflow-visible"
                    style={{
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.12,
                        shadowRadius: 8,
                        elevation: 4,
                    }}
                >
                    <LinearGradient
                        colors={gradient}
                        start={{ x: 0, y: 1 }}
                        end={{ x: 1, y: 0 }}
                        className="rounded-[20px] p-6 relative overflow-hidden"
                    >
                        {/* Large background icon */}
                        {icon && iconColor && (
                            <View className="absolute -top-4 -right-4 opacity-35 z-0">
                                <Icon
                                    name={icon}
                                    size={120}
                                    color={iconColor}
                                />
                            </View>
                        )}

                        {/* Time chip */}
                        {plan.when && <PlanTimeChip when={plan.when} isDark={isDark} certainty={plan.certainty} />}

                        {/* Content */}
                        <View className="relative z-10">
                            <View className="mb-4">
                                <PlanTitle title={title} isDark={isDark} />
                                {plan.where && <PlanLocationView where={plan.where} isDark={isDark} />}
                            </View>

                            {plan.who && <PlanParticipants who={plan.who} isDark={isDark} />}
                            {typeof plan.certainty === "number" && (
                                <PlanStatus certainty={plan.certainty} isDark={isDark} when={plan.when} />
                            )}
                        </View>
                    </LinearGradient>
                </View>
            </Pressable>
        </Animated.View>
    );
}
