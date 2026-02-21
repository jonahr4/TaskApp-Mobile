import { useState, useEffect, useCallback, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    Linking,
    Modal,
    Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/hooks/useAuth";
import { useTaskGroups } from "@/hooks/useTaskGroups";
import { useTasks } from "@/hooks/useTasks";
import { getOrCreateCalendarToken } from "@/lib/firestore";
import { Colors, Spacing, Radius, FontSize } from "@/lib/theme";

const BASE_URL = "https://the-task-app.vercel.app";

type Props = {
    visible: boolean;
    onClose: () => void;
};

export function CalendarFeedSheet({ visible, onClose }: Props) {
    const { user } = useAuth();
    const { groups } = useTaskGroups(user?.uid);
    const { tasks } = useTasks(user?.uid);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());

    // Compute per-group task counts
    const groupCounts = useMemo(() => {
        const counts = new Map<string, { total: number; active: number; completed: number }>();
        for (const t of tasks) {
            const gid = t.groupId || "";
            const prev = counts.get(gid) || { total: 0, active: 0, completed: 0 };
            prev.total += 1;
            if (t.completed) prev.completed += 1;
            else prev.active += 1;
            counts.set(gid, prev);
        }
        return counts;
    }, [tasks]);

    // Fetch or create the calendar token when the sheet opens
    useEffect(() => {
        if (visible && user && !token) {
            setLoading(true);
            getOrCreateCalendarToken(user.uid)
                .then(setToken)
                .catch(() => Alert.alert("Error", "Could not generate calendar token."))
                .finally(() => setLoading(false));
        }
    }, [visible, user, token]);

    // Reset selection when sheet closes
    useEffect(() => {
        if (!visible) {
            setSelectedGroups(new Set());
        }
    }, [visible]);

    const allGroups = [
        { id: "", name: "General Tasks", color: "#64748b" },
        ...groups.map((g) => ({ id: g.id, name: g.name, color: g.color || "#6366f1" })),
    ];

    const toggleGroup = (groupId: string) => {
        setSelectedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(groupId)) next.delete(groupId);
            else next.add(groupId);
            return next;
        });
    };

    const openWebcal = useCallback((url: string) => {
        // Convert https:// to webcal:// for iOS Calendar subscription
        const webcalUrl = url.replace(/^https?:\/\//, "webcal://");

        Alert.alert(
            "Subscribe to Calendar",
            "This will open your Calendar app to subscribe to this feed. Your tasks with due dates will appear as calendar events.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Open Calendar",
                    onPress: async () => {
                        try {
                            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            const supported = await Linking.canOpenURL(webcalUrl);
                            if (supported) {
                                await Linking.openURL(webcalUrl);
                            } else {
                                // Fallback: try opening the https URL
                                await Linking.openURL(url);
                            }
                        } catch {
                            Alert.alert("Error", "Could not open Calendar app.");
                        }
                    },
                },
            ]
        );
    }, []);

    const handleSubscribeAll = () => {
        if (!token) return;
        openWebcal(`${BASE_URL}/api/ical/${token}`);
    };

    const handleSubscribeGroups = () => {
        if (!token || selectedGroups.size === 0) return;
        const groupsParam = Array.from(selectedGroups).join(",");
        openWebcal(`${BASE_URL}/api/ical/${token}?groups=${encodeURIComponent(groupsParam)}`);
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={styles.sheet}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Ionicons name="calendar-outline" size={20} color={Colors.light.accent} />
                        <Text style={styles.headerTitle}>Calendar Feed</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="close-circle" size={26} color={Colors.light.textTertiary} />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={Colors.light.accent} />
                        <Text style={styles.loadingText}>Generating calendar link...</Text>
                    </View>
                ) : (
                    <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 40 }}>
                        {/* ── All Tasks ── */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>All Tasks</Text>
                            <Text style={styles.sectionDesc}>
                                Subscribe to see all your tasks with due dates in your calendar app.
                            </Text>
                            <TouchableOpacity
                                style={styles.subscribeBtn}
                                onPress={handleSubscribeAll}
                                activeOpacity={0.85}
                            >
                                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                                <Text style={styles.subscribeBtnText}>Subscribe to All Tasks</Text>
                            </TouchableOpacity>
                        </View>

                        {/* ── Divider ── */}
                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>OR</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* ── Per-Group Feeds ── */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Per-Group Feeds</Text>
                            <Text style={styles.sectionDesc}>
                                Create separate feeds for specific groups. This lets you assign different colors to each group in your Calendar app.
                            </Text>

                            <View style={styles.groupList}>
                                {allGroups.map((g) => {
                                    const isSelected = selectedGroups.has(g.id);
                                    const counts = groupCounts.get(g.id) || { total: 0, active: 0, completed: 0 };
                                    return (
                                        <TouchableOpacity
                                            key={g.id}
                                            style={[styles.groupRow, isSelected && styles.groupRowActive]}
                                            onPress={() => toggleGroup(g.id)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                                                {isSelected && (
                                                    <Ionicons name="checkmark" size={12} color="#fff" />
                                                )}
                                            </View>
                                            <View style={[styles.groupDot, { backgroundColor: g.color }]} />
                                            <Text style={styles.groupName} numberOfLines={1}>{g.name}</Text>
                                            <View style={styles.countPills}>
                                                <View style={styles.countPill}>
                                                    <Text style={styles.countPillText}>{counts.total}</Text>
                                                </View>
                                                <View style={[styles.countPill, styles.countPillActive]}>
                                                    <Text style={[styles.countPillText, styles.countPillActiveText]}>{counts.active}</Text>
                                                </View>
                                                <View style={[styles.countPill, styles.countPillDone]}>
                                                    <Text style={[styles.countPillText, styles.countPillDoneText]}>{counts.completed}</Text>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.subscribeBtn,
                                    selectedGroups.size === 0 && styles.subscribeBtnDisabled,
                                ]}
                                onPress={handleSubscribeGroups}
                                disabled={selectedGroups.size === 0}
                                activeOpacity={0.85}
                            >
                                <Ionicons name="link-outline" size={18} color="#fff" />
                                <Text style={styles.subscribeBtnText}>
                                    Subscribe to {selectedGroups.size || ""} {selectedGroups.size === 1 ? "Group" : selectedGroups.size > 1 ? "Groups" : "Selected Groups"}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* ── Info note ── */}
                        <View style={styles.infoCard}>
                            <Ionicons name="information-circle-outline" size={18} color={Colors.light.accent} />
                            <Text style={styles.infoText}>
                                Calendar feeds auto-refresh. Completed tasks will show a ✅ checkmark. Only tasks with due dates appear in the feed.
                            </Text>
                        </View>
                    </ScrollView>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    sheet: {
        flex: 1,
        backgroundColor: Colors.light.bg,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: Spacing.xl,
        paddingTop: 20,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.borderLight,
        backgroundColor: Colors.light.bgCard,
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    headerTitle: {
        fontSize: FontSize.lg,
        fontWeight: "700",
        color: Colors.light.textPrimary,
        letterSpacing: -0.3,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 12,
    },
    loadingText: {
        fontSize: FontSize.sm,
        color: Colors.light.textTertiary,
    },
    body: {
        flex: 1,
        padding: Spacing.xl,
    },
    // ── Sections ──
    section: {
        gap: 10,
    },
    sectionTitle: {
        fontSize: FontSize.md,
        fontWeight: "600",
        color: Colors.light.textPrimary,
    },
    sectionDesc: {
        fontSize: FontSize.sm,
        color: Colors.light.textTertiary,
        lineHeight: 18,
    },
    subscribeBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: Colors.light.accent,
        paddingVertical: 13,
        borderRadius: Radius.md,
        marginTop: 4,
    },
    subscribeBtnText: {
        color: "#fff",
        fontSize: FontSize.sm,
        fontWeight: "600",
    },
    subscribeBtnDisabled: {
        opacity: 0.35,
    },
    // ── Divider ──
    divider: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginVertical: Spacing.lg,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: Colors.light.borderLight,
    },
    dividerText: {
        fontSize: 11,
        fontWeight: "600",
        color: Colors.light.textTertiary,
        letterSpacing: 1,
    },
    // ── Group list ──
    groupList: {
        backgroundColor: Colors.light.bgCard,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
        overflow: "hidden",
    },
    groupRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: Spacing.md,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.light.borderLight,
    },
    groupRowActive: {
        backgroundColor: Colors.light.accentLight,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 5,
        borderWidth: 1.5,
        borderColor: Colors.light.textTertiary,
        justifyContent: "center",
        alignItems: "center",
    },
    checkboxActive: {
        backgroundColor: Colors.light.accent,
        borderColor: Colors.light.accent,
    },
    groupDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    groupName: {
        flex: 1,
        fontSize: FontSize.sm,
        color: Colors.light.textPrimary,
    },
    // ── Count pills ──
    countPills: {
        flexDirection: "row",
        gap: 4,
    },
    countPill: {
        minWidth: 20,
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 8,
        backgroundColor: Colors.light.borderLight,
        alignItems: "center",
    },
    countPillText: {
        fontSize: 11,
        fontWeight: "600",
        color: Colors.light.textTertiary,
    },
    countPillActive: {
        backgroundColor: "rgba(59,130,246,0.12)",
    },
    countPillActiveText: {
        color: "#3b82f6",
    },
    countPillDone: {
        backgroundColor: "rgba(34,197,94,0.12)",
    },
    countPillDoneText: {
        color: "#22c55e",
    },
    // ── Info card ──
    infoCard: {
        flexDirection: "row",
        gap: 10,
        marginTop: Spacing.xl,
        padding: Spacing.md,
        backgroundColor: Colors.light.accentLight,
        borderRadius: Radius.md,
    },
    infoText: {
        flex: 1,
        fontSize: FontSize.xs,
        color: Colors.light.textSecondary,
        lineHeight: 16,
    },
});
