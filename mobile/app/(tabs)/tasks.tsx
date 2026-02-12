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
} from "react-native";
import PagerView from "react-native-pager-view";
import DraggableFlatList, { ScaleDecorator } from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useTasks } from "@/hooks/useTasks";
import { useTaskGroups } from "@/hooks/useTaskGroups";
import { useAutoUrgent } from "@/hooks/useAutoUrgent";
import { updateTaskUnified, deleteTaskUnified, createGroupUnified, updateGroupUnified, createTaskUnified, reorderGroupsUnified } from "@/lib/crud";
import { Colors, Spacing, Radius, FontSize } from "@/lib/theme";
import { getQuadrant, QUADRANT_META } from "@/lib/types";
import type { Task, TaskGroup } from "@/lib/types";
import TaskModal from "@/components/TaskModal";
import GroupModal from "@/components/GroupModal";
import { CalendarFeedSheet } from "@/components/CalendarFeedSheet";

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
    const quadrant = getQuadrant(task);
    const meta = quadrant ? QUADRANT_META[quadrant] : null;
    const due = formatDueDateTime(task);

    const handleLongPress = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
            task.title,
            undefined,
            [
                { text: "Duplicate Task", onPress: onDuplicate },
                { text: "Delete Task", style: "destructive", onPress: onDelete },
                { text: "Cancel", style: "cancel" },
            ]
        );
    }, [onDuplicate, onDelete, task.title]);

    return (
        <TouchableOpacity
            style={styles.taskRow}
            onPress={onPress}
            onLongPress={handleLongPress}
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
                    {due && (
                        <Text style={styles.taskDue}>{due}</Text>
                    )}
                    {meta && (
                        <View style={[styles.priorityBadge, { backgroundColor: meta.bg, borderColor: meta.border }]}>
                            <View style={[styles.priorityDot, { backgroundColor: meta.color }]} />
                            <Text style={[styles.priorityText, { color: meta.color }]}>
                                {meta.sublabel}
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            <TouchableOpacity
                onPress={onDelete}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.deleteBtn}
            >
                <Ionicons name="trash-outline" size={16} color={Colors.light.textTertiary} />
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
    const groupName = group?.name ?? "General Tasks";
    const groupColor = group?.color ?? Colors.light.textTertiary;

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
                            <Text style={styles.countText}>{activeTasks.length}</Text>
                        </View>
                    </View>
                    <View style={styles.groupHeaderRight}>
                        {group && onEditGroup && (
                            <TouchableOpacity
                                onPress={() => onEditGroup(group)}
                                style={styles.addBtn}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Ionicons name="ellipsis-horizontal" size={20} color={Colors.light.textSecondary} />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            onPress={() => onAddTask(group?.id ?? null)}
                            style={styles.addBtn}
                        >
                            <Ionicons name="add" size={22} color={Colors.light.accent} />
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
                            tintColor={Colors.light.accent}
                        />
                    }
                >
                    {activeTasks.length === 0 && completedTasks.length === 0 && (
                        <View style={styles.emptyState}>
                            <Ionicons name="checkmark-done" size={32} color={Colors.light.borderLight} />
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
        <View style={pillStyles.container}>
            {segments.map((seg, i) => (
                <View key={i} style={pillStyles.segmentRow}>
                    {i > 0 && <View style={pillStyles.dot} />}
                    <View style={[
                        pillStyles.segment,
                        seg.isCurrent && pillStyles.segmentCurrent,
                        seg.isCurrent && { transform: [{ scale: currentScale }] },
                    ]}>
                        <Text style={[
                            pillStyles.segmentText,
                            seg.isCurrent && pillStyles.segmentTextCurrent,
                        ]}>
                            {seg.value}
                        </Text>
                    </View>
                </View>
            ))}
        </View>
    );
}

const pillStyles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#e2e4ea",
        borderRadius: 12,
        paddingHorizontal: 3,
        paddingVertical: 2,
    },
    segmentRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    dot: {
        width: 2.5,
        height: 2.5,
        borderRadius: 1.25,
        backgroundColor: "#a0a4ae",
        marginHorizontal: 2,
    },
    segment: {
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 4,
    },
    segmentCurrent: {
        backgroundColor: Colors.light.accent,
    },
    segmentText: {
        fontSize: 10,
        fontWeight: "600",
        color: "#7a7e88",
    },
    segmentTextCurrent: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 10,
    },
});

