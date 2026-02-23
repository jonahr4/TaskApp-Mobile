import { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, type ThemeMode } from "@/hooks/useTheme";
import { Colors, Spacing, Radius, FontSize, Shadows } from "@/lib/theme";

type Option = {
    key: ThemeMode;
    label: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
};

const OPTIONS: Option[] = [
    {
        key: "auto",
        label: "Automatic",
        description: "Follows your phone's system setting",
        icon: "phone-portrait-outline",
    },
    {
        key: "light",
        label: "Light",
        description: "Always use the light appearance",
        icon: "sunny-outline",
    },
    {
        key: "dark",
        label: "Dark",
        description: "Always use the dark appearance",
        icon: "moon-outline",
    },
];

function makeStyles(C: typeof Colors.light) { return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: C.bg,
        },
        header: {
            paddingHorizontal: Spacing.xl,
            paddingTop: Platform.OS === "ios" ? 62 : 48,
            paddingBottom: Spacing.lg,
            backgroundColor: C.bgCard,
        },
        accentLine: {
            height: 2.5,
            backgroundColor: C.accent,
            opacity: 0.12,
        },
        headerTitle: {
            fontSize: FontSize.title,
            fontWeight: "800",
            color: C.textPrimary,
            letterSpacing: -0.5,
        },
        body: {
            flex: 1,
            padding: Spacing.lg,
        },
        sectionCard: {
            backgroundColor: C.bgCard,
            borderRadius: Radius.xl,
            padding: Spacing.xl,
            marginBottom: Spacing.lg,
            ...Shadows.md,
        },
        sectionHeader: {
            flexDirection: "row",
            alignItems: "center",
            gap: Spacing.sm,
            marginBottom: Spacing.xs,
        },
        sectionTitle: {
            fontSize: FontSize.lg,
            fontWeight: "700",
            color: C.textPrimary,
        },
        sectionSubtitle: {
            fontSize: FontSize.sm,
            color: C.textTertiary,
            marginBottom: Spacing.lg,
        },
        optionsGroup: {
            borderRadius: Radius.lg,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: C.borderLight,
        },
        optionRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: Spacing.md,
            paddingVertical: Spacing.md,
            paddingHorizontal: Spacing.lg,
            backgroundColor: C.bg,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: C.borderLight,
        },
        optionRowActive: {
            backgroundColor: C.accentLight,
        },
        optionRowLast: {
            borderBottomWidth: 0,
        },
        optionIcon: {
            width: 38,
            height: 38,
            borderRadius: Radius.md,
            backgroundColor: C.bgElevated,
            justifyContent: "center",
            alignItems: "center",
            borderWidth: 1,
            borderColor: C.borderLight,
        },
        optionIconActive: {
            backgroundColor: C.accent,
            borderColor: C.accent,
        },
        optionText: {
            flex: 1,
        },
        optionLabel: {
            fontSize: FontSize.md,
            fontWeight: "600",
            color: C.textPrimary,
        },
        optionLabelActive: {
            color: C.accent,
        },
        optionDesc: {
            fontSize: FontSize.xs,
            color: C.textTertiary,
            marginTop: 2,
        },
    });
}

export default function SettingsScreen() {
    const { themeMode, setThemeMode, isDark } = useTheme();
    const C = isDark ? Colors.dark : Colors.light;

    const styles = useMemo(() => makeStyles(C), [C]);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Settings</Text>
            </View>
            <View style={styles.accentLine} />

            <ScrollView
                style={styles.body}
                contentContainerStyle={{ paddingBottom: 60 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Appearance section */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="color-palette-outline" size={18} color={C.accent} />
                        <Text style={styles.sectionTitle}>Appearance</Text>
                    </View>
                    <Text style={styles.sectionSubtitle}>
                        Choose how the app looks on your device
                    </Text>

                    <View style={styles.optionsGroup}>
                        {OPTIONS.map((opt, i) => {
                            const isActive = themeMode === opt.key;
                            return (
                                <TouchableOpacity
                                    key={opt.key}
                                    style={[
                                        styles.optionRow,
                                        isActive && styles.optionRowActive,
                                        i === OPTIONS.length - 1 && styles.optionRowLast,
                                    ]}
                                    onPress={() => setThemeMode(opt.key)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.optionIcon, isActive && styles.optionIconActive]}>
                                        <Ionicons
                                            name={opt.icon}
                                            size={20}
                                            color={isActive ? "#fff" : C.textSecondary}
                                        />
                                    </View>
                                    <View style={styles.optionText}>
                                        <Text style={[styles.optionLabel, isActive && styles.optionLabelActive]}>
                                            {opt.label}
                                        </Text>
                                        <Text style={styles.optionDesc}>{opt.description}</Text>
                                    </View>
                                    {isActive && (
                                        <Ionicons name="checkmark-circle" size={22} color={C.accent} />
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
