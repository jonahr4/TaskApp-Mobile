import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Dimensions,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { createTaskUnified, deleteTaskUnified, updateTaskUnified } from "@/lib/crud";
import { Colors, FontSize, Radius, Spacing } from "@/lib/theme";
import type { Quadrant, Task, TaskGroup } from "@/lib/types";
import { QUADRANT_META } from "@/lib/types";
import { Ionicons } from "@expo/vector-icons";

const { width: SCREEN_W } = Dimensions.get("window");

type Props = {
    visible: boolean;
    onClose: () => void;
    task?: Task | null;
    defaultGroupId?: string | null;
    defaultUrgent?: boolean;
    defaultImportant?: boolean;
    defaultDueDate?: string | null;
    groups: TaskGroup[];
    createdFrom?: "tasks" | "calendar" | "matrix";
};

const priorityOptions: { key: Quadrant; label: string }[] = [
    { key: "DO", label: "Do First" },
    { key: "SCHEDULE", label: "Schedule" },
    { key: "DELEGATE", label: "Delegate" },
    { key: "DELETE", label: "Eliminate" },
];

/* ── helpers ─────────────────────────────── */

function parseDateStr(s: string | null): Date | null {
    if (!s) return null;
    const d = new Date(s + "T00:00:00");
    return isNaN(d.getTime()) ? null : d;
}
function parseTimeStr(s: string | null): Date | null {
    if (!s) return null;
    const [h, m] = s.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
}
function formatDate(d: Date): string {
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${mo}-${day}`;
}
function formatTime(d: Date): string {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function displayDate(s: string | null): string {
    if (!s) return "";
    const d = parseDateStr(s);
    if (!d) return s;
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
function displayTime(s: string | null): string {
    if (!s) return "";
    const d = parseTimeStr(s);
    if (!d) return s;
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/* ── component ───────────────────────────── */

function makeStyles(C: typeof Colors.light) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: C.bg,
        },
        header: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: Spacing.lg,
            paddingTop: Platform.OS === "ios" ? 20 : Spacing.lg,
            paddingBottom: Spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: C.borderLight,
            backgroundColor: C.bgCard,
        },
        headerSideBtn: {
            minWidth: 64,
        },
        cancelText: {
            fontSize: FontSize.md,
            color: C.textSecondary,
        },
        headerTitle: {
            fontSize: FontSize.lg,
            fontWeight: "600",
            color: C.textPrimary,
            textAlign: "center",
        },
        saveText: {
            fontSize: FontSize.md,
            fontWeight: "600",
            color: C.accent,
        },
        saveTextDisabled: {
            opacity: 0.4,
        },
        body: {
            flex: 1,
            padding: Spacing.xl,
        },
        titleRow: {
            flexDirection: "row",
            alignItems: "flex-start",
            gap: Spacing.sm,
        },
        titleInput: {
            flex: 1,
            fontSize: FontSize.xl,
            fontWeight: "600",
            color: C.textPrimary,
            paddingVertical: Spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: C.borderLight,
            minHeight: 48,
        },
        completedBadge: {
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: Radius.md,
            backgroundColor: "#fff",
            borderWidth: 1,
            borderColor: C.borderLight,
            marginTop: Spacing.md,
        },
        completedBadgeActive: {
            backgroundColor: "#f0fdf4",
            borderColor: "#bbf7d0",
        },
        completedBadgeText: {
            fontSize: FontSize.xs,
            fontWeight: "600",
            color: C.textTertiary,
        },
        completedBadgeTextActive: {
            color: "#22c55e",
        },
        notesInput: {
            fontSize: FontSize.md,
            color: C.textPrimary,
            paddingVertical: Spacing.md,
            marginTop: Spacing.sm,
            borderBottomWidth: 1,
            borderBottomColor: C.borderLight,
            minHeight: 60,
            textAlignVertical: "top",
        },
        section: {
            marginTop: Spacing.xxl,
        },
        sectionLabel: {
            fontSize: FontSize.sm,
            fontWeight: "600",
            color: C.textSecondary,
            marginBottom: Spacing.sm,
            textTransform: "uppercase",
            letterSpacing: 0.5,
        },
        fieldRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: Spacing.sm,
            backgroundColor: C.bgCard,
            borderWidth: 1,
            borderColor: C.borderLight,
            borderRadius: Radius.md,
            paddingHorizontal: Spacing.lg,
            paddingVertical: 14,
        },
        fieldText: {
            flex: 1,
            fontSize: FontSize.md,
            color: C.textPrimary,
        },
        fieldPlaceholder: {
            color: C.textTertiary,
        },
        picker: {
            marginTop: Spacing.sm,
            alignSelf: "center",
        },
        toggleRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: C.bgCard,
            borderWidth: 1,
            borderColor: C.borderLight,
            borderRadius: Radius.md,
            paddingHorizontal: Spacing.lg,
            paddingVertical: 12,
        },
        toggleLeft: {
            flexDirection: "row",
            alignItems: "center",
            gap: Spacing.sm,
            flex: 1,
        },
        toggleLabel: {
            fontSize: FontSize.md,
            fontWeight: "500",
            color: C.textPrimary,
        },
        toggleSub: {
            fontSize: FontSize.xs,
            color: C.textTertiary,
            marginTop: 1,
        },
        daysRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: Spacing.sm,
            paddingHorizontal: Spacing.sm,
        },
        daysLabel: {
            fontSize: FontSize.sm,
            color: C.textSecondary,
        },
        daysStepper: {
            flexDirection: "row",
            alignItems: "center",
            gap: Spacing.md,
            backgroundColor: C.bgCard,
            borderWidth: 1,
            borderColor: C.borderLight,
            borderRadius: Radius.md,
            paddingHorizontal: Spacing.sm,
            paddingVertical: 4,
        },
        stepperBtn: {
            padding: 4,
        },
        daysValue: {
            fontSize: FontSize.md,
            fontWeight: "600",
            color: C.textPrimary,
            minWidth: 24,
            textAlign: "center",
        },
        priorityGrid: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: Spacing.sm,
        },
        priorityBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: Spacing.md,
            paddingVertical: 10,
            borderRadius: Radius.md,
            borderWidth: 1.5,
            minWidth: "45%",
            flex: 1,
        },
        priBtnDot: {
            width: 8,
            height: 8,
            borderRadius: 4,
        },
        priBtnText: {
            fontSize: FontSize.sm,
            fontWeight: "600",
        },
        groupChips: {
            flexDirection: "row",
            gap: Spacing.sm,
        },
        groupChip: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: Spacing.md,
            paddingVertical: 8,
            borderRadius: Radius.full,
            borderWidth: 1,
            borderColor: C.borderLight,
            backgroundColor: C.bgCard,
        },
        chipDot: {
            width: 8,
            height: 8,
            borderRadius: 4,
        },
        chipText: {
            fontSize: FontSize.sm,
            color: C.textSecondary,
            fontWeight: "500",
        },

        deleteBtn: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            marginTop: Spacing.xxxl,
            paddingVertical: Spacing.lg,
            borderRadius: Radius.md,
            borderWidth: 1,
            borderColor: "#fecaca",
            backgroundColor: "#fef2f2",
        },
        deleteText: {
            fontSize: FontSize.md,
            fontWeight: "500",
            color: C.danger,
        },
    });
}



export default function TaskModal({
    visible,
    onClose,
    task,
    defaultGroupId,
    defaultUrgent,
    defaultImportant,
    defaultDueDate,
    groups,
    createdFrom = "tasks",
}: Props) {
    const { user } = useAuth();
    const { colors: C, isDark } = useTheme();
    const isEdit = !!task;

    const [title, setTitle] = useState("");
    const [notes, setNotes] = useState("");
    const [dueDate, setDueDate] = useState<string | null>(null);
    const [dueTime, setDueTime] = useState<string | null>(null);
    const [urgent, setUrgent] = useState<boolean | null>(null);
    const [important, setImportant] = useState<boolean | null>(null);
    const [groupId, setGroupId] = useState<string | null>(null);
    const [completed, setCompleted] = useState(false);
    const [autoUrgentEnabled, setAutoUrgentEnabled] = useState(false);
    const [autoUrgentDays, setAutoUrgentDays] = useState(1);

    const [saving, setSaving] = useState(false);

    // Picker visibility
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);


    useEffect(() => {
        if (visible) {
            if (task) {
                setTitle(task.title);
                setNotes(task.notes || "");
                setDueDate(task.dueDate || null);
                setDueTime(task.dueTime || null);
                setUrgent(task.urgent);
                setImportant(task.important);
                setGroupId(task.groupId);
                setCompleted(task.completed);
                setAutoUrgentEnabled(task.autoUrgentDays !== null && task.autoUrgentDays > 0);
                setAutoUrgentDays(task.autoUrgentDays ?? 1);

            } else {
                setTitle("");
                setNotes("");
                setDueDate(defaultDueDate || null);
                setDueTime(null);
                setUrgent(defaultUrgent ?? null);
                setImportant(defaultImportant ?? null);
                setGroupId(defaultGroupId !== undefined ? defaultGroupId : (groups[0]?.id ?? null));
                setCompleted(false);
                setAutoUrgentEnabled(false);
                setAutoUrgentDays(1);

            }
            setShowDatePicker(false);
            setShowTimePicker(false);

        }
    }, [visible, task, defaultGroupId, defaultUrgent, defaultImportant, defaultDueDate]);

    const selectedPriority = (() => {
        if (urgent === null || important === null) return null;
        if (urgent && important) return "DO";
        if (!urgent && important) return "SCHEDULE";
        if (urgent && !important) return "DELEGATE";
        return "DELETE";
    })();

    const selectPriority = (key: Quadrant) => {
        if (selectedPriority === key) {
            setUrgent(null);
            setImportant(null);
        } else {
            const meta = QUADRANT_META[key];
            setUrgent(meta.urgent);
            setImportant(meta.important);
        }
    };

    const onDateChange = (_e: DateTimePickerEvent, date?: Date) => {
        if (date) setDueDate(formatDate(date));
    };
    const onTimeChange = (_e: DateTimePickerEvent, date?: Date) => {
        if (date) setDueTime(formatTime(date));
    };

    const handleSave = async () => {
        if (!title.trim()) return;
        setSaving(true);
        try {
            const data = {
                title: title.trim(),
                notes: notes.trim() || undefined,
                urgent,
                important,
                dueDate: dueDate || null,
                dueTime: dueTime || null,
                groupId,
                completed,
                order: task?.order ?? Date.now(),
                autoUrgentDays: autoUrgentEnabled ? autoUrgentDays : null,
                reminder: task?.reminder ?? false,

            };
            if (isEdit && task) {
                await updateTaskUnified(user?.uid, task.id, data);
            } else {
                await createTaskUnified(user?.uid, { ...data, createdFrom } as any);
            }
            onClose();
        } catch {
            Alert.alert("Error", "Failed to save task.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        if (!task) return;
        Alert.alert("Delete Task", `Delete "${task.title}"?`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    await deleteTaskUnified(user?.uid, task.id);
                    onClose();
                },
            },
        ]);
    };

    const styles = useMemo(() => makeStyles(C), [C]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.headerSideBtn}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{isEdit ? "Edit Task" : "New Task"}</Text>
                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={saving || !title.trim()}
                        style={[styles.headerSideBtn, { alignItems: "flex-end" as const }]}
                    >
                        <Text
                            style={[
                                styles.saveText,
                                (!title.trim() || saving) && styles.saveTextDisabled,
                            ]}
                        >
                            {saving ? "Saving..." : "Save"}
                        </Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={styles.body}
                    contentContainerStyle={{ paddingBottom: 60 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Title + Completed badge */}
                    <View style={styles.titleRow}>
                        <TextInput
                            style={styles.titleInput}
                            placeholder="Task title"
                            placeholderTextColor={C.textTertiary}
                            value={title}
                            onChangeText={setTitle}
                            autoFocus={!isEdit}
                            multiline
                            blurOnSubmit
                            returnKeyType="done"
                            onSubmitEditing={() => Keyboard.dismiss()}
                        />
                        {isEdit && (
                            <TouchableOpacity
                                onPress={() => setCompleted(!completed)}
                                style={[
                                    styles.completedBadge,
                                    completed && styles.completedBadgeActive,
                                ]}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name={completed ? "checkmark-circle" : "ellipse-outline"}
                                    size={16}
                                    color={completed ? "#22c55e" : C.textTertiary}
                                />
                                <Text style={[
                                    styles.completedBadgeText,
                                    completed && styles.completedBadgeTextActive,
                                ]}>
                                    {completed ? "Completed" : "Mark Done"}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Notes */}
                    <TextInput
                        style={styles.notesInput}
                        placeholder="Notes (optional)"
                        placeholderTextColor={C.textTertiary}
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        numberOfLines={3}
                        blurOnSubmit
                        returnKeyType="done"
                        onSubmitEditing={() => Keyboard.dismiss()}
                    />

                    {/* List (Group) */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>List</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.groupChips}>
                                {/* General Tasks (ungrouped) */}
                                <TouchableOpacity
                                    style={[
                                        styles.groupChip,
                                        groupId === null && {
                                            backgroundColor: C.accentLight,
                                            borderColor: C.accent,
                                        },
                                    ]}
                                    onPress={() => setGroupId(null)}
                                >
                                    <View
                                        style={[
                                            styles.chipDot,
                                            { backgroundColor: C.textTertiary },
                                        ]}
                                    />
                                    <Text
                                        style={[
                                            styles.chipText,
                                            groupId === null && { color: C.textPrimary },
                                        ]}
                                    >
                                        General Tasks
                                    </Text>
                                </TouchableOpacity>
                                {groups.map((g) => (
                                    <TouchableOpacity
                                        key={g.id}
                                        style={[
                                            styles.groupChip,
                                            groupId === g.id && {
                                                backgroundColor: g.color ? `${g.color}15` : C.accentLight,
                                                borderColor: g.color || C.accent,
                                            },
                                        ]}
                                        onPress={() => setGroupId(g.id)}
                                    >
                                        <View
                                            style={[
                                                styles.chipDot,
                                                { backgroundColor: g.color || C.textTertiary },
                                            ]}
                                        />
                                        <Text
                                            style={[
                                                styles.chipText,
                                                groupId === g.id && { color: C.textPrimary },
                                            ]}
                                        >
                                            {g.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </View>

                    {/* Due Date */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>Due Date</Text>
                        <TouchableOpacity
                            style={styles.fieldRow}
                            onPress={() => {
                                if (!dueDate) setDueDate(formatDate(new Date()));
                                setShowDatePicker(!showDatePicker);
                                setShowTimePicker(false);
                            }}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="calendar-outline" size={20} color={C.accent} />
                            <Text style={[styles.fieldText, !dueDate && styles.fieldPlaceholder]}>
                                {dueDate ? displayDate(dueDate) : "Add due date"}
                            </Text>
                            {dueDate && (
                                <TouchableOpacity
                                    onPress={() => { setDueDate(null); setDueTime(null); setShowDatePicker(false); setShowTimePicker(false); }}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Ionicons name="close-circle" size={18} color={C.textTertiary} />
                                </TouchableOpacity>
                            )}
                        </TouchableOpacity>
                        {showDatePicker && (
                            <DateTimePicker
                                value={parseDateStr(dueDate) ?? new Date()}
                                mode="date"
                                display="inline"
                                onChange={onDateChange}
                                themeVariant={isDark ? "dark" : "light"}
                                style={styles.picker}
                            />
                        )}
                    </View>

                    {/* Due Time — only when date is set */}
                    {dueDate ? (
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Due Time</Text>
                            <TouchableOpacity
                                style={styles.fieldRow}
                                onPress={() => {
                                    if (!dueTime) setDueTime(formatTime(new Date()));
                                    setShowTimePicker(!showTimePicker);
                                    setShowDatePicker(false);
                                }}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="time-outline" size={20} color={C.accent} />
                                <Text style={[styles.fieldText, !dueTime && styles.fieldPlaceholder]}>
                                    {dueTime ? displayTime(dueTime) : "Add due time"}
                                </Text>
                                {dueTime && (
                                    <TouchableOpacity
                                        onPress={() => { setDueTime(null); setShowTimePicker(false); }}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                        <Ionicons name="close-circle" size={18} color={C.textTertiary} />
                                    </TouchableOpacity>
                                )}
                            </TouchableOpacity>
                            {showTimePicker && (
                                <DateTimePicker
                                    value={parseTimeStr(dueTime) ?? new Date()}
                                    mode="time"
                                    display="spinner"
                                    onChange={onTimeChange}
                                    themeVariant={isDark ? "dark" : "light"}
                                    style={styles.picker}
                                />
                            )}
                        </View>
                    ) : null}

                    {/* Priority */}
                    <View style={styles.section}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: Spacing.sm }}>
                            <Text style={[styles.sectionLabel, { marginBottom: 0 }]}>Priority</Text>
                            <TouchableOpacity
                                onPress={() =>
                                    Alert.alert(
                                        "Eisenhower Focus Matrix",
                                        "The Eisenhower Matrix helps you prioritize tasks by urgency and importance:\n\n" +
                                        "🔴 Do First — Urgent & Important\nCritical tasks that need immediate attention.\n\n" +
                                        "🟡 Schedule — Not Urgent & Important\nImportant goals to plan and work on over time.\n\n" +
                                        "🔵 Delegate — Urgent & Not Important\nTime-sensitive but can be handed off to others.\n\n" +
                                        "⚫ Eliminate — Not Urgent & Not Important\nDistractions to minimize or remove."
                                    )
                                }
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Ionicons name="information-circle-outline" size={18} color={C.textTertiary} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.priorityGrid}>
                            {priorityOptions.map((opt) => {
                                const meta = QUADRANT_META[opt.key];
                                const isSelected = selectedPriority === opt.key;
                                return (
                                    <TouchableOpacity
                                        key={opt.key}
                                        style={[
                                            styles.priorityBtn,
                                            {
                                                borderColor: isSelected ? meta.color : C.borderLight,
                                                backgroundColor: isSelected ? meta.bg : C.bgCard,
                                            },
                                        ]}
                                        onPress={() => selectPriority(opt.key)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.priBtnDot, { backgroundColor: meta.color }]} />
                                        <Text
                                            style={[
                                                styles.priBtnText,
                                                { color: isSelected ? meta.color : C.textSecondary },
                                            ]}
                                        >
                                            {opt.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Auto-Urgent (below Priority) */}
                    <View style={styles.section}>
                        <View style={styles.toggleRow}>
                            <View style={styles.toggleLeft}>
                                <Ionicons name="alert-circle-outline" size={20} color="#f59e0b" />
                                <View>
                                    <Text style={styles.toggleLabel}>Auto-urgent</Text>
                                    <Text style={styles.toggleSub}>
                                        {autoUrgentEnabled
                                            ? `Mark urgent ${autoUrgentDays} day${autoUrgentDays > 1 ? "s" : ""} before due`
                                            : "Off"}
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={autoUrgentEnabled}
                                onValueChange={setAutoUrgentEnabled}
                                trackColor={{ false: C.borderLight, true: "#fbbf24" }}
                                thumbColor="#fff"
                            />
                        </View>
                        {autoUrgentEnabled && (
                            <View style={styles.daysRow}>
                                <Text style={styles.daysLabel}>Days before due date:</Text>
                                <View style={styles.daysStepper}>
                                    <TouchableOpacity
                                        onPress={() => setAutoUrgentDays(Math.max(1, autoUrgentDays - 1))}
                                        style={styles.stepperBtn}
                                    >
                                        <Ionicons name="remove" size={16} color={C.textPrimary} />
                                    </TouchableOpacity>
                                    <Text style={styles.daysValue}>{autoUrgentDays}</Text>
                                    <TouchableOpacity
                                        onPress={() => setAutoUrgentDays(Math.min(30, autoUrgentDays + 1))}
                                        style={styles.stepperBtn}
                                    >
                                        <Ionicons name="add" size={16} color={C.textPrimary} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Delete */}
                    {isEdit && (
                        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                            <Ionicons name="trash-outline" size={18} color={C.danger} />
                            <Text style={styles.deleteText}>Delete Task</Text>
                        </TouchableOpacity>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
}
