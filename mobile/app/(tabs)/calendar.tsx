import { useState, useMemo, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";
import { useTasks } from "@/hooks/useTasks";
import { useTaskGroups } from "@/hooks/useTaskGroups";
import { Colors, Spacing, Radius, FontSize, Shadows } from "@/lib/theme";
import { getQuadrant, QUADRANT_META } from "@/lib/types";
import type { Task, TaskGroup, Quadrant } from "@/lib/types";
import TaskModal from "@/components/TaskModal";
import { GroupFilterDropdown } from "@/components/GroupFilterDropdown";
import ScreenHeader from "@/components/ScreenHeader";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

type StatusFilter = "all" | "in_progress" | "completed";
const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "in_progress", label: "In Progress" },
    { key: "completed", label: "Completed" },
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

const MAX_DOT_ROWS = 2;
const DOTS_PER_ROW = 3;

export default function CalendarScreen() {
    const { user } = useAuth();
    const { tasks } = useTasks(user?.uid);
    const { groups } = useTaskGroups(user?.uid);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editTask, setEditTask] = useState<Task | null>(null);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [showFilterMenu, setShowFilterMenu] = useState(false);

    // Group filter — start with all selected
    const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(() => {
        const s = new Set<string>();
        s.add(""); // General Tasks
        for (const g of groups) s.add(g.id);
        return s;
    });
    // Keep in sync when groups change
    useMemo(() => {
        setSelectedGroupIds((prev) => {
            const next = new Set(prev);
            if (!next.has("")) next.add("");
            for (const g of groups) {
                if (!next.has(g.id)) next.add(g.id);
            }
            return next;
        });
    }, [groups]);

    const allGroupIds = useMemo(() => {
        const s = new Set<string>();
        s.add("");
        for (const g of groups) s.add(g.id);
        return s;
    }, [groups]);

    const handleToggleGroup = useCallback((id: string) => {
        setSelectedGroupIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const handleSelectAllGroups = useCallback(() => {
        setSelectedGroupIds((prev) => {
            const allCount = allGroupIds.size;
            if (prev.size === allCount) return new Set<string>(); // deselect all
            return new Set(allGroupIds);
        });
    }, [allGroupIds]);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const today = new Date();
    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

    // Group lookup
    const groupMap = useMemo(() => {
        const m: Record<string, TaskGroup> = {};
        for (const g of groups) m[g.id] = g;
        return m;
    }, [groups]);

    // Filter tasks by status
    const filteredTasks = useMemo(() => {
        let pool = tasks;
        // Group filter
        if (selectedGroupIds.size < allGroupIds.size) {
            pool = pool.filter(t => selectedGroupIds.has(t.groupId || ""));
        }
        // Status filter
        if (statusFilter === "in_progress") pool = pool.filter(t => !t.completed);
        else if (statusFilter === "completed") pool = pool.filter(t => t.completed);
        return pool;
    }, [tasks, statusFilter, selectedGroupIds, allGroupIds]);

    // Map date strings → tasks
    const tasksByDate = useMemo(() => {
        const map: Record<string, Task[]> = {};
        for (const t of filteredTasks) {
            if (t.dueDate) {
                if (!map[t.dueDate]) map[t.dueDate] = [];
                map[t.dueDate].push(t);
            }
        }
        return map;
    }, [filteredTasks]);

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

    const goToToday = () => {
        setCurrentDate(new Date());
        const d = new Date();
        setSelectedDate(formatDateStr(d.getFullYear(), d.getMonth(), d.getDate()));
    };

    const todayStr = (() => {
        const d = new Date();
        return formatDateStr(d.getFullYear(), d.getMonth(), d.getDate());
    })();

    // Build calendar grid
    const calendarDays: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) calendarDays.push(null);
    for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

    // Get dot colors for a day — color by group, max 12 dots (4 rows × 3)
    const getDotsForDay = useCallback((dayTasks: Task[]) => {
        const maxDots = MAX_DOT_ROWS * DOTS_PER_ROW;
        const dots: string[] = [];
        for (const t of dayTasks.slice(0, maxDots)) {
            const group = t.groupId ? groupMap[t.groupId] : null;
            dots.push(group?.color || Colors.light.textTertiary);
        }
        return dots;
    }, [groupMap]);

    const handleAddTaskOnDate = useCallback(() => {
        setEditTask(null);
        setModalOpen(true);
    }, []);

    return (
        <View style={styles.container}>
            {/* Header */}
            <ScreenHeader title="Calendar" />

            {/* Filter Bar */}
            <View style={styles.filterBar}>
                <View>
                    <TouchableOpacity
                        style={[
                            styles.filterChip,
                            statusFilter !== "all" && styles.filterChipActive,
                        ]}
                        onPress={() => setShowFilterMenu(!showFilterMenu)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="filter-outline" size={12} color={statusFilter !== "all" ? Colors.light.accent : Colors.light.textSecondary} />
                        <Text style={[styles.filterChipText, statusFilter !== "all" && styles.filterChipTextActive]}>
                            {STATUS_OPTIONS.find((o) => o.key === statusFilter)?.label ?? "All"}
                        </Text>
                        <Ionicons name="chevron-down" size={10} color={Colors.light.textTertiary} />
                    </TouchableOpacity>
                    {showFilterMenu && (
                        <View style={styles.filterDropdown}>
                            {STATUS_OPTIONS.map((opt) => (
                                <TouchableOpacity
                                    key={opt.key}
                                    style={[
                                        styles.filterOption,
                                        statusFilter === opt.key && styles.filterOptionActive,
                                    ]}
                                    onPress={() => {
                                        setStatusFilter(opt.key);
                                        setShowFilterMenu(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.filterOptionText,
                                        statusFilter === opt.key && styles.filterOptionTextActive,
                                    ]}>
                                        {opt.label}
                                    </Text>
                                    {statusFilter === opt.key && (
                                        <Ionicons name="checkmark" size={14} color={Colors.light.accent} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Spacer */}
                <View style={{ flex: 1 }} />

                {/* Group filter */}
                <GroupFilterDropdown
                    groups={groups}
                    selectedIds={selectedGroupIds}
                    onToggle={handleToggleGroup}
                    onSelectAll={handleSelectAllGroups}
                />

                {/* Return to Today */}
                {!isCurrentMonth && (
                    <TouchableOpacity onPress={goToToday} style={styles.todayBtn} activeOpacity={0.7}>
                        <Ionicons name="today-outline" size={12} color={Colors.light.accent} />
                        <Text style={styles.todayBtnText}>Today</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Dismiss filter menu backdrop */}
            {showFilterMenu && (
                <Pressable
                    style={StyleSheet.absoluteFillObject}
                    onPress={() => setShowFilterMenu(false)}
                />
            )}

            {/* Month Nav */}
            <View style={styles.monthRow}>
                <TouchableOpacity onPress={prevMonth} style={styles.monthNavBtn}>
                    <Ionicons name="chevron-back" size={18} color={Colors.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.monthLabel}>
                    {MONTHS[month]} {year}
                </Text>
                <TouchableOpacity onPress={nextMonth} style={styles.monthNavBtn}>
                    <Ionicons name="chevron-forward" size={18} color={Colors.light.textPrimary} />
                </TouchableOpacity>
            </View>

            <View style={styles.dayHeaderRow}>
                {DAYS.map((d) => (
                    <View key={d} style={styles.dayHeader}>
                        <Text style={styles.dayHeaderText}>{d}</Text>
                    </View>
                ))}
            </View>

            <View style={styles.calGrid}>
                {calendarDays.map((day, i) => {
                    if (day === null) {
                        return <View key={`empty-${i}`} style={styles.calCell} />;
                    }
                    const dateStr = formatDateStr(year, month, day);
                    const dayTasks = tasksByDate[dateStr] ?? [];
                    const isToday = dateStr === todayStr;
                    const isSelected = dateStr === selectedDate;

                    // Get dots colored by group
                    const dots = getDotsForDay(dayTasks);
                    // Build grid rows (max 4 rows of 3)
                    const dotRows: string[][] = [];
                    for (let r = 0; r < Math.min(MAX_DOT_ROWS, Math.ceil(dots.length / DOTS_PER_ROW)); r++) {
                        dotRows.push(dots.slice(r * DOTS_PER_ROW, (r + 1) * DOTS_PER_ROW));
                    }

                    return (
                        <TouchableOpacity
                            key={dateStr}
                            style={styles.calCell}
                            onPress={() => setSelectedDate(dateStr)}
                            activeOpacity={0.7}
                        >
                            <View
                                style={[
                                    styles.calCellInner,
                                    isToday && styles.calCellToday,
                                    isSelected && styles.calCellSelected,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.calCellText,
                                        isToday && styles.calCellTextToday,
                                        isSelected && styles.calCellTextSelected,
                                    ]}
                                >
                                    {day}
                                </Text>
                            </View>
                            {dotRows.length > 0 && (
                                <View style={{ alignItems: "center", gap: 1, marginTop: 2 }}>
                                    {dotRows.map((row, rIdx) => (
                                        <View key={rIdx} style={styles.dotsRow}>
                                            {row.map((c, cIdx) => (
                                                <View key={cIdx} style={[styles.taskDot, { backgroundColor: c }]} />
                                            ))}
                                        </View>
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
                        <View style={styles.selectedHeader}>
                            <Text style={styles.selectedDateLabel}>
                                {new Date(`${selectedDate}T12:00:00`).toLocaleDateString("en-US", {
                                    weekday: "long",
                                    month: "long",
                                    day: "numeric",
                                })}
                            </Text>
                            <TouchableOpacity
                                style={styles.addTaskBtn}
                                onPress={handleAddTaskOnDate}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="add-circle" size={20} color={Colors.light.accent} />
                                <Text style={styles.addTaskBtnText}>Add</Text>
                            </TouchableOpacity>
                        </View>
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
                                                    { backgroundColor: group?.color || meta?.color || Colors.light.textTertiary },
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
                defaultDueDate={selectedDate}
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
        ...Shadows.sm,
    },
    headerTitle: {
        fontSize: FontSize.title,
        fontWeight: "800",
        color: Colors.light.textPrimary,
        letterSpacing: -0.5,
    },
    monthRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
    },
    monthLabel: {
        fontSize: FontSize.xl,
        fontWeight: "700",
        color: Colors.light.textPrimary,
        letterSpacing: -0.3,
    },
    monthNav: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
    },
    monthNavBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.light.bg,
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
        justifyContent: "center",
        alignItems: "center",
    },
    todayBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: Radius.full,
        backgroundColor: Colors.light.accentLight,
        flexShrink: 0,
    },
    todayBtnText: {
        fontSize: FontSize.xs,
        fontWeight: "700",
        color: Colors.light.accent,
    },
    filterBar: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.sm,
        zIndex: 20,
    },
    filterChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: Radius.full,
        backgroundColor: Colors.light.bgCard,
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
    },
    filterChipActive: {
        backgroundColor: Colors.light.accentLight,
        borderColor: Colors.light.accent,
    },
    filterChipText: {
        fontSize: FontSize.xs,
        fontWeight: "500",
        color: Colors.light.textSecondary,
    },
    filterChipTextActive: {
        color: Colors.light.accent,
    },
    filterDropdown: {
        position: "absolute",
        top: 38,
        left: 0,
        backgroundColor: Colors.light.bgCard,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
        ...Shadows.lg,
        zIndex: 30,
        minWidth: 160,
        overflow: "hidden",
    },
    filterOption: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    filterOptionActive: {
        backgroundColor: Colors.light.accentLight,
    },
    filterOptionText: {
        fontSize: FontSize.sm,
        color: Colors.light.textPrimary,
    },
    filterOptionTextActive: {
        color: Colors.light.accent,
        fontWeight: "600" as const,
    },
    calGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        paddingHorizontal: Spacing.md,
    },
    dayHeaderRow: {
        flexDirection: "row",
        marginBottom: Spacing.xs,
    },
    dayHeader: {
        width: `${100 / 7}%` as any,
        alignItems: "center",
        paddingVertical: 6,
    },
    dayHeaderText: {
        fontSize: FontSize.xs,
        fontWeight: "700",
        color: Colors.light.textTertiary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    calRow: {
        flexDirection: "row",
    },
    calCell: {
        width: `${100 / 7}%` as any,
        alignItems: "center",
        paddingVertical: 5,
        minHeight: 48,
    },
    calCellInner: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
    },
    calCellSelected: {
        backgroundColor: Colors.light.accent,
    },
    calCellToday: {
        backgroundColor: Colors.light.accentLight,
    },
    calCellText: {
        fontSize: FontSize.sm,
        fontWeight: "500",
        color: Colors.light.textPrimary,
    },
    calCellTextSelected: {
        color: "#fff",
        fontWeight: "700",
    },
    calCellTextToday: {
        color: Colors.light.accent,
        fontWeight: "700",
    },
    calCellTextOther: {
        color: Colors.light.textTertiary,
    },
    dotsRow: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 3,
        marginTop: 3,
    },
    taskDot: {
        width: 5,
        height: 5,
        borderRadius: 3,
    },
    selectedSection: {
        flex: 1,
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg,
    },
    selectedHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: Spacing.lg,
    },
    selectedDateLabel: {
        fontSize: FontSize.lg,
        fontWeight: "700",
        color: Colors.light.textPrimary,
    },
    addTaskBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: Radius.full,
        backgroundColor: Colors.light.accentLight,
    },
    addTaskBtnText: {
        fontSize: FontSize.xs,
        fontWeight: "600",
        color: Colors.light.accent,
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
        borderRadius: Radius.lg,
        marginBottom: Spacing.sm,
        overflow: "hidden",
        borderWidth: 0,
        ...Shadows.sm,
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
