import { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Switch,
    Alert,
    Modal,
    Platform,
    TextInput,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/hooks/useAuth";
import { useTaskGroups } from "@/hooks/useTaskGroups";
import { useTasks } from "@/hooks/useTasks";
import { Colors, Spacing, Radius, FontSize } from "@/lib/theme";
import {
    NotificationSettings,
    DEFAULT_SETTINGS,
    REMINDER_OPTIONS,
    loadSettings,
    saveSettings,
    requestPermissions,
    rescheduleAllReminders,
    setupNotificationChannel,
    formatMinutes,
} from "@/lib/notifications";

type Props = {
    visible: boolean;
    onClose: () => void;
};

export function NotificationSettingsSheet({ visible, onClose }: Props) {
    const { user } = useAuth();
    const { groups } = useTaskGroups(user?.uid);
    const { tasks } = useTasks(user?.uid);
    const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
    const [loaded, setLoaded] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showReminderPicker, setShowReminderPicker] = useState(false);
    const [customValue, setCustomValue] = useState("");
    const [customUnit, setCustomUnit] = useState<"min" | "hr" | "day">("min");

    // Load settings when sheet opens
    useEffect(() => {
        if (visible) {
            loadSettings().then((s) => {
                setSettings(s);
                setLoaded(true);
            });
        }
    }, [visible]);

    const allGroups = [
        { id: "", name: "General Tasks", color: "#64748b" },
        ...groups.map((g) => ({ id: g.id, name: g.name, color: g.color || "#6366f1" })),
    ];

    const updateAndSave = useCallback(
        async (updates: Partial<NotificationSettings>) => {
            const next = { ...settings, ...updates };
            setSettings(next);
            await saveSettings(next);
            // Build group map and reschedule
            const groupMap: Record<string, string> = {};
            const colorMap: Record<string, string> = {};
            for (const g of groups) {
                groupMap[g.id] = g.name;
                if (g.color) colorMap[g.id] = g.color;
            }
            await rescheduleAllReminders(tasks, next, groupMap, colorMap);
        },
        [settings, tasks, groups]
    );

    const handleMasterToggle = async (enabled: boolean) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (enabled) {
            const granted = await requestPermissions();
            if (!granted) {
                Alert.alert(
                    "Notifications Disabled",
                    "Please enable notifications in Settings to receive task reminders.",
                    [{ text: "OK" }]
                );
                return;
            }
            await setupNotificationChannel();
        }
        await updateAndSave({ enabled });
    };

    const toggleGroupNotification = (groupId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // If switching from "all groups" mode, pre-populate with all group IDs then toggle this one
        if (settings.allGroupsEnabled) {
            const allIds = allGroups.map((g) => g.id);
            const next = allIds.filter((id) => id !== groupId);
            updateAndSave({ enabledGroupIds: next, allGroupsEnabled: false });
            return;
        }
        const current = new Set(settings.enabledGroupIds);
        if (current.has(groupId)) {
            current.delete(groupId);
        } else {
            current.add(groupId);
        }
        updateAndSave({ enabledGroupIds: Array.from(current), allGroupsEnabled: false });
    };

    const toggleAllGroups = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (settings.allGroupsEnabled) {
            // Switch to individual mode — pre-select all so user can deselect specific ones
            const allIds = allGroups.map((g) => g.id);
            updateAndSave({ allGroupsEnabled: false, enabledGroupIds: allIds });
        } else {
            updateAndSave({ allGroupsEnabled: true, enabledGroupIds: [] });
        }
    };

    const handleDailySummaryTimeChange = (_event: DateTimePickerEvent, date?: Date) => {
        if (date) {
            updateAndSave({
                dailySummaryHour: date.getHours(),
                dailySummaryMinute: date.getMinutes(),
            });
        }
        if (Platform.OS === "android") setShowTimePicker(false);
    };

    const summaryTimeDate = new Date();
    summaryTimeDate.setHours(settings.dailySummaryHour, settings.dailySummaryMinute, 0, 0);

    const formatTime12 = (h: number, m: number) => {
        const p = h >= 12 ? "PM" : "AM";
        return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${p}`;
    };

    const isPreset = REMINDER_OPTIONS.some((o) => o.value === settings.reminderMinutes);
    const currentReminderLabel = isPreset
        ? REMINDER_OPTIONS.find((o) => o.value === settings.reminderMinutes)!.label
        : `Custom: ${formatMinutes(settings.reminderMinutes)} before`;

    const applyCustomTime = () => {
        const num = parseInt(customValue, 10);
        if (!num || num <= 0) return;
        const multiplier = customUnit === "day" ? 1440 : customUnit === "hr" ? 60 : 1;
        const totalMinutes = num * multiplier;
        updateAndSave({ reminderMinutes: totalMinutes });
        setShowReminderPicker(false);
        setCustomValue("");
    };

    if (!loaded) return null;

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
                        <Ionicons name="notifications-outline" size={20} color={Colors.light.accent} />
                        <Text style={styles.headerTitle}>Notification Settings</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="close-circle" size={26} color={Colors.light.textTertiary} />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 50 }}>
                    {/* ── Master Toggle ── */}
                    <View style={styles.section}>
                        <View style={styles.toggleRow}>
                            <View style={styles.toggleInfo}>
                                <Text style={styles.toggleLabel}>Enable Notifications</Text>
                                <Text style={styles.toggleDesc}>
                                    Get reminded about upcoming tasks
                                </Text>
                            </View>
                            <Switch
                                value={settings.enabled}
                                onValueChange={handleMasterToggle}
                                trackColor={{ false: Colors.light.borderLight, true: Colors.light.accent + "60" }}
                                thumbColor={settings.enabled ? Colors.light.accent : "#ccc"}
                            />
                        </View>
                    </View>

                    {settings.enabled && (
                        <>
                            {/* ── Reminder Timing ── */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Reminder Timing</Text>
                                <Text style={styles.sectionDesc}>
                                    When to send the notification before a task is due
                                </Text>
                                <TouchableOpacity
                                    style={styles.pickerBtn}
                                    onPress={() => setShowReminderPicker(!showReminderPicker)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="time-outline" size={16} color={Colors.light.accent} />
                                    <Text style={styles.pickerBtnText}>{currentReminderLabel}</Text>
                                    <Ionicons
                                        name={showReminderPicker ? "chevron-up" : "chevron-down"}
                                        size={14}
                                        color={Colors.light.textTertiary}
                                    />
                                </TouchableOpacity>
                                {showReminderPicker && (
                                    <View style={styles.optionsList}>
                                        {REMINDER_OPTIONS.map((opt) => (
                                            <TouchableOpacity
                                                key={opt.value}
                                                style={[
                                                    styles.optionRow,
                                                    settings.reminderMinutes === opt.value && styles.optionRowActive,
                                                ]}
                                                onPress={() => {
                                                    updateAndSave({ reminderMinutes: opt.value });
                                                    setShowReminderPicker(false);
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <Text
                                                    style={[
                                                        styles.optionText,
                                                        settings.reminderMinutes === opt.value && styles.optionTextActive,
                                                    ]}
                                                >
                                                    {opt.label}
                                                </Text>
                                                {settings.reminderMinutes === opt.value && (
                                                    <Ionicons name="checkmark" size={16} color={Colors.light.accent} />
                                                )}
                                            </TouchableOpacity>
                                        ))}

                                        {/* Custom time input */}
                                        <View style={styles.customTimeRow}>
                                            <Text style={styles.customTimeLabel}>Custom:</Text>
                                            <TextInput
                                                style={styles.customTimeInput}
                                                value={customValue}
                                                onChangeText={setCustomValue}
                                                placeholder="e.g. 10"
                                                placeholderTextColor={Colors.light.textTertiary}
                                                keyboardType="number-pad"
                                                returnKeyType="done"
                                            />
                                            <View style={styles.unitRow}>
                                                {(["min", "hr", "day"] as const).map((u) => (
                                                    <TouchableOpacity
                                                        key={u}
                                                        style={[
                                                            styles.unitBtn,
                                                            customUnit === u && styles.unitBtnActive,
                                                        ]}
                                                        onPress={() => setCustomUnit(u)}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.unitBtnText,
                                                                customUnit === u && styles.unitBtnTextActive,
                                                            ]}
                                                        >
                                                            {u}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                            <TouchableOpacity
                                                style={[styles.applyBtn, !customValue && { opacity: 0.4 }]}
                                                onPress={applyCustomTime}
                                                disabled={!customValue}
                                                activeOpacity={0.8}
                                            >
                                                <Ionicons name="checkmark-circle" size={24} color={Colors.light.accent} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}
                            </View>

                            {/* ── Group Notifications ── */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Notify by Group</Text>
                                <Text style={styles.sectionDesc}>
                                    Choose which task groups trigger notifications
                                </Text>

                                {/* All groups toggle */}
                                <TouchableOpacity
                                    style={[styles.groupRow, settings.allGroupsEnabled && styles.groupRowActive]}
                                    onPress={toggleAllGroups}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.radio, settings.allGroupsEnabled && styles.radioActive]}>
                                        {settings.allGroupsEnabled && <View style={styles.radioInner} />}
                                    </View>
                                    <Ionicons name="layers-outline" size={16} color={Colors.light.textPrimary} />
                                    <Text style={styles.groupName}>All Groups</Text>
                                </TouchableOpacity>

                                <View style={styles.groupList}>
                                    {allGroups.map((g) => {
                                        const isEnabled = settings.allGroupsEnabled || settings.enabledGroupIds.includes(g.id);
                                        return (
                                            <TouchableOpacity
                                                key={g.id}
                                                style={[styles.groupRow, !settings.allGroupsEnabled && isEnabled && styles.groupRowActive]}
                                                onPress={() => toggleGroupNotification(g.id)}
                                                activeOpacity={0.7}
                                            >
                                                <View
                                                    style={[
                                                        styles.checkbox,
                                                        isEnabled && styles.checkboxActive,
                                                        settings.allGroupsEnabled && { opacity: 0.5 },
                                                    ]}
                                                >
                                                    {isEnabled && <Ionicons name="checkmark" size={12} color="#fff" />}
                                                </View>
                                                <View style={[styles.groupDot, { backgroundColor: g.color }]} />
                                                <Text style={[styles.groupName, settings.allGroupsEnabled && { opacity: 0.5 }]}>
                                                    {g.name}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* ── Daily Summary ── */}
                            <View style={styles.section}>
                                <View style={styles.toggleRow}>
                                    <View style={styles.toggleInfo}>
                                        <Text style={styles.toggleLabel}>Daily Summary</Text>
                                        <Text style={styles.toggleDesc}>
                                            Get a daily overview of tasks due today
                                        </Text>
                                    </View>
                                    <Switch
                                        value={settings.dailySummaryEnabled}
                                        onValueChange={(v) => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            updateAndSave({ dailySummaryEnabled: v });
                                        }}
                                        trackColor={{ false: Colors.light.borderLight, true: Colors.light.accent + "60" }}
                                        thumbColor={settings.dailySummaryEnabled ? Colors.light.accent : "#ccc"}
                                    />
                                </View>
                                {settings.dailySummaryEnabled && (
                                    <>
                                        <TouchableOpacity
                                            style={styles.pickerBtn}
                                            onPress={() => setShowTimePicker(!showTimePicker)}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons name="alarm-outline" size={16} color={Colors.light.accent} />
                                            <Text style={styles.pickerBtnText}>
                                                Daily at {formatTime12(settings.dailySummaryHour, settings.dailySummaryMinute)}
                                            </Text>
                                            <Ionicons
                                                name={showTimePicker ? "chevron-up" : "chevron-down"}
                                                size={14}
                                                color={Colors.light.textTertiary}
                                            />
                                        </TouchableOpacity>
                                        {showTimePicker && (
                                            <View style={styles.timePickerContainer}>
                                                <DateTimePicker
                                                    value={summaryTimeDate}
                                                    mode="time"
                                                    display="spinner"
                                                    onChange={handleDailySummaryTimeChange}
                                                    themeVariant="light"
                                                />
                                            </View>
                                        )}
                                    </>
                                )}
                            </View>

                            {/* ── Location Reminders (WIP) ── */}
                            <View style={styles.section}>
                                <View style={styles.toggleRow}>
                                    <View style={styles.toggleInfo}>
                                        <View style={styles.wipRow}>
                                            <Text style={styles.toggleLabel}>Location Reminders</Text>
                                            <View style={styles.wipBadge}>
                                                <Text style={styles.wipBadgeText}>Coming Soon</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.toggleDesc}>
                                            Get notified when you're near a task's location
                                        </Text>
                                    </View>
                                    <Switch
                                        value={settings.locationRemindersEnabled}
                                        onValueChange={(v) => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            if (v) {
                                                Alert.alert(
                                                    "Coming Soon",
                                                    "Location-based reminders are still in development. We'll notify you when this feature is ready!",
                                                    [{ text: "OK" }]
                                                );
                                            }
                                            updateAndSave({ locationRemindersEnabled: v });
                                        }}
                                        trackColor={{ false: Colors.light.borderLight, true: "#f59e0b60" }}
                                        thumbColor={settings.locationRemindersEnabled ? "#f59e0b" : "#ccc"}
                                    />
                                </View>
                                <View style={styles.wipInfoCard}>
                                    <Ionicons name="location-outline" size={16} color="#f59e0b" />
                                    <Text style={styles.wipInfoText}>
                                        When enabled, tasks with a location field will trigger a reminder when you arrive nearby. This feature is being built and will work in a future update.
                                    </Text>
                                </View>
                            </View>
                        </>
                    )}
                </ScrollView>
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
    body: {
        flex: 1,
        padding: Spacing.xl,
    },
    // ── Sections ──
    section: {
        marginBottom: Spacing.xl,
        gap: 10,
    },
    sectionTitle: {
        fontSize: FontSize.md,
        fontWeight: "600",
        color: Colors.light.textPrimary,
    },
    sectionDesc: {
        fontSize: FontSize.xs,
        color: Colors.light.textTertiary,
        lineHeight: 16,
    },
    // ── Toggle row ──
    toggleRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: Colors.light.bgCard,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
        padding: Spacing.md,
    },
    toggleInfo: {
        flex: 1,
        marginRight: Spacing.md,
    },
    toggleLabel: {
        fontSize: FontSize.sm,
        fontWeight: "600",
        color: Colors.light.textPrimary,
    },
    toggleDesc: {
        fontSize: FontSize.xs,
        color: Colors.light.textTertiary,
        marginTop: 2,
        lineHeight: 15,
    },
    // ── Picker button ──
    pickerBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: Colors.light.bgCard,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
        paddingHorizontal: Spacing.md,
        paddingVertical: 12,
    },
    pickerBtnText: {
        flex: 1,
        fontSize: FontSize.sm,
        color: Colors.light.textPrimary,
    },
    // ── Options list ──
    optionsList: {
        backgroundColor: Colors.light.bgCard,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
        overflow: "hidden",
    },
    optionRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: Spacing.md,
        paddingVertical: 11,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.light.borderLight,
    },
    optionRowActive: {
        backgroundColor: Colors.light.accentLight,
    },
    optionText: {
        fontSize: FontSize.sm,
        color: Colors.light.textPrimary,
    },
    optionTextActive: {
        fontWeight: "600",
        color: Colors.light.accent,
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
        paddingVertical: 11,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.light.borderLight,
    },
    groupRowActive: {
        backgroundColor: Colors.light.accentLight,
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: Colors.light.textTertiary,
        justifyContent: "center",
        alignItems: "center",
    },
    radioActive: {
        borderColor: Colors.light.accent,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.light.accent,
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
    // ── Time picker ──
    timePickerContainer: {
        backgroundColor: Colors.light.bgCard,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
        overflow: "hidden",
    },
    // ── WIP location ──
    wipRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    wipBadge: {
        backgroundColor: "#fef3c7",
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
    },
    wipBadgeText: {
        fontSize: 9,
        fontWeight: "700",
        color: "#d97706",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    wipInfoCard: {
        flexDirection: "row",
        gap: 10,
        padding: Spacing.md,
        backgroundColor: "#fffbeb",
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: "#fde68a",
    },
    wipInfoText: {
        flex: 1,
        fontSize: FontSize.xs,
        color: "#92400e",
        lineHeight: 16,
    },
    // ── Custom time input ──
    customTimeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: Spacing.md,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: Colors.light.borderLight,
        backgroundColor: Colors.light.bg,
    },
    customTimeLabel: {
        fontSize: FontSize.xs,
        fontWeight: "600",
        color: Colors.light.textSecondary,
    },
    customTimeInput: {
        width: 56,
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: Radius.sm,
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
        fontSize: FontSize.sm,
        color: Colors.light.textPrimary,
        textAlign: "center",
        backgroundColor: "#fff",
    },
    unitRow: {
        flexDirection: "row",
        gap: 4,
    },
    unitBtn: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: Radius.sm,
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
        backgroundColor: "#fff",
    },
    unitBtnActive: {
        backgroundColor: Colors.light.accent,
        borderColor: Colors.light.accent,
    },
    unitBtnText: {
        fontSize: FontSize.xs,
        fontWeight: "600",
        color: Colors.light.textSecondary,
    },
    unitBtnTextActive: {
        color: "#fff",
    },
    applyBtn: {
        padding: 2,
    },
});
