import { useRef, useState, useMemo, useCallback, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Dimensions,
    ScrollView,
    Alert,
    Animated,
    Pressable,
    NativeSyntheticEvent,
    NativeScrollEvent,
    RefreshControl,
    LayoutAnimation,
    UIManager,
    Platform,
    Modal,
    ActionSheetIOS,
} from "react-native";
import PagerView from "react-native-pager-view";
import DraggableFlatList, { ScaleDecorator } from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/hooks/useAuth";
import { useTasks } from "@/hooks/useTasks";
import { useTaskGroups } from "@/hooks/useTaskGroups";
import { useAutoUrgent } from "@/hooks/useAutoUrgent";
import { updateTaskUnified, deleteTaskUnified, createGroupUnified, updateGroupUnified, createTaskUnified, reorderGroupsUnified } from "@/lib/crud";
import { Colors, Spacing, Radius, FontSize, Shadows, SCREEN } from "@/lib/theme";
import { useColors, useTheme } from "@/hooks/useTheme";
import { getQuadrant, QUADRANT_META } from "@/lib/types";
import type { Task, TaskGroup } from "@/lib/types";
import TaskModal from "@/components/TaskModal";
import GroupModal from "@/components/GroupModal";
import ScreenHeader from "@/components/ScreenHeader";
import { loadSettings, rescheduleAllReminders } from "@/lib/notifications";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PEEK_WIDTH = 24;
const CARD_GAP = 10;
const CARD_WIDTH = SCREEN_WIDTH - PEEK_WIDTH * 2 - CARD_GAP;

type StatusFilter = "all" | "in_progress" | "completed";
type SortOption = "due_date" | "date_created" | "alphabetical" | "priority";

const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "in_progress", label: "In Progress" },
    { key: "completed", label: "Completed" },
];

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
    { key: "due_date", label: "Due Date" },
    { key: "date_created", label: "Date Created" },
    { key: "alphabetical", label: "Alphabetical" },
    { key: "priority", label: "Priority" },
];

function sortTasks(tasks: Task[], sortBy: SortOption): Task[] {
    return [...tasks].sort((a, b) => {
        switch (sortBy) {
            case "due_date":
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return a.dueDate.localeCompare(b.dueDate);
            case "date_created":
                return (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0);
            case "alphabetical":
                return a.title.localeCompare(b.title);
            case "priority": {
                const order = { DO: 0, DELEGATE: 1, SCHEDULE: 2, DELETE: 3 };
                const qa = getQuadrant(a);
                const qb = getQuadrant(b);
                const va = qa ? order[qa] : 4;
                const vb = qb ? order[qb] : 4;
                return va - vb;
            }
            default:
                return 0;
        }
    });
}

function formatDueDateTime(task: Task): string | null {
    if (!task.dueDate) return null;
    const d = new Date(`${task.dueDate}T00:00:00`);
    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    let str = d.toLocaleDateString("en-US", options);
    if (task.dueTime) {
        const [hh, mm] = task.dueTime.split(":").map(Number);
        const period = hh >= 12 ? "PM" : "AM";
        const h12 = hh % 12 || 12;
        str += ` • ${h12}:${String(mm).padStart(2, "0")} ${period}`;
    }
    return str;
}

function TaskRow({
    task,
    group,
    onToggle,
    onPress,
    onDelete,
    onDuplicate,
}: {
    task: Task;
    group?: TaskGroup;
    onToggle: () => void;
    onPress: () => void;
    onDelete: () => void;
    onDuplicate: () => void;
}) {
    const C = useColors();
    const { isDark } = useTheme();
    const styles = useMemo(() => makeStyles(C), [C]);
    const quadrant = getQuadrant(task);
    const meta = quadrant ? QUADRANT_META[quadrant] : null;
    const due = formatDueDateTime(task);

    const quadColor = meta ? (isDark ? meta.darkColor : meta.color) : null;
    const quadBg = meta ? (isDark ? meta.darkBg : meta.bg) : null;
    const quadBorder = meta ? (isDark ? meta.darkBorder : meta.border) : null;

    const showMenu = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (Platform.OS === "ios") {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ["Cancel", "Duplicate", "Delete"],
                    destructiveButtonIndex: 2,
                    cancelButtonIndex: 0,
                    title: task.title,
                },
                (idx) => {
                    if (idx === 1) onDuplicate();
                    if (idx === 2) onDelete();
                }
            );
        } else {
            Alert.alert(task.title, undefined, [
                { text: "Duplicate", onPress: onDuplicate },
                { text: "Delete", style: "destructive", onPress: onDelete },
                { text: "Cancel", style: "cancel" },
            ]);
        }
    }, [onDuplicate, onDelete, task.title]);

    return (
        <TouchableOpacity
            style={styles.taskRow}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <TouchableOpacity
                style={[
                    styles.checkbox,
                    task.completed && styles.checkboxChecked,
                ]}
                onPress={onToggle}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                {task.completed && (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                )}
            </TouchableOpacity>

            <View style={styles.taskContent}>
                <Text
                    style={[
                        styles.taskTitle,
                        task.completed && styles.taskTitleCompleted,
                    ]}
                    numberOfLines={2}
                >
                    {task.title}
                </Text>
                <View style={styles.taskMeta}>
                    {due
                        ? <Text style={styles.taskDue}>{due}</Text>
                        : <View style={{ flex: 1 }} />
                    }
                    {due && <View style={{ flex: 1 }} />}
                    {meta && quadColor && quadBg && quadBorder && (
                        <View style={[styles.priorityBadge, { backgroundColor: quadBg, borderColor: quadBorder }]}>
                            <Text style={[styles.priorityText, { color: quadColor }]} numberOfLines={1}>
                                {meta.sublabel}
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            <TouchableOpacity
                onPress={showMenu}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.menuBtn}
            >
                <Ionicons name="ellipsis-vertical" size={17} color={C.textTertiary} />
            </TouchableOpacity>
        </TouchableOpacity>
    );
}

