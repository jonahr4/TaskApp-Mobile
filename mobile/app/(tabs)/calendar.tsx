import { useState, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";
import { useTasks } from "@/hooks/useTasks";
import { useTaskGroups } from "@/hooks/useTaskGroups";
import { Colors, Spacing, Radius, FontSize } from "@/lib/theme";
import { getQuadrant, QUADRANT_META } from "@/lib/types";
import type { Task, Quadrant } from "@/lib/types";
import TaskModal from "@/components/TaskModal";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay();
}

function formatDateStr(year: number, month: number, day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function CalendarScreen() {
    const { user } = useAuth();
    const { tasks } = useTasks(user?.uid);
    const { groups } = useTaskGroups(user?.uid);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editTask, setEditTask] = useState<Task | null>(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    // Map date strings → tasks
    const tasksByDate = useMemo(() => {
        const map: Record<string, Task[]> = {};
        for (const t of tasks) {
            if (t.dueDate) {
                if (!map[t.dueDate]) map[t.dueDate] = [];
                map[t.dueDate].push(t);
            }
        }
        return map;
    }, [tasks]);

    // Tasks for the selected date
    const selectedTasks = selectedDate ? (tasksByDate[selectedDate] ?? []) : [];

    const prevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
        setSelectedDate(null);
    };

    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
        setSelectedDate(null);
    };

    const todayStr = (() => {
        const d = new Date();
        return formatDateStr(d.getFullYear(), d.getMonth(), d.getDate());
    })();

    // Build calendar grid
    const calendarDays: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) calendarDays.push(null);
    for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Calendar</Text>
            </View>

            {/* Month Nav */}
            <View style={styles.monthNav}>
                <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
                    <Ionicons name="chevron-back" size={20} color={Colors.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.monthLabel}>
                    {MONTHS[month]} {year}
                </Text>
                <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
                    <Ionicons name="chevron-forward" size={20} color={Colors.light.textPrimary} />
                </TouchableOpacity>
            </View>

            {/* Day Headers */}
            <View style={styles.dayHeaders}>
                {DAYS.map((d) => (
                    <Text key={d} style={styles.dayHeader}>{d}</Text>
                ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.calGrid}>
                {calendarDays.map((day, i) => {
                    if (day === null) {
                        return <View key={`empty-${i}`} style={styles.calCell} />;
                    }
                    const dateStr = formatDateStr(year, month, day);
                    const dayTasks = tasksByDate[dateStr] ?? [];
                    const isToday = dateStr === todayStr;
                    const isSelected = dateStr === selectedDate;

                    // Get up to 3 dots for task priorities
                    const dots: string[] = [];
                    for (const t of dayTasks.slice(0, 3)) {
                        const q = getQuadrant(t);
                        if (q) {
                            dots.push(QUADRANT_META[q].color);
                        } else {
                            const group = groups.find((g) => g.id === t.groupId);
                            dots.push(group?.color || Colors.light.textTertiary);
                        }
                    }

                    return (
                        <TouchableOpacity
                            key={dateStr}
                            style={[
                                styles.calCell,
                                isToday && styles.calCellToday,
                                isSelected && styles.calCellSelected,
                            ]}
                            onPress={() => setSelectedDate(dateStr)}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={[
                                    styles.calDay,
                                    isToday && styles.calDayToday,
                                    isSelected && styles.calDaySelected,
                                ]}
                            >
                                {day}
                            </Text>
                            {dots.length > 0 && (
                                <View style={styles.dotRow}>
                                    {dots.map((c, idx) => (
                                        <View key={idx} style={[styles.taskDot, { backgroundColor: c }]} />
                                    ))}
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Selected Date Tasks */}
            <View style={styles.selectedSection}>
                {selectedDate ? (
                    <>
                        <Text style={styles.selectedDateLabel}>
                            {new Date(`${selectedDate}T12:00:00`).toLocaleDateString("en-US", {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                            })}
                        </Text>
                        <ScrollView style={styles.selectedTaskList} showsVerticalScrollIndicator={false}>
                            {selectedTasks.length === 0 ? (
                                <Text style={styles.noTasks}>No tasks on this date</Text>
                            ) : (
                                selectedTasks.map((task) => {
                                    const q = getQuadrant(task);
                                    const meta = q ? QUADRANT_META[q] : null;
                                    const group = groups.find((g) => g.id === task.groupId);
                                    return (
                                        <TouchableOpacity
                                            key={task.id}
                                            style={styles.selectedTask}
                                            onPress={() => {
                                                setEditTask(task);
                                                setModalOpen(true);
                                            }}
                                        >
                                            <View
                                                style={[
                                                    styles.taskColorBar,
                                                    { backgroundColor: meta?.color || group?.color || Colors.light.textTertiary },
                                                ]}
                                            />
                                            <View style={styles.taskInfo}>
                                                <Text
                                                    style={[
                                                        styles.taskTitle,
                                                        task.completed && styles.taskCompleted,
                                                    ]}
                                                    numberOfLines={1}
                                                >
                                                    {task.title}
                                                </Text>
                                                <View style={styles.taskSubRow}>
                                                    {task.dueTime && (
                                                        <Text style={styles.taskTime}>
                                                            {(() => {
                                                                const [hh, mm] = task.dueTime!.split(":").map(Number);
                                                                const p = hh >= 12 ? "PM" : "AM";
                                                                return `${hh % 12 || 12}:${String(mm).padStart(2, "0")} ${p}`;
                                                            })()}
                                                        </Text>
                                                    )}
                                                    {group && (
                                                        <Text style={[styles.taskGroup, { color: group.color || Colors.light.textTertiary }]}>
                                                            {group.name}
                                                        </Text>
                                                    )}
                                                    {meta && (
                                                        <Text style={[styles.taskPriority, { color: meta.color }]}>
                                                            {meta.sublabel}
                                                        </Text>
                                                    )}
                                                </View>
                                            </View>
                                            {task.completed && (
                                                <Ionicons name="checkmark-circle" size={18} color={Colors.light.success} />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </ScrollView>
                    </>
                ) : (
                    <Text style={styles.noTasks}>Tap a date to see tasks</Text>
                )}
            </View>

            <TaskModal
                visible={modalOpen}
                onClose={() => { setModalOpen(false); setEditTask(null); }}
                task={editTask}
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
    monthNav: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.light.bgCard,
    },
    navBtn: {
        padding: Spacing.sm,
    },
    monthLabel: {
        fontSize: FontSize.lg,
        fontWeight: "600",
        color: Colors.light.textPrimary,
    },
    dayHeaders: {
        flexDirection: "row",
        paddingHorizontal: Spacing.md,
        backgroundColor: Colors.light.bgCard,
        paddingBottom: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.borderLight,
    },
    dayHeader: {
        flex: 1,
        textAlign: "center",
        fontSize: FontSize.xs,
        fontWeight: "600",
        color: Colors.light.textTertiary,
        textTransform: "uppercase",
    },
    calGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.sm,
        backgroundColor: Colors.light.bgCard,
    },
    calCell: {
        width: `${100 / 7}%`,
        alignItems: "center",
        paddingVertical: Spacing.sm,
        minHeight: 44,
    },
    calCellToday: {
        backgroundColor: Colors.light.accentLight,
        borderRadius: Radius.md,
    },
    calCellSelected: {
        backgroundColor: Colors.light.accent,
        borderRadius: Radius.md,
    },
    calDay: {
        fontSize: FontSize.md,
        fontWeight: "500",
        color: Colors.light.textPrimary,
    },
    calDayToday: {
        color: Colors.light.accent,
        fontWeight: "700",
    },
    calDaySelected: {
        color: "#fff",
        fontWeight: "700",
    },
    dotRow: {
        flexDirection: "row",
        gap: 2,
        marginTop: 2,
    },
    taskDot: {
        width: 5,
        height: 5,
        borderRadius: 3,
    },
    selectedSection: {
        flex: 1,
        padding: Spacing.lg,
    },
    selectedDateLabel: {
        fontSize: FontSize.lg,
        fontWeight: "600",
        color: Colors.light.textPrimary,
        marginBottom: Spacing.md,
    },
    selectedTaskList: {
        flex: 1,
    },
    noTasks: {
        fontSize: FontSize.md,
        color: Colors.light.textTertiary,
        textAlign: "center",
        paddingTop: Spacing.xxl,
    },
    selectedTask: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.light.bgCard,
        borderRadius: Radius.md,
        marginBottom: Spacing.sm,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
    },
    taskColorBar: {
        width: 4,
        alignSelf: "stretch",
    },
    taskInfo: {
        flex: 1,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
    },
    taskTitle: {
        fontSize: FontSize.md,
        fontWeight: "500",
        color: Colors.light.textPrimary,
    },
    taskCompleted: {
        textDecorationLine: "line-through",
        color: Colors.light.textTertiary,
    },
    taskSubRow: {
        flexDirection: "row",
        gap: Spacing.sm,
        marginTop: 2,
    },
    taskTime: {
        fontSize: FontSize.xs,
        color: Colors.light.textSecondary,
    },
    taskGroup: {
        fontSize: FontSize.xs,
        fontWeight: "500",
    },
    taskPriority: {
        fontSize: FontSize.xs,
        fontWeight: "600",
    },
});
