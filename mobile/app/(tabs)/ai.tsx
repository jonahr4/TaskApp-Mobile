import { useState, useMemo } from "react";
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/hooks/useAuth";
import { useTaskGroups } from "@/hooks/useTaskGroups";
import { useTasks } from "@/hooks/useTasks";
import { createTask } from "@/lib/firestore";
import { Colors, Spacing, Radius, FontSize } from "@/lib/theme";
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

export default function AiScreen() {
    const { user } = useAuth();
    const { groups } = useTaskGroups(user?.uid);
    const { tasks } = useTasks(user?.uid);

    const [text, setText] = useState("");
    const [parsing, setParsing] = useState(false);
    const [results, setResults] = useState<AiTask[]>([]);
    const [creating, setCreating] = useState(false);

    const handleParse = async () => {
        if (!text.trim() || !user) return;
        setParsing(true);
        try {
            const today = new Date().toISOString().split("T")[0];
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

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

            if (!res.ok) {
                throw new Error("AI request failed");
            }

            const data = await res.json();
            if (data.tasks && Array.isArray(data.tasks)) {
                // Match group names to IDs
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
            }
        } catch (err) {
            Alert.alert("Error", "Failed to parse text with AI. Check your connection.");
        } finally {
            setParsing(false);
        }
    };

    const handleCreate = async () => {
        if (!user || results.length === 0) return;
        setCreating(true);
        try {
            for (const task of results) {
                const meta = QUADRANT_META[task.priority];
                await createTask(user.uid, {
                    title: task.title,
                    notes: task.notes || undefined,
                    dueDate: task.dueDate,
                    dueTime: task.dueTime,
                    urgent: meta.urgent,
                    important: meta.important,
                    groupId: task.groupId || groups[0]?.id || null,
                    completed: false,
                    order: Date.now(),
                    autoUrgentDays: null,
                    reminder: false,
                });
            }
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setResults([]);
            setText("");
            Alert.alert("Done", `Created ${results.length} task${results.length > 1 ? "s" : ""}!`);
        } catch (err) {
            Alert.alert("Error", "Failed to create tasks.");
        } finally {
            setCreating(false);
        }
    };

    const removeResult = (index: number) => {
        setResults((prev) => prev.filter((_, i) => i !== index));
    };

    const updateResultTitle = (index: number, title: string) => {
        setResults((prev) =>
            prev.map((t, i) => (i === index ? { ...t, title } : t))
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>AI Assistant</Text>
            </View>

            <ScrollView
                style={styles.body}
                contentContainerStyle={{ paddingBottom: 40 }}
                keyboardShouldPersistTaps="handled"
            >
                {/* Input Section */}
                <View style={styles.inputCard}>
                    <View style={styles.inputHeader}>
                        <Ionicons name="sparkles" size={18} color={Colors.light.accent} />
                        <Text style={styles.inputLabel}>
                            Describe your tasks in plain English
                        </Text>
                    </View>
                    <TextInput
                        style={styles.textArea}
                        placeholder='e.g. "Remind me to call mom Friday at 3pm and submit the report by next Monday"'
                        placeholderTextColor={Colors.light.textTertiary}
                        value={text}
                        onChangeText={setText}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                    <TouchableOpacity
                        style={[styles.parseBtn, (!text.trim() || parsing) && styles.parseBtnDisabled]}
                        onPress={handleParse}
                        disabled={!text.trim() || parsing}
                        activeOpacity={0.85}
                    >
                        {parsing ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <>
                                <Ionicons name="sparkles" size={16} color="#fff" />
                                <Text style={styles.parseBtnText}>Parse with AI</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Results */}
                {results.length > 0 && (
                    <View style={styles.resultsSection}>
                        <Text style={styles.resultsLabel}>
                            {results.length} task{results.length > 1 ? "s" : ""} found
                        </Text>

                        {results.map((task, i) => {
                            const meta = QUADRANT_META[task.priority];
                            const group = task.groupId
                                ? groups.find((g) => g.id === task.groupId)
                                : null;
                            return (
                                <View key={i} style={styles.resultCard}>
                                    <View style={styles.resultHeader}>
                                        <TextInput
                                            style={styles.resultTitle}
                                            value={task.title}
                                            onChangeText={(v) => updateResultTitle(i, v)}
                                        />
                                        <TouchableOpacity
                                            onPress={() => removeResult(i)}
                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                        >
                                            <Ionicons name="close-circle" size={20} color={Colors.light.textTertiary} />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.resultMeta}>
                                        {task.dueDate && (
                                            <View style={styles.metaChip}>
                                                <Ionicons name="calendar-outline" size={12} color={Colors.light.textSecondary} />
                                                <Text style={styles.metaText}>
                                                    {task.dueDate}
                                                    {task.dueTime ? ` ${task.dueTime}` : ""}
                                                </Text>
                                                {task.timeSource === "guessed" && (
                                                    <Text style={styles.guessedLabel}>~guessed</Text>
                                                )}
                                            </View>
                                        )}
                                        <View style={[styles.metaChip, { backgroundColor: meta.bg, borderColor: meta.border }]}>
                                            <View style={[styles.metaDot, { backgroundColor: meta.color }]} />
                                            <Text style={[styles.metaText, { color: meta.color, fontWeight: "600" }]}>
                                                {meta.sublabel}
                                            </Text>
                                        </View>
                                        {group && (
                                            <View style={styles.metaChip}>
                                                <View style={[styles.metaDot, { backgroundColor: group.color || Colors.light.textTertiary }]} />
                                                <Text style={styles.metaText}>{group.name}</Text>
                                            </View>
                                        )}
                                    </View>

                                    {task.notes ? (
                                        <Text style={styles.resultNotes}>{task.notes}</Text>
                                    ) : null}
                                </View>
                            );
                        })}

                        <TouchableOpacity
                            style={[styles.createBtn, creating && styles.parseBtnDisabled]}
                            onPress={handleCreate}
                            disabled={creating}
                            activeOpacity={0.85}
                        >
                            {creating ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <>
                                    <Ionicons name="add-circle" size={18} color="#fff" />
                                    <Text style={styles.createBtnText}>
                                        Create {results.length} Task{results.length > 1 ? "s" : ""}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.bg,
    },
    header: {
        paddingHorizontal: Spacing.xl,
        paddingTop: 60,
        paddingBottom: Spacing.md,
        backgroundColor: Colors.light.bgCard,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.borderLight,
    },
    headerTitle: {
        fontSize: FontSize.xxl,
        fontWeight: "700",
        color: Colors.light.textPrimary,
        letterSpacing: -0.3,
    },
    body: {
        flex: 1,
        padding: Spacing.lg,
    },
    inputCard: {
        backgroundColor: Colors.light.bgCard,
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    inputHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    inputLabel: {
        fontSize: FontSize.md,
        fontWeight: "600",
        color: Colors.light.textPrimary,
    },
    textArea: {
        backgroundColor: Colors.light.bg,
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        fontSize: FontSize.md,
        color: Colors.light.textPrimary,
        minHeight: 100,
        textAlignVertical: "top",
    },
    parseBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: Spacing.sm,
        backgroundColor: Colors.light.accent,
        paddingVertical: 14,
        borderRadius: Radius.md,
        marginTop: Spacing.md,
    },
    parseBtnDisabled: {
        opacity: 0.5,
    },
    parseBtnText: {
        color: "#fff",
        fontSize: FontSize.md,
        fontWeight: "600",
    },
    resultsSection: {
        marginTop: Spacing.xxl,
    },
    resultsLabel: {
        fontSize: FontSize.sm,
        fontWeight: "600",
        color: Colors.light.textSecondary,
        marginBottom: Spacing.md,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    resultCard: {
        backgroundColor: Colors.light.bgCard,
        borderRadius: Radius.md,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
    },
    resultHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: Spacing.sm,
    },
    resultTitle: {
        flex: 1,
        fontSize: FontSize.md,
        fontWeight: "600",
        color: Colors.light.textPrimary,
    },
    resultMeta: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: Spacing.sm,
        marginTop: Spacing.sm,
    },
    metaChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: Radius.sm,
        backgroundColor: Colors.light.bg,
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
    },
    metaDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    metaText: {
        fontSize: FontSize.xs,
        color: Colors.light.textSecondary,
    },
    guessedLabel: {
        fontSize: 9,
        color: Colors.light.textTertiary,
        fontStyle: "italic",
    },
    resultNotes: {
        fontSize: FontSize.sm,
        color: Colors.light.textSecondary,
        marginTop: Spacing.sm,
        lineHeight: 18,
    },
    createBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: Spacing.sm,
        backgroundColor: Colors.light.success,
        paddingVertical: 14,
        borderRadius: Radius.md,
        marginTop: Spacing.sm,
    },
    createBtnText: {
        color: "#fff",
        fontSize: FontSize.md,
        fontWeight: "600",
    },
});