function GroupPage({
    group,
    tasks,
    uid,
    onEditTask,
    onAddTask,
    onEditGroup,
    onLocalChange,
    statusFilter,
    sortBy,
    onRefresh,
}: {
    group: TaskGroup | null;
    tasks: Task[];
    uid: string | undefined;
    onEditTask: (t: Task) => void;
    onAddTask: (groupId: string | null) => void;
    onEditGroup?: (g: TaskGroup) => void;
    onLocalChange?: () => void;
    statusFilter: StatusFilter;
    sortBy: SortOption;
    onRefresh?: () => Promise<void>;
}) {
    const C = useColors();
    const styles = useMemo(() => makeStyles(C), [C]);
    const groupName = group?.name ?? "General Tasks";
    const groupColor = group?.color ?? C.textTertiary;

    // Apply status filter
    const filteredTasks = useMemo(() => {
        let filtered = tasks;
        if (statusFilter === "in_progress") filtered = tasks.filter((t) => !t.completed);
        else if (statusFilter === "completed") filtered = tasks.filter((t) => t.completed);
        return sortTasks(filtered, sortBy);
    }, [tasks, statusFilter, sortBy]);

    const activeTasks = filteredTasks.filter((t) => !t.completed);
    const completedTasks = filteredTasks.filter((t) => t.completed);
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await onRefresh?.();
        setRefreshing(false);
    }, [onRefresh]);

    const handleToggle = async (task: Task) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await updateTaskUnified(uid, task.id, { completed: !task.completed });
        if (!uid) onLocalChange?.();
    };

    const handleDelete = (task: Task) => {
        Alert.alert("Delete Task", `Delete "${task.title}"?`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    await deleteTaskUnified(uid, task.id);
                    if (!uid) onLocalChange?.();
                },
            },
        ]);
    };

    const handleDuplicate = async (task: Task) => {
        await createTaskUnified(uid, {
            title: `${task.title} (copy)`,
            notes: task.notes,
            dueDate: task.dueDate,
            dueTime: task.dueTime,
            urgent: task.urgent,
            important: task.important,
            groupId: task.groupId,
            completed: false,
            order: task.order + 1,
            autoUrgentDays: task.autoUrgentDays,
            location: task.location,
        });
        if (!uid) onLocalChange?.();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    return (
        <View style={styles.groupPage}>
            <View style={styles.groupCard}>
                {/* Group Header */}
                <View style={styles.groupHeader}>
                    <View style={styles.groupHeaderLeft}>
                        <View style={[styles.groupDot, { backgroundColor: groupColor }]} />
                        <Text style={styles.groupName} numberOfLines={1}>{groupName}</Text>
                        <View style={styles.countBadge}>
                            <Text style={styles.countText}>{filteredTasks.length}</Text>
                        </View>
                    </View>
                    <View style={styles.groupHeaderRight}>
                        {group && onEditGroup && (
                            <TouchableOpacity
                                onPress={() => onEditGroup(group)}
                                style={styles.addBtn}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Ionicons name="ellipsis-horizontal" size={20} color={C.textSecondary} />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            onPress={() => onAddTask(group?.id ?? null)}
                            style={styles.addBtn}
                        >
                            <Ionicons name="add" size={22} color={C.accent} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Task List */}
                <ScrollView
                    style={styles.taskList}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    nestedScrollEnabled={true}
                    alwaysBounceVertical={true}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor={C.accent}
                        />
                    }
                >
                    {activeTasks.length === 0 && completedTasks.length === 0 && (
                        <View style={styles.emptyState}>
                            <Ionicons name="checkmark-done" size={32} color={C.borderLight} />
                            <Text style={styles.emptyText}>No tasks yet</Text>
                        </View>
                    )}
                    {activeTasks.map((task) => (
                        <TaskRow
                            key={task.id}
                            task={task}
                            onToggle={() => handleToggle(task)}
                            onPress={() => onEditTask(task)}
                            onDelete={() => handleDelete(task)}
                            onDuplicate={() => handleDuplicate(task)}
                        />
                    ))}

                    {/* Completed tasks at bottom */}
                    {completedTasks.map((task) => (
                        <TaskRow
                            key={task.id}
                            task={task}
                            onToggle={() => handleToggle(task)}
                            onPress={() => onEditTask(task)}
                            onDelete={() => handleDelete(task)}
                            onDuplicate={() => handleDuplicate(task)}
                        />
                    ))}
                </ScrollView>
            </View>
        </View>
    );
}

