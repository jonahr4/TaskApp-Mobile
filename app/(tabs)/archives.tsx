/**
 * Archives tab — mirrors the desktop web app's Archives page
 * (TheTaskApp `src/app/archives/page.tsx`).
 *
 * Lists archived tasks (and archived groups) from the SAME Firestore
 * collections the desktop uses (`users/{uid}/tasks`, `users/{uid}/taskGroups`,
 * `archived` boolean flag) and lets the user unarchive them.
 * No backend or schema changes — this only reads/writes the existing fields.
 */
import ScreenHeader from "@/components/ScreenHeader";
import { useAuth } from "@/hooks/useAuth";
import { useTaskGroups } from "@/hooks/useTaskGroups";
import { useTasks } from "@/hooks/useTasks";
import { useColors } from "@/hooks/useTheme";
import {
    buildArchiveCards,
    unarchiveGroupData,
    unarchiveTaskData,
    visibleArchiveCards,
} from "@/lib/archiveUtils";
import { updateGroupUnified, updateTaskUnified } from "@/lib/crud";
import { Colors, FontSize, Radius, Shadows, Spacing } from "@/lib/theme";
import type { Task } from "@/lib/types";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useCallback, useMemo } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

function formatDueDateTime(task: Task): string | null {
    if (!task.dueDate) return null;
    const d = new Date(`${task.dueDate}T00:00:00`);
    let str = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (task.dueTime) {
        const [hh, mm] = task.dueTime.split(":").map(Number);
        const period = hh >= 12 ? "PM" : "AM";
        const h12 = hh % 12 || 12;
        str += ` • ${h12}:${String(mm).padStart(2, "0")} ${period}`;
    }
    return str;
}

export default function ArchivesScreen() {
    const { user } = useAuth();
    const C = useColors();
    const styles = useMemo(() => makeStyles(C), [C]);

    // includeArchived = true: fetch everything, then filter locally —
    // exactly like the desktop Archives page does.
    const { tasks: allTasks, loading: tasksLoading } = useTasks(user?.uid, true);
    const { groups: allGroups, loading: groupsLoading } = useTaskGroups(user?.uid, true);

    const cards = useMemo(
        () => visibleArchiveCards(buildArchiveCards(allTasks, allGroups)),
        [allTasks, allGroups]
    );
    const totalArchived = useMemo(
        () => cards.reduce((n, c) => n + c.tasks.length, 0),
        [cards]
    );

    const handleUnarchiveTask = useCallback(
        async (taskId: string) => {
            try {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                await updateTaskUnified(user?.uid, taskId, unarchiveTaskData());
            } catch {
                Alert.alert("Couldn't unarchive", "Please try again.");
            }
        },
        [user?.uid]
    );

    const handleUnarchiveGroup = useCallback(
        async (groupId: string) => {
            try {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                await updateGroupUnified(user?.uid, groupId, unarchiveGroupData());
            } catch {
                Alert.alert("Couldn't unarchive", "Please try again.");
            }
        },
        [user?.uid]
    );

    if (tasksLoading || groupsLoading) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Archives" />
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={C.accent} />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScreenHeader title="Archives" />
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {cards.length === 0 ? (
                    <View style={styles.empty}>
                        <Ionicons name="archive-outline" size={48} color={C.textTertiary} />
                        <Text style={styles.emptyTitle}>No archived tasks</Text>
                        <Text style={styles.emptySubtitle}>
                            Tasks you archive on the web app will show up here.
                        </Text>
                    </View>
                ) : (
                    cards.map((card) => (
                        <View key={card.id ?? "general"} style={styles.card}>
                            <View style={styles.cardHeader}>
                                <View style={styles.cardTitleRow}>
                                    <View
                                        style={[
                                            styles.colorDot,
                                            { backgroundColor: card.color },
                                        ]}
                                    />
                                    <Text style={styles.cardTitle}>{card.name}</Text>
                                    {card.tasks.length > 0 && (
                                        <View style={styles.countBadge}>
                                            <Text style={styles.countText}>
                                                {card.tasks.length}
                                            </Text>
                                        </View>
                                    )}
                                    {card.isGroupArchived && (
                                        <Text style={styles.archivedTag}>archived</Text>
                                    )}
                                </View>
                                {card.isGroupArchived && card.id && (
                                    <TouchableOpacity
                                        style={styles.iconButton}
                                        onPress={() => handleUnarchiveGroup(card.id!)}
                                        accessibilityLabel="Unarchive group"
                                        hitSlop={8}
                                    >
                                        <Ionicons
                                            name="arrow-undo-outline"
                                            size={18}
                                            color={C.textTertiary}
                                        />
                                    </TouchableOpacity>
                                )}
                            </View>
                            {card.tasks.length === 0 ? (
                                <Text style={styles.emptyCardText}>
                                    No archived tasks in this list
                                </Text>
                            ) : (
                                card.tasks.map((task) => {
                                    const due = formatDueDateTime(task);
                                    return (
                                        <View key={task.id} style={styles.taskRow}>
                                            <View style={styles.taskInfo}>
                                                <Text
                                                    style={[
                                                        styles.taskTitle,
                                                        task.completed && styles.taskTitleCompleted,
                                                    ]}
                                                    numberOfLines={2}
                                                >
                                                    {task.title}
                                                </Text>
                                                {due && (
                                                    <Text style={styles.taskDue}>{due}</Text>
                                                )}
                                            </View>
                                            <TouchableOpacity
                                                style={styles.iconButton}
                                                onPress={() => handleUnarchiveTask(task.id)}
                                                accessibilityLabel={`Unarchive ${task.title}`}
                                                hitSlop={8}
                                            >
                                                <Ionicons
                                                    name="arrow-undo-outline"
                                                    size={18}
                                                    color={C.textTertiary}
                                                />
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })
                            )}
                        </View>
                    ))
                )}
                {totalArchived > 0 && (
                    <Text style={styles.footer}>
                        {totalArchived} archived {totalArchived === 1 ? "task" : "tasks"}
                    </Text>
                )}
            </ScrollView>
        </View>
    );
}

