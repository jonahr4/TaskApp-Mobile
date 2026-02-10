import { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Modal,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";
import { createTask, updateTask, deleteTask } from "@/lib/firestore";
import { Colors, Spacing, Radius, FontSize } from "@/lib/theme";
import { QUADRANT_META } from "@/lib/types";
import type { Task, TaskGroup, Quadrant } from "@/lib/types";

type Props = {
    visible: boolean;
    onClose: () => void;
    task?: Task | null;
    defaultGroupId?: string | null;
    defaultUrgent?: boolean;
    defaultImportant?: boolean;
    groups: TaskGroup[];
};

const priorityOptions: { key: Quadrant; label: string }[] = [
    { key: "DO", label: "Do First" },
    { key: "SCHEDULE", label: "Schedule" },
    { key: "DELEGATE", label: "Delegate" },
    { key: "DELETE", label: "Eliminate" },
];

export default function TaskModal({
    visible,
    onClose,
    task,
    defaultGroupId,
    defaultUrgent,
    defaultImportant,
    groups,
}: Props) {
    const { user } = useAuth();
    const isEdit = !!task;

    const [title, setTitle] = useState("");
    const [notes, setNotes] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [dueTime, setDueTime] = useState("");
    const [urgent, setUrgent] = useState<boolean | null>(null);
    const [important, setImportant] = useState<boolean | null>(null);
    const [groupId, setGroupId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (visible) {
            if (task) {
                setTitle(task.title);
                setNotes(task.notes || "");
                setDueDate(task.dueDate || "");
                setDueTime(task.dueTime || "");
                setUrgent(task.urgent);
                setImportant(task.important);
                setGroupId(task.groupId);
            } else {
                setTitle("");
                setNotes("");
                setDueDate("");
                setDueTime("");
                setUrgent(defaultUrgent ?? null);
                setImportant(defaultImportant ?? null);
                setGroupId(defaultGroupId ?? groups[0]?.id ?? null);
            }
        }
    }, [visible, task, defaultGroupId, defaultUrgent, defaultImportant]);

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

    const handleSave = async () => {
        if (!user || !title.trim()) return;
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
                completed: task?.completed ?? false,
                order: task?.order ?? Date.now(),
                autoUrgentDays: task?.autoUrgentDays ?? null,
                reminder: task?.reminder ?? false,
            };

            if (isEdit && task) {
                await updateTask(user.uid, task.id, data);
            } else {
                await createTask(user.uid, data as any);
            }
            onClose();
        } catch (err) {
            Alert.alert("Error", "Failed to save task.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        if (!user || !task) return;
        Alert.alert("Delete Task", `Delete "${task.title}"?`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    await deleteTask(user.uid, task.id);
                    onClose();
                },
            },
        ]);
    };

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
                    <TouchableOpacity onPress={onClose}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{isEdit ? "Edit Task" : "New Task"}</Text>
                    <TouchableOpacity onPress={handleSave} disabled={saving || !title.trim()}>
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
                    contentContainerStyle={{ paddingBottom: 40 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Title */}
                    <TextInput
                        style={styles.titleInput}
                        placeholder="Task title"
                        placeholderTextColor={Colors.light.textTertiary}
                        value={title}
                        onChangeText={setTitle}
                        autoFocus={!isEdit}
                        multiline
                    />

                    {/* Notes */}
                    <TextInput
                        style={styles.notesInput}
                        placeholder="Notes (optional)"
                        placeholderTextColor={Colors.light.textTertiary}
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        numberOfLines={3}
                    />

                    {/* Due Date */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>Due Date</Text>
                        <TextInput
                            style={styles.fieldInput}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={Colors.light.textTertiary}
                            value={dueDate}
                            onChangeText={setDueDate}
                            keyboardType="numbers-and-punctuation"
                        />
                    </View>

                    {/* Due Time */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>Due Time</Text>
                        <TextInput
                            style={styles.fieldInput}
                            placeholder="HH:MM (24hr)"
                            placeholderTextColor={Colors.light.textTertiary}
                            value={dueTime}
                            onChangeText={setDueTime}
                            keyboardType="numbers-and-punctuation"
                        />
                    </View>

                    {/* Priority */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>Priority</Text>
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
                                                borderColor: isSelected ? meta.color : Colors.light.borderLight,
                                                backgroundColor: isSelected ? meta.bg : Colors.light.bgCard,
                                            },
                                        ]}
                                        onPress={() => selectPriority(opt.key)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.priBtnDot, { backgroundColor: meta.color }]} />
                                        <Text
                                            style={[
                                                styles.priBtnText,
                                                { color: isSelected ? meta.color : Colors.light.textSecondary },
                                            ]}
                                        >
                                            {opt.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Group */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>List</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.groupChips}>
                                {groups.map((g) => (
                                    <TouchableOpacity
                                        key={g.id}
                                        style={[
                                            styles.groupChip,
                                            groupId === g.id && {
                                                backgroundColor: g.color ? `${g.color}15` : Colors.light.accentLight,
                                                borderColor: g.color || Colors.light.accent,
                                            },
                                        ]}
                                        onPress={() => setGroupId(g.id)}
                                    >
                                        <View
                                            style={[
                                                styles.chipDot,
                                                { backgroundColor: g.color || Colors.light.textTertiary },
                                            ]}
                                        />
                                        <Text
                                            style={[
                                                styles.chipText,
                                                groupId === g.id && { color: Colors.light.textPrimary },
                                            ]}
                                        >
                                            {g.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </View>

                    {/* Delete */}
                    {isEdit && (
                        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                            <Ionicons name="trash-outline" size={18} color={Colors.light.danger} />
                            <Text style={styles.deleteText}>Delete Task</Text>
                        </TouchableOpacity>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.bg,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.borderLight,
        backgroundColor: Colors.light.bgCard,
    },
    cancelText: {
        fontSize: FontSize.md,
        color: Colors.light.textSecondary,
    },
    headerTitle: {
        fontSize: FontSize.lg,
        fontWeight: "600",
        color: Colors.light.textPrimary,
    },
    saveText: {
        fontSize: FontSize.md,
        fontWeight: "600",
        color: Colors.light.accent,
    },
    saveTextDisabled: {
        opacity: 0.4,
    },
    body: {
        flex: 1,
        padding: Spacing.xl,
    },
    titleInput: {
        fontSize: FontSize.xl,
        fontWeight: "600",
        color: Colors.light.textPrimary,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.borderLight,
        minHeight: 48,
    },
    notesInput: {
        fontSize: FontSize.md,
        color: Colors.light.textPrimary,
        paddingVertical: Spacing.md,
        marginTop: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.borderLight,
        minHeight: 60,
        textAlignVertical: "top",
    },
    section: {
        marginTop: Spacing.xxl,
    },
    sectionLabel: {
        fontSize: FontSize.sm,
        fontWeight: "600",
        color: Colors.light.textSecondary,
        marginBottom: Spacing.sm,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    fieldInput: {
        backgroundColor: Colors.light.bgCard,
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: 14,
        fontSize: FontSize.md,
        color: Colors.light.textPrimary,
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
        borderColor: Colors.light.borderLight,
        backgroundColor: Colors.light.bgCard,
    },
    chipDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    chipText: {
        fontSize: FontSize.sm,
        color: Colors.light.textSecondary,
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
        color: Colors.light.danger,
    },
});
