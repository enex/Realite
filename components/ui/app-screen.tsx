import { useColor } from "@/hooks/use-color";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AppScreen({ children }: { children: React.ReactNode }) {
    const backgroundColor = useColor("background");
    return (
        <View style={{ flex: 1, backgroundColor }}>
            {children}
        </View>
    )
}


export function AppScreenScrollableContent({
    children,
    noHorizontalPadding = false,
    withTopInset = true,
    ...props
}: {
    noHorizontalPadding?: boolean,
    withTopInset?: boolean,
    children: React.ReactNode
} & Partial<React.ComponentProps<typeof ScrollView>>) {
    const insets = useSafeAreaInsets();
    return (
        <ScrollView
            contentInsetAdjustmentBehavior="always"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
                {
                    padding: noHorizontalPadding ? 0 : 16,
                    paddingTop: (withTopInset ? insets.top : 0) + 16,
                },
                props.contentContainerStyle,
            ]}
            {...props}
        >
            {children}
        </ScrollView>
    )
}