// ── Task Count Pill (header widget) ──────────────────────────
function TaskCountPill({
    pages,
    pillPage,
    statusFilter,
}: {
    pages: { group: TaskGroup | null; tasks: Task[] }[];
    pillPage: number;
    statusFilter: StatusFilter;
}) {
    const C = useColors();
    const styles = useMemo(() => makePillStyles(C), [C]);
    const countForPage = useCallback((i: number) => {
        if (i < 0 || i >= pages.length) return 0;
        const t = pages[i].tasks;
        if (statusFilter === "in_progress") return t.filter(x => !x.completed).length;
        if (statusFilter === "completed") return t.filter(x => x.completed).length;
        return t.length;
    }, [pages, statusFilter]);

    // Smooth interpolated index
    const idx = Math.max(0, Math.min(pages.length - 1, pillPage));
    const currentIdx = Math.round(idx);
    const isFirst = currentIdx === 0;
    const isLast = currentIdx === pages.length - 1;

    // Compute counts
    let beforeCount = 0;
    for (let i = 0; i < currentIdx; i++) beforeCount += countForPage(i);
    const currentCount = countForPage(currentIdx);
    let afterCount = 0;
    for (let i = currentIdx + 1; i < pages.length; i++) afterCount += countForPage(i);

    // Subtle pulse scale for current segment
    const frac = Math.abs(idx - currentIdx);
    const currentScale = 1 + (1 - frac) * 0.08;

    const segments: { value: number; isCurrent: boolean }[] = [];
    if (!isFirst) segments.push({ value: beforeCount, isCurrent: false });
    segments.push({ value: currentCount, isCurrent: true });
    if (!isLast) segments.push({ value: afterCount, isCurrent: false });

    return (
        <View style={styles.container}>
            {segments.map((seg, i) => (
                <View key={i} style={styles.segmentRow}>
                    {i > 0 && <View style={styles.dot} />}
                    <View style={[
                        styles.segment,
                        seg.isCurrent && styles.segmentCurrent,
                        seg.isCurrent && { transform: [{ scale: currentScale }] },
                    ]}>
                        <Text style={[
                            styles.segmentText,
                            seg.isCurrent && styles.segmentTextCurrent,
                        ]}>
                            {seg.value}
                        </Text>
                    </View>
                </View>
            ))}
        </View>
    );
}

const makePillStyles = (C: typeof Colors.light) => StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: C.bg,
        borderRadius: 14,
        paddingHorizontal: 3,
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: C.borderLight,
    },
    segmentRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    dot: {
        width: 2.5,
        height: 2.5,
        borderRadius: 1.25,
        backgroundColor: C.textTertiary,
        marginHorizontal: 2,
    },
    segment: {
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 5,
    },
    segmentCurrent: {
        backgroundColor: C.accent,
    },
    segmentText: {
        fontSize: 11,
        fontWeight: "600",
        color: C.textTertiary,
    },
    segmentTextCurrent: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 11,
    },
});

