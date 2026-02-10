import { useState, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/hooks/useAuth";
import { useTasks } from "@/hooks/useTasks";
import { useTaskGroups } from "@/hooks/useTaskGroups";
import { updateTask, deleteTask } from "@/lib/firestore";
import { Colors, Spacing, Radius, FontSize } from "@/lib/theme";
import { getQuadrant, QUADRANT_META } from "@/lib/types";
import type { Task, Quadrant } from "@/lib/types";
import TaskModal from "@/components/TaskModal";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const quadrants: Quadrant[] = ["DO", "SCHEDULE", "DELEGATE", "DELETE"];

export default function MatrixScreen() {
    const { user } = useAuth();
    const { tasks } = useTasks(user?.uid);
    const { groups } = useTaskGroups(user?.uid);

    const [modalOpen, setModalOpen] = useState(false);
    const [editTask, setEditTask] = useState<Task | null>(null);
    const [defaultUrgent, setDefaultUrgent] = useState<boolean>(false);
    const [defaultImportant, setDefaultImportant] = useState<boolean>(false);

    const tasksByQuadrant = useMemo(() => {
        const result: Record<Quadrant, Task[]> = {
            DO: [],
            SCHEDULE: [],
            DELEGATE: [],
            DELETE: [],
        };
        for (const t of tasks) {
            if (t.completed) continue;
            const q = getQuadrant(t);
            if (q) result[q].push(t);
        }
        return result;
    }, [tasks]);

    const handleToggle = async (task: Task) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await updateTask(user!.uid, task.id, { completed: !task.completed });
    };

    const openNewInQuadrant = (q: Quadrant) => {
        const meta = QUADRANT_META[q];
        setEditTask(null);
        setDefaultUrgent(meta.urgent);
        setDefaultImportant(meta.important);
        setModalOpen(true);
    };

    const openEdit = (task: Task) => {
        setEditTask(task);
        setModalOpen(true);
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Matrix</Text>
            </View>

            {/* 2x2 Grid */}
            <View style={styles.grid}>
                {quadrants.map((q) => {
                    const meta = QUADRANT_META[q];
                    const qTasks = tasksByQuadrant[q];
                    return (
                        <View key={q} style={[styles.quadrant, { borderColor: meta.border }]}>
                            {/* Quadrant Header */}
                            <View style={[styles.qHeader, { backgroundColor: meta.bg }]}>
                                <View style={styles.qHeaderLeft}>
                                    <View style={[styles.qDot, { backgroundColor: meta.color }]} />
                                    <Text style={[styles.qLabel, { color: meta.color }]}>
                                        {meta.sublabel}
                                    </Text>
                                    <Text style={styles.qCount}>{qTasks.length}</Text>
                                </View>
                                <TouchableOpacity onPress={() => openNewInQuadrant(q)}>
                                    <Ionicons name="add-circle-outline" size={20} color={meta.color} />
                                </TouchableOpacity>
                            </View>

                            {/* Tasks */}
                            <ScrollView
                                style={styles.qTaskList}
                                showsVerticalScrollIndicator={false}
                            >
                                {qTasks.map((task) => (
                                    <TouchableOpacity
                                        key={task.id}
                                        style={styles.qTask}
                                        onPress={() => openEdit(task)}
                                        activeOpacity={0.7}
                                    >
                                        <TouchableOpacity
                                            style={styles.qCheckbox}
                                            onPress={() => handleToggle(task)}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <View style={[styles.qCheckInner, { borderColor: meta.color }]} />
                                        </TouchableOpacity>
                                        <Text style={styles.qTaskTitle} numberOfLines={2}>
                                            {task.title}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                                {qTasks.length === 0 && (
                                    <Text style={styles.qEmpty}>No tasks</Text>
                                )}
                            </ScrollView>
                        </View>
                    );
                })}
            </View>

            {/* Uncategorized count */}
            {(() => {
                const uncategorizedCount = tasks.filter(
                    (t) => !t.completed && getQuadrant(t) === null
                ).length;
                if (uncategorizedCount === 0) return null;
                return (
                    <View style={styles.uncategorizedBar}>
                        <Ionicons name="help-circle-outline" size={16} color={Colors.light.textTertiary} />
                        <Text style={styles.uncategorizedText}>
                            {uncategorizedCount} uncategorized task{uncategorizedCount !== 1 ? "s" : ""}
                        </Text>
                    </View>
                );
            })()}

            <TaskModal
                visible={modalOpen}
                onClose={() => { setModalOpen(false); setEditTask(null); }}
                task={editTask}
                defaultUrgent={defaultUrgent}
                defaultImportant={defaultImportant}
                groups={groups}
            />
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
    grid: {
        flex: 1,
        flexDirection: "row",
        flexWrap: "wrap",
        padding: Spacing.sm,
    },
    quadrant: {
        width: "50%",
        height: "50%",
        padding: Spacing.xs,
    },
    qHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.md,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        borderWidth: 1,
        borderBottomWidth: 0,
        borderColor: "transparent",
    },
    qHeaderLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    qDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    qLabel: {
        fontSize: FontSize.sm,
        fontWeight: "700",
    },
    qCount: {
        fontSize: FontSize.xs,
        color: Colors.light.textTertiary,
        fontWeight: "500",
        marginLeft: 2,
    },
    qTaskList: {
        flex: 1,
        backgroundColor: Colors.light.bgCard,
        borderRadius: Radius.md,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderWidth: 1,
        borderTopWidth: 0,
        borderColor: Colors.light.borderLight,
        padding: Spacing.sm,
    },
    qTask: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 6,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.light.borderLight,
    },
    qCheckbox: {
        padding: 2,
    },
    qCheckInner: {
        width: 16,
        height: 16,
        borderRadius: 4,
        borderWidth: 1.5,
    },
    qTaskTitle: {
        flex: 1,
        fontSize: FontSize.sm,
        color: Colors.light.textPrimary,
        lineHeight: 18,
    },
    qEmpty: {
        fontSize: FontSize.xs,
        color: Colors.light.textTertiary,
        textAlign: "center",
        paddingVertical: Spacing.lg,
    },
    uncategorizedBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.light.bgCard,
        borderTopWidth: 1,
        borderTopColor: Colors.light.borderLight,
    },
    uncategorizedText: {
        fontSize: FontSize.sm,
        color: Colors.light.textTertiary,
    },
});