export default function TasksScreen() {
    const { user, logOut } = useAuth();
    const { tasks, reloadLocal } = useTasks(user?.uid);
    const { groups, reloadLocal: reloadLocalGroups } = useTaskGroups(user?.uid);
    const router = useRouter();
    useAutoUrgent(user?.uid, tasks);

    const handleLocalChange = () => {
        reloadLocal();
        reloadLocalGroups();
    };

    const [currentPage, setCurrentPage] = useState(0);
    const [modalOpen, setModalOpen] = useState(false);
    const [editTask, setEditTask] = useState<Task | null>(null);
    const [defaultGroupId, setDefaultGroupId] = useState<string | null>(null);
    const [accountMenuOpen, setAccountMenuOpen] = useState(false);
    const [calFeedOpen, setCalFeedOpen] = useState(false);
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
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Tasks</Text>
                <TouchableOpacity
                    onPress={() => setAccountMenuOpen(!accountMenuOpen)}
                    style={styles.profileBtn}
                >
                    <Ionicons
                        name={user ? "person-circle" : "person-circle-outline"}
                        size={28}
                        color={user ? Colors.light.accent : Colors.light.textSecondary}
                    />
                    {!user && (
                        <View style={styles.alertBadge}>
                            <Text style={styles.alertBadgeText}>!</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Account Dropdown */}
            {accountMenuOpen && (
                <>
                    <Pressable
                        style={styles.dropdownBackdrop}
                        onPress={() => setAccountMenuOpen(false)}
                    />
                    <View style={styles.accountDropdown}>
                        {/* Stats link — always visible */}
                        <TouchableOpacity
                            style={styles.dropdownBtn}
                            onPress={() => {
                                setAccountMenuOpen(false);
                                router.push("/(tabs)/stats");
                            }}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="stats-chart-outline" size={18} color={Colors.light.textPrimary} />
                            <Text style={styles.dropdownBtnText}>View Stats</Text>
                        </TouchableOpacity>

                        {user && (
                            <TouchableOpacity
                                style={styles.dropdownBtn}
                                onPress={() => {
                                    setAccountMenuOpen(false);
                                    setCalFeedOpen(true);
                                }}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="calendar-outline" size={18} color={Colors.light.textPrimary} />
                                <Text style={styles.dropdownBtnText}>Calendar Feed</Text>
                            </TouchableOpacity>
                        )}

                        <View style={{ height: 1, backgroundColor: Colors.light.borderLight, marginVertical: 4 }} />

                        {user ? (
                            <>
                                <Text style={styles.dropdownEmail} numberOfLines={1}>
                                    {user.email}
                                </Text>
                                <TouchableOpacity
                                    style={styles.dropdownBtn}
                                    onPress={() => {
                                        setAccountMenuOpen(false);
                                        logOut();
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="log-out-outline" size={18} color={Colors.light.danger} />
                                    <Text style={[styles.dropdownBtnText, { color: Colors.light.danger }]}>Sign Out</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <View style={styles.dropdownMessage}>
                                    <Ionicons name="cloud-offline-outline" size={18} color={Colors.light.textSecondary} />
                                    <Text style={styles.dropdownMessageText}>
                                        Sign in to sync across devices
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.dropdownSignInBtn}
                                    onPress={() => {
                                        setAccountMenuOpen(false);
                                        router.push("/(auth)/login");
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="log-in-outline" size={18} color="#fff" />
                                    <Text style={styles.dropdownSignInText}>Sign In</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </>
            )}

            {/* Calendar Feed Sheet */}
            <CalendarFeedSheet visible={calFeedOpen} onClose={() => setCalFeedOpen(false)} />

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
                        <Ionicons name="filter-outline" size={14} color={statusFilter !== "all" ? Colors.light.accent : Colors.light.textSecondary} />
                        <Text style={[styles.filterChipText, statusFilter !== "all" && styles.filterChipTextActive]}>
                            {STATUS_OPTIONS.find((o) => o.key === statusFilter)?.label ?? "All"}
                        </Text>
                        <Ionicons name="chevron-down" size={12} color={Colors.light.textTertiary} />
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
                                        <Ionicons name="checkmark" size={16} color={Colors.light.accent} />
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
                        <Ionicons name="swap-vertical-outline" size={14} color={sortBy !== "due_date" ? Colors.light.accent : Colors.light.textSecondary} />
                        <Text style={[styles.filterChipText, sortBy !== "due_date" && styles.filterChipTextActive]}>
                            {SORT_OPTIONS.find((o) => o.key === sortBy)?.label ?? "Due Date"}
                        </Text>
                        <Ionicons name="chevron-down" size={12} color={Colors.light.textTertiary} />
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
                                        <Ionicons name="checkmark" size={16} color={Colors.light.accent} />
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
                        <Ionicons name="reorder-three-outline" size={14} color={Colors.light.textSecondary} />
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
                    <Ionicons name="add-circle-outline" size={48} color={Colors.light.borderLight} />
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
                            outputRange: ["#bcc1ca", Colors.light.accent, "#bcc1ca"],
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
                <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.light.bg }}>
                    {/* Handle */}
                    <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 4 }}>
                        <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: Colors.light.borderLight }} />
                    </View>
                    {/* Header */}
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: Spacing.lg, paddingTop: Platform.OS === "ios" ? 10 : Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.light.borderLight }}>
                        <Text style={{ fontSize: FontSize.lg, fontWeight: "700", color: Colors.light.textPrimary }}>Reorder Groups</Text>
                        <TouchableOpacity onPress={() => setReorderModalOpen(false)}>
                            <Ionicons name="close-circle" size={28} color={Colors.light.textTertiary} />
                        </TouchableOpacity>
                    </View>
                    {/* Hint */}
                    <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xs }}>
                        <Text style={{ fontSize: FontSize.sm, color: Colors.light.textTertiary }}>Hold and drag the ≡ handle to reorder</Text>
                    </View>
                    {/* Draggable Group List */}
                    {groups.length === 0 ? (
                        <View style={{ alignItems: "center", paddingTop: 40, gap: 8 }}>
                            <Ionicons name="layers-outline" size={40} color={Colors.light.borderLight} />
                            <Text style={{ color: Colors.light.textTertiary, fontSize: FontSize.md }}>No groups to reorder</Text>
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
                                            backgroundColor: isActive ? Colors.light.accentLight : Colors.light.bgCard,
                                            borderRadius: Radius.md,
                                            borderWidth: 1,
                                            borderColor: isActive ? Colors.light.accent : Colors.light.borderLight,
                                            paddingHorizontal: Spacing.md,
                                            paddingVertical: Spacing.md,
                                            shadowColor: isActive ? "#000" : "transparent",
                                            shadowOffset: { width: 0, height: 4 },
                                            shadowOpacity: isActive ? 0.15 : 0,
                                            shadowRadius: 8,
                                            elevation: isActive ? 6 : 0,
                                        }}
                                    >
                                        <Ionicons name="menu" size={22} color={isActive ? Colors.light.accent : Colors.light.textTertiary} style={{ marginRight: Spacing.sm }} />
                                        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: g.color || Colors.light.textTertiary, marginRight: Spacing.sm }} />
                                        <Text style={{ flex: 1, fontSize: FontSize.md, fontWeight: "600", color: Colors.light.textPrimary }} numberOfLines={1}>{g.name}</Text>
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
        borderColor: Colors.light.bgCard,
    },
    alertBadgeText: {
        fontSize: 9,
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
        backgroundColor: Colors.light.bgCard,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        padding: Spacing.md,
        zIndex: 31,
    },
    dropdownEmail: {
        fontSize: FontSize.sm,
        color: Colors.light.textSecondary,
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
        color: Colors.light.textSecondary,
        flex: 1,
    },
    dropdownSignInBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: Spacing.sm,
        backgroundColor: Colors.light.accent,
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
        backgroundColor: Colors.light.bgCard,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: "#e0e2e8",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        overflow: "hidden",
    },
    groupHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.borderLight,
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
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    groupName: {
        fontSize: FontSize.lg,
        fontWeight: "600",
        color: Colors.light.textPrimary,
        flexShrink: 1,
    },
    countBadge: {
        backgroundColor: Colors.light.bg,
        borderRadius: Radius.full,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    countText: {
        fontSize: FontSize.xs,
        fontWeight: "600",
        color: Colors.light.textSecondary,
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
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.light.borderLight,
        gap: Spacing.md,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: Colors.light.border,
        justifyContent: "center",
        alignItems: "center",
    },
    checkboxChecked: {
        backgroundColor: Colors.light.success,
        borderColor: Colors.light.success,
    },
    taskContent: {
        flex: 1,
    },
    taskTitle: {
        fontSize: FontSize.md,
        fontWeight: "500",
        color: Colors.light.textPrimary,
        lineHeight: 20,
    },
    taskTitleCompleted: {
        textDecorationLine: "line-through",
        color: Colors.light.textTertiary,
    },
    taskMeta: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        marginTop: 3,
        flexWrap: "wrap",
    },
    taskDue: {
        fontSize: FontSize.xs,
        color: Colors.light.textTertiary,
    },
    priorityBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: Radius.sm,
        borderWidth: 1,
    },
    priorityDot: {
        width: 5,
        height: 5,
        borderRadius: 3,
    },
    priorityText: {
        fontSize: 10,
        fontWeight: "600",
    },
    deleteBtn: {
        padding: 4,
    },
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 60,
        gap: Spacing.sm,
    },
    emptyText: {
        fontSize: FontSize.md,
        color: Colors.light.textTertiary,
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
        color: Colors.light.textTertiary,
        fontWeight: "500",
    },
    dotContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: Spacing.sm,
        gap: 6,
        minHeight: 24,
    },
    dotSpacer: {
        height: 7,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#bcc1ca",
    },
    dotActive: {
        backgroundColor: Colors.light.accent,
        width: 22,
        borderRadius: 4,
    },
    fab: {
        position: "absolute",
        right: Spacing.xl,
        bottom: 16,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.light.accent,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: Colors.light.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 6,
        zIndex: 50,
    },
    fabBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.25)",
        zIndex: 40,
    },
    fabMini: {
        position: "absolute",
        right: Spacing.xl,
        bottom: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        zIndex: 45,
    },
    fabMiniTop: {},
    fabMiniBottom: {},
    fabMiniBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.light.accent,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 5,
    },
    fabMiniLabel: {
        position: "absolute",
        right: 58,
        backgroundColor: Colors.light.bgCard,
        paddingHorizontal: Spacing.md,
        paddingVertical: 8,
        borderRadius: Radius.md,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
        elevation: 3,
        fontSize: FontSize.md,
        fontWeight: "600" as const,
        color: Colors.light.textPrimary,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: Spacing.md,
    },
    emptyContainerText: {
        fontSize: FontSize.md,
        color: Colors.light.textTertiary,
    },
    syncBanner: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        backgroundColor: Colors.light.accentLight,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.borderLight,
    },
    syncBannerText: {
        fontSize: FontSize.sm,
        color: Colors.light.accent,
        fontWeight: "500",
    },
    filterBar: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: Spacing.md,
        paddingTop: 6,
        paddingBottom: 2,
        zIndex: 20,
    },
    filterChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        paddingHorizontal: 8,
        paddingVertical: 4,
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
        fontWeight: "500" as const,
        color: Colors.light.textSecondary,
    },
    filterChipTextActive: {
        color: Colors.light.accent,
    },
    filterDropdown: {
        position: "absolute",
        top: 36,
        left: 0,
        backgroundColor: Colors.light.bgCard,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 6,
        zIndex: 30,
        minWidth: 150,
        overflow: "hidden",
    },
    filterOption: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 14,
        paddingVertical: 10,
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
});