function makeStyles(C: typeof Colors.light) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: C.bg,
        },
        centered: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
        },
        scroll: {
            flex: 1,
        },
        scrollContent: {
            padding: Spacing.lg,
            paddingBottom: Spacing.xxxl,
        },
        card: {
            backgroundColor: C.bgCard,
            borderRadius: Radius.lg,
            borderWidth: 1,
            borderColor: C.border,
            marginBottom: Spacing.md,
            overflow: "hidden",
            ...Shadows.sm,
        },
        cardHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: Spacing.lg,
            paddingVertical: Spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
        },
        cardTitleRow: {
            flexDirection: "row",
            alignItems: "center",
            flex: 1,
        },
        colorDot: {
            width: 10,
            height: 10,
            borderRadius: 5,
            marginRight: Spacing.sm,
        },
        cardTitle: {
            fontSize: FontSize.md,
            fontWeight: "600",
            color: C.textPrimary,
        },
        countBadge: {
            marginLeft: Spacing.sm,
            backgroundColor: C.bg,
            borderRadius: Radius.full,
            paddingHorizontal: Spacing.sm,
            paddingVertical: 2,
        },
        countText: {
            fontSize: FontSize.xs,
            fontWeight: "600",
            color: C.textTertiary,
        },
        archivedTag: {
            marginLeft: Spacing.sm,
            fontSize: FontSize.xs,
            color: C.textTertiary,
            fontStyle: "italic",
        },
        taskRow: {
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: Spacing.lg,
            paddingVertical: Spacing.md,
            borderTopWidth: 1,
            borderTopColor: C.border,
        },
        taskInfo: {
            flex: 1,
            marginRight: Spacing.sm,
        },
        taskTitle: {
            fontSize: FontSize.md,
            color: C.textPrimary,
        },
        taskTitleCompleted: {
            textDecorationLine: "line-through",
            color: C.textTertiary,
        },
        taskDue: {
            fontSize: FontSize.xs,
            color: C.textTertiary,
            marginTop: 2,
        },
        iconButton: {
            width: 34,
            height: 34,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: Radius.md,
        },
        emptyCardText: {
            fontSize: FontSize.xs,
            color: C.textTertiary,
            textAlign: "center",
            paddingVertical: Spacing.xl,
        },
        empty: {
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 80,
            paddingHorizontal: Spacing.xxl,
        },
        emptyTitle: {
            fontSize: FontSize.lg,
            fontWeight: "600",
            color: C.textPrimary,
            marginTop: Spacing.lg,
        },
        emptySubtitle: {
            fontSize: FontSize.sm,
            color: C.textTertiary,
            textAlign: "center",
            marginTop: Spacing.sm,
        },
        footer: {
            fontSize: FontSize.xs,
            color: C.textTertiary,
            textAlign: "center",
            marginTop: Spacing.sm,
        },
    });
}
