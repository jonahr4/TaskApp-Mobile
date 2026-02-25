import { useState, useMemo, useRef } from "react";
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    Keyboard,
    Platform,
    KeyboardAvoidingView,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/hooks/useAuth";
import { useTaskGroups } from "@/hooks/useTaskGroups";
import { useTasks } from "@/hooks/useTasks";
import { useTheme } from "@/hooks/useTheme";
import ScreenHeader from "@/components/ScreenHeader";
import { createTaskUnified } from "@/lib/crud";
import { Colors, Spacing, Radius, FontSize, Shadows } from "@/lib/theme";
import { QUADRANT_META } from "@/lib/types";
import type { Quadrant } from "@/lib/types";

type AiTask = {
    title: string;
    notes: string;
    dueDate: string | null;
    dueTime: string | null;
    priority: Quadrant;
    group: string | null;
    groupId: string | null;
    timeSource: "explicit" | "guessed" | "none";
};

const PRIORITY_OPTIONS: { key: Quadrant; label: string }[] = [
    { key: "DO", label: "Do First" },
    { key: "SCHEDULE", label: "Schedule" },
    { key: "DELEGATE", label: "Delegate" },
    { key: "DELETE", label: "Eliminate" },
];

function formatDisplayDate(dateStr: string | null): string {
    if (!dateStr) return "No date";
    const d = new Date(dateStr + "T12:00:00");
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDisplayTime(timeStr: string | null): string {
    if (!timeStr) return "No time";
    const [h, m] = timeStr.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return timeStr;
    const p = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${p}`;
}

function dateToYMD(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function dateToHM(d: Date): string {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function ymdToDate(ymd: string | null): Date {
    if (!ymd) return new Date();
    const d = new Date(ymd + "T12:00:00");
    return isNaN(d.getTime()) ? new Date() : d;
}
function hmToDate(hm: string | null): Date {
    const now = new Date();
    if (!hm) return now;
    const [h, m] = hm.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return now;
    now.setHours(h, m, 0, 0);
    return now;
}

// Picker state for native iOS pickers
type PickerState = {
    taskIdx: number;
    mode: "date" | "time";
} | null;

function makeStyles(C: typeof Colors.light) { return StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: C.bg,
    },
    header: {
        paddingHorizontal: Spacing.xl,
        paddingTop: 60,
        paddingBottom: Spacing.md,
        backgroundColor: C.bgCard,
        ...Shadows.sm,
    },
    headerTitle: {
        fontSize: FontSize.title,
        fontWeight: "800",
        color: C.textPrimary,
        letterSpacing: -0.5,
    },
    headerSub: {
        fontSize: FontSize.sm,
        color: C.textTertiary,
        marginTop: 2,
    },
    body: {
        flex: 1,
        padding: Spacing.lg,
    },
    // ── Input card ──
    inputCard: {
        backgroundColor: C.bgCard,
        borderRadius: Radius.xl,
        padding: Spacing.xl,
        borderWidth: 0,
        ...Shadows.md,
    },
    fieldLabel: {
        fontSize: 11,
        fontWeight: "600",
        color: C.textSecondary,
        letterSpacing: 0.8,
        marginBottom: 4,
        marginTop: 10,
    },
    textArea: {
        backgroundColor: C.bg,
        borderWidth: 1,
        borderColor: C.borderLight,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        fontSize: FontSize.sm,
        color: C.textPrimary,
        minHeight: 90,
        textAlignVertical: "top",
    },
    parseRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        marginTop: Spacing.md,
        flexWrap: "wrap",
    },
    parseBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        backgroundColor: C.accent,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: Radius.md,
        ...Shadows.sm,
    },
    parseBtnText: {
        color: "#fff",
        fontSize: FontSize.sm,
        fontWeight: "600",
    },
    btnDisabled: {
        opacity: 0.4,
    },
    doneKeyboard: {
        padding: 4,
    },
    tzLabel: {
        fontSize: 11,
        color: C.textTertiary,
    },
    successBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: Spacing.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        backgroundColor: C.success + "15",
        borderRadius: Radius.md,
    },
    successText: {
        fontSize: FontSize.sm,
        color: C.success,
        fontWeight: "600",
    },
    // ── Results section ──
    resultsSection: {
        marginTop: Spacing.xl,
    },
    resultsSectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: Spacing.md,
    },
    resultsLabel: {
        fontSize: FontSize.sm,
        fontWeight: "600",
        color: C.textPrimary,
    },
    guessedBadge: {
        backgroundColor: "rgba(16,185,129,0.1)",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: Radius.full,
    },
    guessedBadgeText: {
        fontSize: 11,
        fontWeight: "600",
        color: "#059669",
    },
    // ── Task Card ──
    taskCard: {
        backgroundColor: C.bgCard,
        borderRadius: Radius.lg,
        padding: Spacing.xl,
        marginBottom: Spacing.md,
        borderWidth: 0,
        ...Shadows.sm,
    },
    taskCardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    taskLabel: {
        fontSize: FontSize.xs,
        fontWeight: "700",
        color: C.textSecondary,
    },
    taskCardBadges: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    guessedPill: {
        backgroundColor: "rgba(16,185,129,0.1)",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: Radius.full,
    },
    guessedPillText: {
        fontSize: 11,
        fontWeight: "600",
        color: "#059669",
    },
    fieldInput: {
        backgroundColor: C.bg,
        borderWidth: 1,
        borderColor: C.borderLight,
        borderRadius: Radius.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: 8,
        fontSize: FontSize.sm,
        color: C.textPrimary,
    },
    fieldTextArea: {
        minHeight: 48,
        textAlignVertical: "top",
    },
    fieldRow: {
        flexDirection: "row",
        gap: Spacing.sm,
    },
    fieldHalf: {
        flex: 1,
    },
    // ── Date/Time buttons ──
    dateBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: C.bg,
        borderWidth: 1,
        borderColor: C.borderLight,
        borderRadius: Radius.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: 9,
    },
    dateBtnActive: {
        borderColor: C.accent,
        backgroundColor: C.accentLight,
    },
    dateBtnText: {
        flex: 1,
        fontSize: FontSize.sm,
        color: C.textTertiary,
    },
    dateBtnTextActive: {
        color: C.textPrimary,
    },
    clearBtn: {
        alignSelf: "flex-start",
        marginTop: 2,
    },
    clearBtnText: {
        fontSize: 11,
        color: C.textTertiary,
    },
    pickerInline: {
        marginTop: 4,
        backgroundColor: C.bgCard,
        borderRadius: Radius.md,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: C.borderLight,
    },
    // ── Picker dropdown ──
    pickerBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: C.bg,
        borderWidth: 1,
        borderColor: C.borderLight,
        borderRadius: Radius.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: 8,
    },
    pickerDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    pickerText: {
        flex: 1,
        fontSize: FontSize.sm,
        color: C.textPrimary,
    },
    pickerDropdown: {
        position: "absolute",
        top: 52,
        left: 0,
        right: 0,
        backgroundColor: C.bgCard,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: C.borderLight,
        ...Shadows.lg,
        zIndex: 100,
    },
    pickerOption: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: Spacing.md,
        paddingVertical: 10,
    },
    pickerOptionActive: {
        backgroundColor: C.accentLight,
    },
    pickerOptionText: {
        fontSize: FontSize.sm,
        color: C.textPrimary,
    },
    // ── Bottom actions ──
    actionsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        flexWrap: "wrap",
        marginTop: Spacing.sm,
    },
    addTaskBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: C.borderLight,
    },
    addTaskText: {
        fontSize: FontSize.sm,
        color: C.accent,
        fontWeight: "500",
    },
    createBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        backgroundColor: C.accent,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: Radius.md,
        ...Shadows.sm,
    },
    createBtnText: {
        color: "#fff",
        fontSize: FontSize.sm,
        fontWeight: "600",
    },
    dismissBtn: {
        paddingHorizontal: 12,
        paddingVertical: 9,
    },
    dismissText: {
        fontSize: FontSize.sm,
        color: C.textTertiary,
        fontWeight: "500",
    },
});
}

export default function AiScreen() {
    const { colors: C, isDark } = useTheme();
    const styles = useMemo(() => makeStyles(C), [C]);
    const { user } = useAuth();
    const { groups } = useTaskGroups(user?.uid);
    const { tasks } = useTasks(user?.uid);

    const [text, setText] = useState("");
    const [parsing, setParsing] = useState(false);
    const [results, setResults] = useState<AiTask[]>([]);
    const [creating, setCreating] = useState(false);
    const [success, setSuccess] = useState("");
    const [showPriorityPicker, setShowPriorityPicker] = useState<number | null>(null);
    const [showGroupPicker, setShowGroupPicker] = useState<number | null>(null);
    const [dtPicker, setDtPicker] = useState<PickerState>(null);
    const scrollRef = useRef<ScrollView>(null);

    const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
    const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

    const handleParse = async () => {
        if (!text.trim()) return;
        Keyboard.dismiss();
        setParsing(true);
        setSuccess("");
        setShowPriorityPicker(null);
        setShowGroupPicker(null);
        setDtPicker(null);
        try {
            const apiUrl = process.env.EXPO_PUBLIC_AI_API_URL || "https://the-task-app.vercel.app/api/ai/parse";

            const res = await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: text.trim(),
                    today,
                    timezone,
                    groups: groups.map((g) => g.name),
                }),
            });

            const data = await res.json().catch(() => null);
            console.log("[AI] Response status:", res.status, "data:", JSON.stringify(data)?.slice(0, 300));

            if (!res.ok) {
                const errMsg = data?.error || "AI request failed";
                const detail = data?.detail ? `\n\nDetail: ${typeof data.detail === "string" ? data.detail.slice(0, 200) : JSON.stringify(data.detail).slice(0, 200)}` : "";
                throw new Error(`${errMsg}${detail}`);
            }

            if (data?.tasks && Array.isArray(data.tasks)) {
                const mappedTasks = data.tasks.map((t: AiTask) => {
                    let groupId: string | null = null;
                    if (t.group) {
                        const match = groups.find(
                            (g) => g.name.toLowerCase() === t.group!.toLowerCase()
                        );
                        if (match) groupId = match.id;
                    }
                    return { ...t, groupId };
                });
                setResults(mappedTasks);
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
            } else {
                throw new Error("AI returned no tasks. Raw: " + JSON.stringify(data)?.slice(0, 200));
            }
        } catch (err) {
            console.error("[AI] Parse error:", err);
            Alert.alert("AI Error", err instanceof Error ? err.message : "Failed to parse text with AI.");
        } finally {
            setParsing(false);
        }
    };

    const handleCreate = async () => {
        if (results.length === 0) return;
        setCreating(true);
        setSuccess("");
        try {
            let created = 0;
            for (const task of results) {
                if (!task.title.trim()) continue;
                const meta = QUADRANT_META[task.priority];
                await createTaskUnified(user?.uid, {
                    title: task.title.trim(),
                    notes: task.notes?.trim() || undefined,
                    dueDate: task.dueDate || null,
                    dueTime: task.dueTime || null,
                    urgent: meta.urgent,
                    important: meta.important,
                    groupId: task.groupId || groups[0]?.id || null,
                    completed: false,
                    order: tasks.length + created,
                    autoUrgentDays: null,
                    reminder: false,
                });
                created += 1;
            }
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setSuccess(created > 1 ? `${created} tasks created!` : "Task created!");
            setResults([]);
            setText("");
        } catch (err) {
            Alert.alert("Error", "Failed to create tasks.");
        } finally {
            setCreating(false);
        }
    };

    const updateTask = (index: number, updates: Partial<AiTask>) => {
        setResults((prev) =>
            prev.map((t, i) => (i === index ? { ...t, ...updates } : t))
        );
    };

    const removeTask = (index: number) => {
        setResults((prev) => prev.filter((_, i) => i !== index));
    };

    const addBlankTask = () => {
        if (results.length >= 5) return;
        setResults((prev) => [
            ...prev,
            {
                title: "",
                notes: "",
                dueDate: null,
                dueTime: null,
                priority: "DO" as Quadrant,
                group: null,
                groupId: null,
                timeSource: "none",
            },
        ]);
    };

    const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (!dtPicker || !selectedDate) {
            if (event.type === "dismissed") setDtPicker(null);
            return;
        }
        const { taskIdx, mode } = dtPicker;
        if (mode === "date") {
            updateTask(taskIdx, { dueDate: dateToYMD(selectedDate) });
        } else {
            updateTask(taskIdx, { dueTime: dateToHM(selectedDate) });
        }
        // On iOS inline picker, don't dismiss (user can keep adjusting)
        // On Android, dismiss after selection
        if (Platform.OS === "android") {
            setDtPicker(null);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <ScreenHeader title="AI Reminder" />
            <View style={{ paddingHorizontal: Spacing.xl, paddingBottom: Spacing.sm, backgroundColor: C.bgCard }}>
                <Text style={styles.headerSub}>
                    Type a reminder in plain English and turn it into a task.
                </Text>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={0}
            >
                <ScrollView
                    ref={scrollRef}
                    style={styles.body}
                    contentContainerStyle={{ paddingBottom: 80 }}
                    keyboardShouldPersistTaps="handled"
                    onScrollBeginDrag={() => {
                        setShowPriorityPicker(null);
                        setShowGroupPicker(null);
                    }}
                >
                    {/* Input Card */}
                    <View style={styles.inputCard}>
                        <Text style={styles.fieldLabel}>REMINDER TEXT</Text>
                        <TextInput
                            style={styles.textArea}
                            placeholder="I have a CS 505 midterm on the 21st, I need to buy groceries soon, and remind me to call dad today"
                            placeholderTextColor={C.textTertiary}
                            value={text}
                            onChangeText={setText}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            returnKeyType="done"
                            blurOnSubmit
                            onSubmitEditing={() => Keyboard.dismiss()}
                        />
                        <View style={styles.parseRow}>
                            <TouchableOpacity
                                style={[styles.parseBtn, (!text.trim() || parsing) && styles.btnDisabled]}
                                onPress={handleParse}
                                disabled={!text.trim() || parsing}
                                activeOpacity={0.85}
                            >
                                {parsing ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <>
                                        <Ionicons name="sparkles" size={14} color="#fff" />
                                        <Text style={styles.parseBtnText}>Parse with AI</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.doneKeyboard}
                                onPress={() => Keyboard.dismiss()}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="chevron-down-circle-outline" size={22} color={C.textTertiary} />
                            </TouchableOpacity>
                            <Text style={styles.tzLabel}>Timezone: {timezone}</Text>
                        </View>
                        {success !== "" && (
                            <View style={styles.successBanner}>
                                <Ionicons name="checkmark-circle" size={16} color={C.success} />
                                <Text style={styles.successText}>{success}</Text>
                            </View>
                        )}
                    </View>

                    {/* Results */}
                    {results.length > 0 && (
                        <View style={styles.resultsSection}>
                            <View style={styles.resultsSectionHeader}>
                                <Text style={styles.resultsLabel}>AI Result</Text>
                                {results.some((t) => t.timeSource === "guessed") && (
                                    <View style={styles.guessedBadge}>
                                        <Text style={styles.guessedBadgeText}>AI picked a time</Text>
                                    </View>
                                )}
                            </View>

                            {results.map((task, idx) => {
                                const meta = QUADRANT_META[task.priority];
                                const group = task.groupId
                                    ? groups.find((g) => g.id === task.groupId)
                                    : null;
                                const isDatePickerOpen = dtPicker?.taskIdx === idx && dtPicker?.mode === "date";
                                const isTimePickerOpen = dtPicker?.taskIdx === idx && dtPicker?.mode === "time";

                                return (
                                    <View key={idx} style={styles.taskCard}>
                                        {/* Task header */}
                                        <View style={styles.taskCardHeader}>
                                            <Text style={styles.taskLabel}>Task {idx + 1}</Text>
                                            <View style={styles.taskCardBadges}>
                                                {task.timeSource === "guessed" && (
                                                    <View style={styles.guessedPill}>
                                                        <Text style={styles.guessedPillText}>Time guessed</Text>
                                                    </View>
                                                )}
                                                {results.length > 1 && (
                                                    <TouchableOpacity
                                                        onPress={() => removeTask(idx)}
                                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                    >
                                                        <Ionicons name="close-circle" size={18} color={C.textTertiary} />
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </View>

                                        {/* Title */}
                                        <Text style={styles.fieldLabel}>TITLE</Text>
                                        <TextInput
                                            style={styles.fieldInput}
                                            value={task.title}
                                            onChangeText={(v) => updateTask(idx, { title: v })}
                                            placeholder="Task title"
                                            placeholderTextColor={C.textTertiary}
                                        />

                                        {/* Notes */}
                                        <Text style={styles.fieldLabel}>NOTES</Text>
                                        <TextInput
                                            style={[styles.fieldInput, styles.fieldTextArea]}
                                            value={task.notes}
                                            onChangeText={(v) => updateTask(idx, { notes: v })}
                                            placeholder="Extra details"
                                            placeholderTextColor={C.textTertiary}
                                            multiline
                                            numberOfLines={2}
                                            textAlignVertical="top"
                                        />

                                        {/* Date + Time row — native iOS pickers */}
                                        <View style={styles.fieldRow}>
                                            <View style={styles.fieldHalf}>
                                                <Text style={styles.fieldLabel}>DUE DATE</Text>
                                                <TouchableOpacity
                                                    style={[styles.dateBtn, isDatePickerOpen && styles.dateBtnActive]}
                                                    onPress={() => {
                                                        setDtPicker(isDatePickerOpen ? null : { taskIdx: idx, mode: "date" });
                                                        setShowPriorityPicker(null);
                                                        setShowGroupPicker(null);
                                                    }}
                                                    activeOpacity={0.7}
                                                >
                                                    <Ionicons
                                                        name="calendar-outline"
                                                        size={14}
                                                        color={task.dueDate ? C.accent : C.textTertiary}
                                                    />
                                                    <Text style={[styles.dateBtnText, task.dueDate && styles.dateBtnTextActive]}>
                                                        {formatDisplayDate(task.dueDate)}
                                                    </Text>
                                                </TouchableOpacity>
                                                {task.dueDate && (
                                                    <TouchableOpacity
                                                        style={styles.clearBtn}
                                                        onPress={() => updateTask(idx, { dueDate: null })}
                                                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                                    >
                                                        <Text style={styles.clearBtnText}>Clear</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                            <View style={styles.fieldHalf}>
                                                <Text style={styles.fieldLabel}>TIME</Text>
                                                <TouchableOpacity
                                                    style={[styles.dateBtn, isTimePickerOpen && styles.dateBtnActive]}
                                                    onPress={() => {
                                                        setDtPicker(isTimePickerOpen ? null : { taskIdx: idx, mode: "time" });
                                                        setShowPriorityPicker(null);
                                                        setShowGroupPicker(null);
                                                    }}
                                                    activeOpacity={0.7}
                                                >
                                                    <Ionicons
                                                        name="time-outline"
                                                        size={14}
                                                        color={task.dueTime ? C.accent : C.textTertiary}
                                                    />
                                                    <Text style={[styles.dateBtnText, task.dueTime && styles.dateBtnTextActive]}>
                                                        {formatDisplayTime(task.dueTime)}
                                                    </Text>
                                                </TouchableOpacity>
                                                {task.dueTime && (
                                                    <TouchableOpacity
                                                        style={styles.clearBtn}
                                                        onPress={() => updateTask(idx, { dueTime: null })}
                                                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                                    >
                                                        <Text style={styles.clearBtnText}>Clear</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </View>
                                        {/* Full-width pickers rendered below the row */}
                                        {isDatePickerOpen && (
                                            <View style={styles.pickerInline}>
                                                <DateTimePicker
                                                    value={ymdToDate(task.dueDate)}
                                                    mode="date"
                                                    display="inline"
                                                    onChange={handleDateChange}
                                                    themeVariant={isDark ? "dark" : "light"}
                                                />
                                            </View>
                                        )}
                                        {isTimePickerOpen && (
                                            <View style={styles.pickerInline}>
                                                <DateTimePicker
                                                    value={hmToDate(task.dueTime)}
                                                    mode="time"
                                                    display="spinner"
                                                    onChange={handleDateChange}
                                                    themeVariant={isDark ? "dark" : "light"}
                                                />
                                            </View>
                                        )}

                                        {/* Priority + Group row */}
                                        <View style={[styles.fieldRow, { zIndex: 20 }]}>
                                            <View style={[styles.fieldHalf, { zIndex: 21 }]}>
                                                <Text style={styles.fieldLabel}>PRIORITY</Text>
                                                <TouchableOpacity
                                                    style={[styles.pickerBtn, { borderColor: meta.border, backgroundColor: meta.bg }]}
                                                    onPress={() => {
                                                        setShowPriorityPicker(showPriorityPicker === idx ? null : idx);
                                                        setShowGroupPicker(null);
                                                        setDtPicker(null);
                                                    }}
                                                    activeOpacity={0.7}
                                                >
                                                    <View style={[styles.pickerDot, { backgroundColor: meta.color }]} />
                                                    <Text style={[styles.pickerText, { color: meta.color }]}>
                                                        {PRIORITY_OPTIONS.find(o => o.key === task.priority)?.label ?? "Do First"}
                                                    </Text>
                                                    <Ionicons name="chevron-down" size={12} color={meta.color} />
                                                </TouchableOpacity>
                                                {showPriorityPicker === idx && (
                                                    <View style={styles.pickerDropdown}>
                                                        {PRIORITY_OPTIONS.map((opt) => (
                                                            <TouchableOpacity
                                                                key={opt.key}
                                                                style={[
                                                                    styles.pickerOption,
                                                                    task.priority === opt.key && styles.pickerOptionActive,
                                                                ]}
                                                                onPress={() => {
                                                                    updateTask(idx, { priority: opt.key });
                                                                    setShowPriorityPicker(null);
                                                                }}
                                                            >
                                                                <View style={[styles.pickerDot, { backgroundColor: QUADRANT_META[opt.key].color }]} />
                                                                <Text style={styles.pickerOptionText}>{opt.label}</Text>
                                                            </TouchableOpacity>
                                                        ))}
                                                    </View>
                                                )}
                                            </View>
                                            <View style={[styles.fieldHalf, { zIndex: 21 }]}>
                                                <Text style={styles.fieldLabel}>TASK GROUP</Text>
                                                <TouchableOpacity
                                                    style={styles.pickerBtn}
                                                    onPress={() => {
                                                        setShowGroupPicker(showGroupPicker === idx ? null : idx);
                                                        setShowPriorityPicker(null);
                                                        setDtPicker(null);
                                                    }}
                                                    activeOpacity={0.7}
                                                >
                                                    {group && (
                                                        <View style={[styles.pickerDot, { backgroundColor: group.color || C.textTertiary }]} />
                                                    )}
                                                    <Text style={styles.pickerText} numberOfLines={1}>
                                                        {group?.name || "General Tasks"}
                                                    </Text>
                                                    <Ionicons name="chevron-down" size={12} color={C.textTertiary} />
                                                </TouchableOpacity>
                                                {showGroupPicker === idx && (
                                                    <View style={styles.pickerDropdown}>
                                                        <TouchableOpacity
                                                            style={[
                                                                styles.pickerOption,
                                                                !task.groupId && styles.pickerOptionActive,
                                                            ]}
                                                            onPress={() => {
                                                                updateTask(idx, { groupId: null, group: null });
                                                                setShowGroupPicker(null);
                                                            }}
                                                        >
                                                            <Text style={styles.pickerOptionText}>General Tasks</Text>
                                                        </TouchableOpacity>
                                                        {groups.map((g) => (
                                                            <TouchableOpacity
                                                                key={g.id}
                                                                style={[
                                                                    styles.pickerOption,
                                                                    task.groupId === g.id && styles.pickerOptionActive,
                                                                ]}
                                                                onPress={() => {
                                                                    updateTask(idx, { groupId: g.id, group: g.name });
                                                                    setShowGroupPicker(null);
                                                                }}
                                                            >
                                                                <View style={[styles.pickerDot, { backgroundColor: g.color || C.textTertiary }]} />
                                                                <Text style={styles.pickerOptionText}>{g.name}</Text>
                                                            </TouchableOpacity>
                                                        ))}
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}

                            {/* Bottom actions */}
                            <View style={styles.actionsRow}>
                                <TouchableOpacity
                                    style={styles.addTaskBtn}
                                    onPress={addBlankTask}
                                    disabled={results.length >= 5}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="add" size={16} color={C.accent} />
                                    <Text style={styles.addTaskText}>Add task</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.createBtn, (creating || !results.some(t => t.title.trim())) && styles.btnDisabled]}
                                    onPress={handleCreate}
                                    disabled={creating || !results.some(t => t.title.trim())}
                                    activeOpacity={0.85}
                                >
                                    {creating ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <Text style={styles.createBtnText}>
                                            {results.length > 1 ? "Create tasks" : "Create task"}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.dismissBtn}
                                    onPress={() => setResults([])}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.dismissText}>Dismiss</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}