function makeStyles(C: typeof Colors.light) { return StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: C.bg,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
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
    profileBtn: {
        padding: 4,
        position: "relative",
    },
    alertBadge: {
        position: "absolute",
        top: 0,
        right: 0,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: "#f59e0b",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: C.bgCard,
    },
    alertBadgeText: {
        fontSize: 11,
        fontWeight: "800",
        color: "#fff",
    },
    dropdownBackdrop: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 30,
    },
    accountDropdown: {
        position: "absolute",
        top: 100,
        right: Spacing.lg,
        width: 240,
        backgroundColor: C.bgCard,
        borderRadius: Radius.xl,
        borderWidth: 1,
        borderColor: C.borderLight,
        ...Shadows.xl,
        padding: Spacing.md,
        zIndex: 31,
    },
    dropdownEmail: {
        fontSize: FontSize.sm,
        color: C.textSecondary,
        marginBottom: Spacing.sm,
        paddingHorizontal: Spacing.sm,
    },
    dropdownBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.sm,
        borderRadius: Radius.md,
    },
    dropdownBtnText: {
        fontSize: FontSize.md,
        fontWeight: "500",
    },
    dropdownMessage: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        paddingHorizontal: Spacing.sm,
        marginBottom: Spacing.md,
    },
    dropdownMessageText: {
        fontSize: FontSize.sm,
        color: C.textSecondary,
        flex: 1,
    },
    dropdownSignInBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: Spacing.sm,
        backgroundColor: C.accent,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.md,
    },
    dropdownSignInText: {
        fontSize: FontSize.md,
        fontWeight: "600",
        color: "#fff",
    },
    pager: {
        flex: 1,
    },
    pagerPage: {
        flex: 1,
        paddingHorizontal: PEEK_WIDTH,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.sm,
    },
    pageWrapper: {
        width: CARD_WIDTH,
        marginRight: CARD_GAP,
    },
    groupPage: {
        flex: 1,
    },
    groupCard: {
        flex: 1,
        backgroundColor: C.bgCard,
        borderRadius: Radius.xl,
        borderWidth: 1,
        borderColor: C.borderLight,
        ...Shadows.lg,
        overflow: "hidden",
    },
    groupHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: Spacing.lg,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: C.borderLight,
    },
    groupHeaderLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        flex: 1,
    },
    groupHeaderRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.xs,
    },
    groupDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    groupName: {
        fontSize: FontSize.lg,
        fontWeight: "700",
        color: C.textPrimary,
        flexShrink: 1,
    },
    countBadge: {
        backgroundColor: C.bg,
        borderRadius: Radius.full,
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: C.borderLight,
    },
    countText: {
        fontSize: FontSize.xs,
        fontWeight: "700",
        color: C.textSecondary,
    },
    addBtn: {
        padding: 4,
    },
    taskList: {
        flex: 1,
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.sm,
    },
    taskRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: Spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: C.borderLight,
        gap: Spacing.md,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 7,
        borderWidth: 2,
        borderColor: C.border,
        justifyContent: "center",
        alignItems: "center",
    },
    checkboxChecked: {
        backgroundColor: C.success,
        borderColor: C.success,
    },
    taskContent: {
        flex: 1,
    },
    taskTitle: {
        fontSize: FontSize.md,
        fontWeight: "500",
        color: C.textPrimary,
        lineHeight: 21,
    },
    taskTitleCompleted: {
        textDecorationLine: "line-through",
        color: C.textTertiary,
    },
    taskMeta: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 3,
    },
    taskDue: {
        fontSize: 11,
        color: C.textSecondary,
    },
    priorityBadge: {
        paddingVertical: 2,
        paddingHorizontal: 5,
        borderRadius: 4,
        borderWidth: 1,
    },
    priorityText: {
        fontSize: 11,
        fontWeight: "500",
    },
    menuBtn: {
        padding: 6,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 80,
        gap: Spacing.md,
    },
    emptyText: {
        fontSize: FontSize.md,
        color: C.textTertiary,
    },
    completedToggle: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.sm,
        marginTop: Spacing.sm,
    },
    completedToggleText: {
        fontSize: FontSize.sm,
        color: C.textTertiary,
        fontWeight: "500",
    },
    dotContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 10,
        gap: 7,
        minHeight: 28,
    },
    dotSpacer: {
        height: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: C.borderLight,
    },
    dotActive: {
        backgroundColor: C.accent,
        width: 24,
        borderRadius: 4,
    },
    fab: {
        position: "absolute",
        right: 20,
        bottom: 84,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: C.accent,
        justifyContent: "center",
        alignItems: "center",
        ...Shadows.lg,
        shadowColor: C.accent,
        shadowOpacity: 0.4,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        borderWidth: 3,
        borderColor: "rgba(255,255,255,0.3)",
        zIndex: 50,
    },
    fabBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.2)",
        zIndex: 40,
    },
    fabMini: {
        position: "absolute",
        right: 20,
        bottom: 84,
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        zIndex: 45,
    },
    fabMiniTop: {},
    fabMiniBottom: {},
    fabMiniBtn: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: C.accent,
        justifyContent: "center",
        alignItems: "center",
        ...Shadows.md,
    },
    fabMiniLabel: {
        position: "absolute",
        right: 62,
        backgroundColor: C.bgCard,
        paddingHorizontal: Spacing.lg,
        paddingVertical: 10,
        borderRadius: Radius.md,
        ...Shadows.md,
        fontSize: FontSize.md,
        fontWeight: "600" as const,
        color: C.textPrimary,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: Spacing.md,
    },
    emptyContainerText: {
        fontSize: FontSize.md,
        color: C.textTertiary,
    },
    syncBanner: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        backgroundColor: C.accentLight,
    },
    syncBannerText: {
        fontSize: FontSize.sm,
        color: C.accent,
        fontWeight: "500",
    },
    filterBar: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: Spacing.lg,
        paddingTop: 8,
        paddingBottom: 8,
        zIndex: 20,
        backgroundColor: C.bgElevated,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: C.borderLight,
    },
    filterChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: Radius.full,
        backgroundColor: C.bgCard,
        borderWidth: 1,
        borderColor: C.borderLight,
    },
    filterChipActive: {
        backgroundColor: C.accentLight,
        borderColor: C.accent,
    },
    filterChipText: {
        fontSize: FontSize.xs,
        fontWeight: "500" as const,
        color: C.textSecondary,
    },
    filterChipTextActive: {
        color: C.accent,
    },
    filterDropdown: {
        position: "absolute",
        top: 38,
        left: 0,
        backgroundColor: C.bgCard,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: C.borderLight,
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
        backgroundColor: C.accentLight,
    },
    filterOptionText: {
        fontSize: FontSize.sm,
        color: C.textPrimary,
    },
    filterOptionTextActive: {
        color: C.accent,
        fontWeight: "600" as const,
    },
});
}

