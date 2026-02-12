import { useRef, useState, useMemo, useCallback } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useTasks } from "@/hooks/useTasks";
import { useTaskGroups } from "@/hooks/useTaskGroups";
import { useAutoUrgent } from "@/hooks/useAutoUrgent";
import { updateTaskUnified, deleteTaskUnified, createGroupUnified } from "@/lib/crud";
import { Colors, Spacing, Radius, FontSize } from "@/lib/theme";
import { getQuadrant, QUADRANT_META } from "@/lib/types";
import type { Task, TaskGroup } from "@/lib/types";
import TaskModal from "@/components/TaskModal";
import GroupModal from "@/components/GroupModal";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PEEK_WIDTH = 24;
const CARD_GAP = 10;
const CARD_WIDTH = SCREEN_WIDTH - PEEK_WIDTH * 2 - CARD_GAP;

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
}: {
    task: Task;
    group?: TaskGroup;
    onToggle: () => void;
    onPress: () => void;
    onDelete: () => void;
}) {
    const quadrant = getQuadrant(task);
    const meta = quadrant ? QUADRANT_META[quadrant] : null;
    const due = formatDueDateTime(task);

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
}: {
    group: TaskGroup | null;
    tasks: Task[];
    uid: string | undefined;
    onEditTask: (t: Task) => void;
    onAddTask: (groupId: string | null) => void;
    onEditGroup?: (g: TaskGroup) => void;
    onLocalChange?: () => void;
}) {
    const groupName = group?.name ?? "General Tasks";
    const groupColor = group?.color ?? Colors.light.textTertiary;
    const activeTasks = tasks.filter((t) => !t.completed);
    const completedTasks = tasks.filter((t) => t.completed);
    const [showCompleted, setShowCompleted] = useState(false);

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

    return (
        <View style={styles.groupPage}>
            <View style={styles.groupCard}>
                {/* Group Header */}
                <View style={styles.groupHeader}>
                    <View style={styles.groupHeaderLeft}>
                        <View style={[styles.groupDot, { backgroundColor: groupColor }]} />
                        <Text style={styles.groupName}>{groupName}</Text>
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
                >
                    {activeTasks.length === 0 && (
                        <View style={styles.emptyState}>
                            <Ionicons name="checkmark-done" size={32} color={Colors.light.borderLight} />
                            <Text style={styles.emptyText}>All caught up!</Text>
                        </View>
                    )}
                    {activeTasks.map((task) => (
                        <TaskRow
                            key={task.id}
                            task={task}
                            onToggle={() => handleToggle(task)}
                            onPress={() => onEditTask(task)}
                            onDelete={() => handleDelete(task)}
                        />
                    ))}

                    {/* Completed Section */}
                    {completedTasks.length > 0 && (
                        <TouchableOpacity
                            style={styles.completedToggle}
                            onPress={() => setShowCompleted(!showCompleted)}
                        >
                            <Ionicons
                                name={showCompleted ? "chevron-down" : "chevron-forward"}
                                size={16}
                                color={Colors.light.textTertiary}
                            />
                            <Text style={styles.completedToggleText}>
                                Completed ({completedTasks.length})
                            </Text>
                        </TouchableOpacity>
                    )}
                    {showCompleted &&
                        completedTasks.map((task) => (
                            <TaskRow
                                key={task.id}
                                task={task}
                                onToggle={() => handleToggle(task)}
                                onPress={() => onEditTask(task)}
                                onDelete={() => handleDelete(task)}
                            />
                        ))}
                </ScrollView>
            </View>
        </View>
    );
}

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
    const pagerRef = useRef<ScrollView>(null);

    const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offset = e.nativeEvent.contentOffset.x;
        const page = Math.round(offset / (CARD_WIDTH + CARD_GAP));
        setCurrentPage(page);
    }, []);

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

            {/* Carousel */}
            {pages.length > 0 ? (
                <ScrollView
                    ref={pagerRef}
                    horizontal
                    pagingEnabled={false}
                    snapToInterval={CARD_WIDTH + CARD_GAP}
                    snapToAlignment="start"
                    decelerationRate="fast"
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{
                        paddingHorizontal: PEEK_WIDTH,
                        paddingTop: Spacing.lg,
                        paddingBottom: Spacing.sm,
                    }}
                    style={styles.pager}
                    onMomentumScrollEnd={handleScroll}
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
                    ? pages.map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.dot,
                                i === currentPage && styles.dotActive,
                            ]}
                        />
                    ))
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
        zIndex: 20,
    },
    fabBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.25)",
        zIndex: 10,
    },
    fabMini: {
        position: "absolute",
        right: Spacing.xl,
        bottom: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        zIndex: 15,
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
});