export default function TasksScreen() {
    const C = useColors();
    const styles = useMemo(() => makeStyles(C), [C]);
    const { user } = useAuth();
    const { tasks, reloadLocal } = useTasks(user?.uid);
    const { groups, reloadLocal: reloadLocalGroups } = useTaskGroups(user?.uid);
    useAutoUrgent(user?.uid, tasks);

    // Auto-reschedule notifications whenever tasks change
    useEffect(() => {
        let cancelled = false;
        loadSettings().then((settings) => {
            if (!cancelled && settings.enabled) {
                const groupMap: Record<string, string> = {};
                const colorMap: Record<string, string> = {};
                for (const g of groups) {
                    groupMap[g.id] = g.name;
                    if (g.color) colorMap[g.id] = g.color;
                }
                rescheduleAllReminders(tasks, settings, groupMap, colorMap);
            }
        });
        return () => { cancelled = true; };
    }, [tasks, groups]);

    const handleLocalChange = () => {
        reloadLocal();
        reloadLocalGroups();
    };

    const [currentPage, setCurrentPage] = useState(0);
    const [modalOpen, setModalOpen] = useState(false);
    const [editTask, setEditTask] = useState<Task | null>(null);
    const [defaultGroupId, setDefaultGroupId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [sortBy, setSortBy] = useState<SortOption>("due_date");
    const [showFilterMenu, setShowFilterMenu] = useState<"status" | "sort" | null>(null);
    const pagerRef = useRef<ScrollView>(null);
    const scrollOffsetAnim = useRef(new Animated.Value(0)).current;

    const handleScroll = Animated.event(
        [{ nativeEvent: { contentOffset: { x: scrollOffsetAnim } } }],
        { useNativeDriver: false }
    );

    // Track page + pill from scroll position via single listener
    const [pillPage, setPillPage] = useState(0);
    useEffect(() => {
        const id = scrollOffsetAnim.addListener(({ value }) => {
            const p = value / (CARD_WIDTH + CARD_GAP);
            setPillPage(p);
        });
        return () => scrollOffsetAnim.removeListener(id);
    }, [scrollOffsetAnim]);

    const handleMomentumEnd = useCallback(() => {
        const page = Math.round(pillPage);
        setCurrentPage(page);
    }, [pillPage]);

    const handleRefresh = useCallback(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        reloadLocal();
        reloadLocalGroups();
        // Small delay so the spinner has time to show
        await new Promise<void>((r) => setTimeout(r, 600));
    }, [reloadLocal, reloadLocalGroups]);

    // Build pages: one per group + "Ungrouped" if there are ungrouped tasks
    const pages = useMemo(() => {
        const result: { group: TaskGroup | null; tasks: Task[] }[] = [];

        // Always show an "Ungrouped" / general page first
        const ungrouped = tasks.filter(
            (t) => !t.groupId || !groups.find((g) => g.id === t.groupId)
        );
        result.push({ group: null, tasks: ungrouped });

        for (const g of groups) {
            const groupTasks = tasks.filter((t) => t.groupId === g.id);
            result.push({ group: g, tasks: groupTasks });
        }

        return result;
    }, [tasks, groups]);

    const handleEditTask = useCallback((task: Task) => {
        setEditTask(task);
        setDefaultGroupId(null);
        setModalOpen(true);
    }, []);

    const handleAddTask = useCallback((groupId: string | null) => {
        setEditTask(null);
        setDefaultGroupId(groupId);
        setModalOpen(true);
    }, []);

    // Group modal state
    const [groupModalOpen, setGroupModalOpen] = useState(false);
    const [editGroup, setEditGroup] = useState<TaskGroup | null>(null);
    const [reorderModalOpen, setReorderModalOpen] = useState(false);

    const handleEditGroup = useCallback((g: TaskGroup) => {
        setEditGroup(g);
        setGroupModalOpen(true);
    }, []);

    // Expandable FAB state
    const [fabOpen, setFabOpen] = useState(false);
    const fabAnim = useRef(new Animated.Value(0)).current;

    const toggleFab = () => {
        const toValue = fabOpen ? 0 : 1;
        Animated.spring(fabAnim, {
            toValue,
            useNativeDriver: true,
            friction: 6,
            tension: 80,
        }).start();
        setFabOpen(!fabOpen);
        if (!fabOpen) setShowFilterMenu(null);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleNewGroup = () => {
        setFabOpen(false);
        Animated.timing(fabAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start();
        setEditGroup(null);
        setGroupModalOpen(true);
    };

    const handleNewTask = () => {
        setFabOpen(false);
        Animated.timing(fabAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start();
        handleAddTask(pages[currentPage]?.group?.id ?? null);
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <ScreenHeader title="Tasks" />

            {/* Filter Bar */}
            <View style={styles.filterBar}>
                {/* Status */}
                <View>
                    <TouchableOpacity
                        style={[
                            styles.filterChip,
                            statusFilter !== "all" && styles.filterChipActive,
                        ]}
                        onPress={() => setShowFilterMenu(showFilterMenu === "status" ? null : "status")}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="filter-outline" size={14} color={statusFilter !== "all" ? C.accent : C.textSecondary} />
                        <Text style={[styles.filterChipText, statusFilter !== "all" && styles.filterChipTextActive]}>
                            {STATUS_OPTIONS.find((o) => o.key === statusFilter)?.label ?? "All"}
                        </Text>
                        <Ionicons name="chevron-down" size={12} color={C.textTertiary} />
                    </TouchableOpacity>
                    {showFilterMenu === "status" && (
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
                                        setShowFilterMenu(null);
                                    }}
                                >
                                    <Text style={[
                                        styles.filterOptionText,
                                        statusFilter === opt.key && styles.filterOptionTextActive,
                                    ]}>
                                        {opt.label}
                                    </Text>
                                    {statusFilter === opt.key && (
                                        <Ionicons name="checkmark" size={16} color={C.accent} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Sort */}
                <View>
                    <TouchableOpacity
                        style={[
                            styles.filterChip,
                            sortBy !== "due_date" && styles.filterChipActive,
                        ]}
                        onPress={() => setShowFilterMenu(showFilterMenu === "sort" ? null : "sort")}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="swap-vertical-outline" size={14} color={sortBy !== "due_date" ? C.accent : C.textSecondary} />
                        <Text style={[styles.filterChipText, sortBy !== "due_date" && styles.filterChipTextActive]}>
                            {SORT_OPTIONS.find((o) => o.key === sortBy)?.label ?? "Due Date"}
                        </Text>
                        <Ionicons name="chevron-down" size={12} color={C.textTertiary} />
                    </TouchableOpacity>
                    {showFilterMenu === "sort" && (
                        <View style={[styles.filterDropdown, { left: 0 }]}>
                            {SORT_OPTIONS.map((opt) => (
                                <TouchableOpacity
                                    key={opt.key}
                                    style={[
                                        styles.filterOption,
                                        sortBy === opt.key && styles.filterOptionActive,
                                    ]}
                                    onPress={() => {
                                        setSortBy(opt.key);
                                        setShowFilterMenu(null);
                                    }}
                                >
                                    <Text style={[
                                        styles.filterOptionText,
                                        sortBy === opt.key && styles.filterOptionTextActive,
                                    ]}>
                                        {opt.label}
                                    </Text>
                                    {sortBy === opt.key && (
                                        <Ionicons name="checkmark" size={16} color={C.accent} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Group Order */}
                <View>
                    <TouchableOpacity
                        style={styles.filterChip}
                        onPress={() => setReorderModalOpen(true)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="reorder-three-outline" size={14} color={C.textSecondary} />
                        <Text style={styles.filterChipText}>Order</Text>
                    </TouchableOpacity>
                </View>

                {/* Spacer to push pill to right */}
                <View style={{ flex: 1 }} />

                {/* Task Count Pill */}
                {pages.length > 1 && <TaskCountPill pages={pages} pillPage={pillPage} statusFilter={statusFilter} />}
            </View>

            {/* Dismiss filter menu backdrop */}
            {showFilterMenu && (
                <Pressable
                    style={StyleSheet.absoluteFillObject}
                    onPress={() => setShowFilterMenu(null)}
                />
            )}

            {/* Carousel */}
            {pages.length > 0 ? (
                <ScrollView
                    ref={pagerRef}
                    horizontal
                    pagingEnabled={false}
                    snapToInterval={CARD_WIDTH + CARD_GAP}
                    snapToAlignment="start"
                    decelerationRate="fast"
                    disableIntervalMomentum={true}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{
                        paddingHorizontal: PEEK_WIDTH,
                        paddingTop: Spacing.sm,
                        paddingBottom: Spacing.sm,
                    }}
                    style={styles.pager}
                    onScroll={handleScroll}
                    onMomentumScrollEnd={handleMomentumEnd}
                    scrollEventThrottle={16}
                >
                    {pages.map((page) => (
                        <View
                            key={page.group?.id ?? "ungrouped"}
                            style={styles.pageWrapper}
                        >
                            <GroupPage
                                group={page.group}
                                tasks={page.tasks}
                                uid={user?.uid}
                                onEditTask={handleEditTask}
                                onAddTask={handleAddTask}
                                onEditGroup={handleEditGroup}
                                onLocalChange={handleLocalChange}
                                statusFilter={statusFilter}
                                sortBy={sortBy}
                                onRefresh={handleRefresh}
                            />
                        </View>
                    ))}
                </ScrollView>
            ) : (
                <View style={styles.emptyContainer}>
                    <Ionicons name="add-circle-outline" size={48} color={C.borderLight} />
                    <Text style={styles.emptyContainerText}>No task groups yet</Text>
                </View>
            )}

            {/* Page Indicator Dots */}
            <View style={styles.dotContainer}>
                {pages.length > 1
                    ? pages.map((_, i) => {
                        const snapInterval = CARD_WIDTH + CARD_GAP;
                        const inputRange = [
                            (i - 1) * snapInterval,
                            i * snapInterval,
                            (i + 1) * snapInterval,
                        ];
                        const dotWidth = scrollOffsetAnim.interpolate({
                            inputRange,
                            outputRange: [8, 22, 8],
                            extrapolate: "clamp",
                        });
                        const dotOpacity = scrollOffsetAnim.interpolate({
                            inputRange,
                            outputRange: [0.35, 1, 0.35],
                            extrapolate: "clamp",
                        });
                        const dotColor = scrollOffsetAnim.interpolate({
                            inputRange,
                            outputRange: ["#bcc1ca", C.accent, "#bcc1ca"],
                            extrapolate: "clamp",
                        });
                        return (
                            <Animated.View
                                key={i}
                                style={[
                                    styles.dot,
                                    {
                                        width: dotWidth,
                                        opacity: dotOpacity,
                                        backgroundColor: dotColor,
                                    },
                                ]}
                            />
                        );
                    })
                    : <View style={styles.dotSpacer} />}
            </View>

            {/* FAB Backdrop */}
            {fabOpen && (
                <Pressable style={styles.fabBackdrop} onPress={toggleFab} />
            )}

            {/* FAB Mini Actions */}
            <Animated.View
                style={[
                    styles.fabMini,
                    styles.fabMiniTop,
                    {
                        opacity: fabAnim,
                        transform: [
                            { translateY: fabAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -130] }) },
                            { scale: fabAnim },
                        ],
                    },
                ]}
                pointerEvents={fabOpen ? "auto" : "none"}
            >
                <TouchableOpacity style={styles.fabMiniBtn} onPress={handleNewGroup} activeOpacity={0.85}>
                    <Ionicons name="folder-outline" size={20} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.fabMiniLabel}>New List</Text>
            </Animated.View>

            <Animated.View
                style={[
                    styles.fabMini,
                    styles.fabMiniBottom,
                    {
                        opacity: fabAnim,
                        transform: [
                            { translateY: fabAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -70] }) },
                            { scale: fabAnim },
                        ],
                    },
                ]}
                pointerEvents={fabOpen ? "auto" : "none"}
            >
                <TouchableOpacity style={styles.fabMiniBtn} onPress={handleNewTask} activeOpacity={0.85}>
                    <Ionicons name="add-circle-outline" size={20} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.fabMiniLabel}>New Task</Text>
            </Animated.View>

            {/* FAB */}
            <TouchableOpacity
                style={styles.fab}
                onPress={toggleFab}
                activeOpacity={0.85}
            >
                <Animated.View
                    style={{
                        transform: [
                            {
                                rotate: fabAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ["0deg", "45deg"],
                                }),
                            },
                        ],
                    }}
                >
                    <Ionicons name="add" size={28} color="#fff" />
                </Animated.View>
            </TouchableOpacity>

            {/* Task Modal */}
            <TaskModal
                visible={modalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setEditTask(null);
                    if (!user) handleLocalChange();
                }}
                task={editTask}
                defaultGroupId={defaultGroupId}
                groups={groups}
            />

            {/* Group Modal */}
            <GroupModal
                visible={groupModalOpen}
                onClose={() => {
                    setGroupModalOpen(false);
                    setEditGroup(null);
                    if (!user) handleLocalChange();
                }}
                group={editGroup}
                groupCount={groups.length}
                tasks={editGroup ? tasks.filter(t => t.groupId === editGroup.id) : []}
            />

            {/* Reorder Groups Modal */}
            <Modal
                visible={reorderModalOpen}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setReorderModalOpen(false)}
            >
                <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.bg }}>
                    {/* Handle */}
                    <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 4 }}>
                        <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: C.borderLight }} />
                    </View>
                    {/* Header */}
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: Spacing.lg, paddingTop: Platform.OS === "ios" ? 10 : Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: C.borderLight }}>
                        <Text style={{ fontSize: FontSize.lg, fontWeight: "700", color: C.textPrimary }}>Reorder Groups</Text>
                        <TouchableOpacity onPress={() => setReorderModalOpen(false)}>
                            <Ionicons name="close-circle" size={28} color={C.textTertiary} />
                        </TouchableOpacity>
                    </View>
                    {/* Hint */}
                    <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xs }}>
                        <Text style={{ fontSize: FontSize.sm, color: C.textTertiary }}>Hold and drag the ≡ handle to reorder</Text>
                    </View>
                    {/* Draggable Group List */}
                    {groups.length === 0 ? (
                        <View style={{ alignItems: "center", paddingTop: 40, gap: 8 }}>
                            <Ionicons name="layers-outline" size={40} color={C.borderLight} />
                            <Text style={{ color: C.textTertiary, fontSize: FontSize.md }}>No groups to reorder</Text>
                        </View>
                    ) : (
                        <DraggableFlatList
                            data={groups}
                            keyExtractor={(item) => item.id}
                            onDragBegin={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
                            onDragEnd={async ({ data: reordered }) => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                await reorderGroupsUnified(user?.uid, reordered);
                                if (!user) handleLocalChange();
                            }}
                            contentContainerStyle={{ padding: Spacing.lg, gap: 8 }}
                            renderItem={({ item: g, drag, isActive }) => (
                                <ScaleDecorator>
                                    <TouchableOpacity
                                        onLongPress={drag}
                                        disabled={isActive}
                                        activeOpacity={0.7}
                                        style={{
                                            flexDirection: "row",
                                            alignItems: "center",
                                            backgroundColor: isActive ? C.accentLight : C.bgCard,
                                            borderRadius: Radius.md,
                                            borderWidth: 1,
                                            borderColor: isActive ? C.accent : C.borderLight,
                                            paddingHorizontal: Spacing.md,
                                            paddingVertical: Spacing.md,
                                            shadowColor: isActive ? "#000" : "transparent",
                                            shadowOffset: { width: 0, height: 4 },
                                            shadowOpacity: isActive ? 0.15 : 0,
                                            shadowRadius: 8,
                                            elevation: isActive ? 6 : 0,
                                        }}
                                    >
                                        <Ionicons name="menu" size={22} color={isActive ? C.accent : C.textTertiary} style={{ marginRight: Spacing.sm }} />
                                        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: g.color || C.textTertiary, marginRight: Spacing.sm }} />
                                        <Text style={{ flex: 1, fontSize: FontSize.md, fontWeight: "600", color: C.textPrimary }} numberOfLines={1}>{g.name}</Text>
                                    </TouchableOpacity>
                                </ScaleDecorator>
                            )}
                        />
                    )}
                </GestureHandlerRootView>
            </Modal>
        </View>
    );
}
