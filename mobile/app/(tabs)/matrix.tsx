import { useState, useMemo, useCallback, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
    Dimensions,
    PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    Easing,
} from "react-native-reanimated";
import { useAuth } from "@/hooks/useAuth";
import { useTasks } from "@/hooks/useTasks";
import { useTaskGroups } from "@/hooks/useTaskGroups";
import { updateTaskUnified } from "@/lib/crud";
import { Colors, Spacing, Radius, FontSize, Shadows } from "@/lib/theme";
import { getQuadrant, QUADRANT_META } from "@/lib/types";
import type { Task, TaskGroup, Quadrant } from "@/lib/types";
import TaskModal from "@/components/TaskModal";
import { GroupFilterDropdown } from "@/components/GroupFilterDropdown";
import ScreenHeader from "@/components/ScreenHeader";

// ── Constants ────────────────────────────────────────────────
const EXPANDED = 0.75;
const DEFAULT = 0.5;
const SPRING_CFG = { damping: 20, stiffness: 180, mass: 0.8 };
const TRAY_TIMING = { duration: 300, easing: Easing.out(Easing.cubic) };
const TRAY_HANDLE_HEIGHT = 52;
const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const TRAY_EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.45;

const quadrants: Quadrant[] = ["DO", "SCHEDULE", "DELEGATE", "DELETE"];

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

function sortTasks(list: Task[], sortBy: SortOption): Task[] {
    return [...list].sort((a, b) => {
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

function formatDueCompact(task: Task): string | null {
    if (!task.dueDate) return null;
    const [y, m, d] = task.dueDate.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tmrw";
    if (diff === -1) return "Yday";
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[date.getMonth()]} ${date.getDate()}`;
}

// ── Detail level thresholds ──────────────────────────────────
type DetailLevel = "compact" | "medium" | "expanded";

function getDetailLevel(w: number, h: number): DetailLevel {
    const area = w * h;
    if (area > 100000) return "expanded";
    if (area > 50000) return "medium";
    return "compact";
}

// ── Drag state type ──────────────────────────────────────────
type DragRef = {
    task: Task;
    source: Quadrant | "uncategorized";
} | null;

// ── Component ────────────────────────────────────────────────
export default function MatrixScreen() {
    const { user } = useAuth();
    const { tasks } = useTasks(user?.uid);
    const { groups } = useTaskGroups(user?.uid);

    const [modalOpen, setModalOpen] = useState(false);
    const [editTask, setEditTask] = useState<Task | null>(null);
    const [defaultUrgent, setDefaultUrgent] = useState<boolean>(false);
    const [defaultImportant, setDefaultImportant] = useState<boolean>(false);
    const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
    const containerW = useSharedValue(0);
    const containerH = useSharedValue(0);
    const [expandedQIdx, setExpandedQIdx] = useState(-1);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [sortBy, setSortBy] = useState<SortOption>("due_date");
    const [showFilterMenu, setShowFilterMenu] = useState<"status" | "sort" | null>(null);
    const [trayOpen, setTrayOpen] = useState(false);

    // Group filter — start with all selected
    const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(() => {
        const s = new Set<string>();
        s.add("");
        for (const g of groups) s.add(g.id);
        return s;
    });
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
            if (prev.size === allGroupIds.size) return new Set<string>();
            return new Set(allGroupIds);
        });
    }, [allGroupIds]);
    const isGroupFiltered = selectedGroupIds.size < allGroupIds.size;
    const [isDragging, setIsDragging] = useState(false);
    const [hoverQuadrant, setHoverQuadrant] = useState<Quadrant | null>(null);
    const [dragTitle, setDragTitle] = useState("");

    // Drag refs (no re-renders on move)
    const dragRef = useRef<DragRef>(null);
    const hoverRef = useRef<Quadrant | null>(null);

    // Ghost card position (shared values = UI thread, no re-renders)
    const ghostX = useSharedValue(0);
    const ghostY = useSharedValue(0);
    const ghostOpacity = useSharedValue(0);

    const ghostStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: ghostX.value - 80 },
            { translateY: ghostY.value - 24 },
        ],
        opacity: Math.max(0, ghostOpacity.value),
        display: ghostOpacity.value > 0.01 ? 'flex' as const : 'none' as const,
    }));

    // Layout refs for quadrant hit-testing
    const gridRef = useRef<View>(null);
    const quadrantLayouts = useRef<Record<Quadrant, { x: number; y: number; w: number; h: number }>>({
        DO: { x: 0, y: 0, w: 0, h: 0 },
        SCHEDULE: { x: 0, y: 0, w: 0, h: 0 },
        DELEGATE: { x: 0, y: 0, w: 0, h: 0 },
        DELETE: { x: 0, y: 0, w: 0, h: 0 },
    });
    const containerRef = useRef<View>(null);
    const containerOffset = useRef({ x: 0, y: 0 });

    // Animated split ratios
    const splitX = useSharedValue(DEFAULT);
    const splitY = useSharedValue(DEFAULT);

    // Tray animation
    const trayHeight = useSharedValue(0);

    const trayAnimStyle = useAnimatedStyle(() => ({
        height: trayHeight.value + TRAY_HANDLE_HEIGHT,
    }));

    const trayContentStyle = useAnimatedStyle(() => ({
        height: trayHeight.value,
        opacity: trayHeight.value > 20 ? 1 : 0,
    }));

    // Group lookup
    const groupMap = useMemo(() => {
        const m: Record<string, TaskGroup> = {};
        for (const g of groups) m[g.id] = g;
        return m;
    }, [groups]);

    const tasksByQuadrant = useMemo(() => {
        const result: Record<Quadrant, Task[]> = {
            DO: [],
            SCHEDULE: [],
            DELEGATE: [],
            DELETE: [],
        };
        for (const t of tasks) {
            if (statusFilter === "in_progress" && t.completed) continue;
            if (statusFilter === "completed" && !t.completed) continue;
            if (isGroupFiltered && !selectedGroupIds.has(t.groupId || "")) continue;
            const q = getQuadrant(t);
            if (q) result[q].push(t);
        }
        for (const q of quadrants) {
            // Active tasks first (sorted), then completed (sorted)
            const active = sortTasks(result[q].filter(t => !t.completed), sortBy);
            const completed = sortTasks(result[q].filter(t => t.completed), sortBy);
            result[q] = [...active, ...completed];
        }
        return result;
    }, [tasks, statusFilter, sortBy, isGroupFiltered, selectedGroupIds]);

    // Uncategorized tasks (respects status filter)
    const uncategorizedTasks = useMemo(() => {
        const uncat = tasks.filter((t) => {
            if (getQuadrant(t) !== null) return false;
            if (statusFilter === "in_progress" && t.completed) return false;
            if (statusFilter === "completed" && !t.completed) return false;
            if (isGroupFiltered && !selectedGroupIds.has(t.groupId || "")) return false;
            return true;
        });
        const active = sortTasks(uncat.filter(t => !t.completed), sortBy);
        const completed = sortTasks(uncat.filter(t => t.completed), sortBy);
        return [...active, ...completed];
    }, [tasks, statusFilter, sortBy, isGroupFiltered, selectedGroupIds]);

    const handleToggle = useCallback(async (task: Task) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await updateTaskUnified(user?.uid, task.id, { completed: !task.completed });
    }, [user?.uid]);

    const openNewInQuadrant = useCallback((q: Quadrant) => {
        const meta = QUADRANT_META[q];
        setEditTask(null);
        setDefaultUrgent(meta.urgent);
        setDefaultImportant(meta.important);
        setModalOpen(true);
    }, []);

    const openEdit = useCallback((task: Task) => {
        setEditTask(task);
        setModalOpen(true);
    }, []);

    // Expand / collapse
    const handleExpand = useCallback((qIdx: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Close tray when expanding a quadrant
        if (trayOpen) {
            trayHeight.value = withTiming(0, TRAY_TIMING);
            setTrayOpen(false);
        }

        if (expandedQIdx === qIdx) {
            splitX.value = withSpring(DEFAULT, SPRING_CFG);
            splitY.value = withSpring(DEFAULT, SPRING_CFG);
            setExpandedQIdx(-1);
        } else {
            const isLeft = qIdx === 0 || qIdx === 2;
            const isTop = qIdx === 0 || qIdx === 1;
            splitX.value = withSpring(isLeft ? EXPANDED : 1 - EXPANDED, SPRING_CFG);
            splitY.value = withSpring(isTop ? EXPANDED : 1 - EXPANDED, SPRING_CFG);
            setExpandedQIdx(qIdx);
        }
    }, [splitX, splitY, expandedQIdx, trayOpen, trayHeight]);

    // Toggle tray
    const toggleTray = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (trayOpen) {
            trayHeight.value = withTiming(0, TRAY_TIMING);
            setTrayOpen(false);
        } else {
            // Reset quadrant expansion when opening tray
            if (expandedQIdx !== -1) {
                splitX.value = withSpring(DEFAULT, SPRING_CFG);
                splitY.value = withSpring(DEFAULT, SPRING_CFG);
                setExpandedQIdx(-1);
            }
            trayHeight.value = withTiming(TRAY_EXPANDED_HEIGHT, TRAY_TIMING);
            setTrayOpen(true);
        }
    }, [trayOpen, trayHeight, expandedQIdx, splitX, splitY]);

    // ── Drag & Drop ──────────────────────────────────────────
    const hitTestQuadrant = useCallback((pageX: number, pageY: number): Quadrant | null => {
        const layouts = quadrantLayouts.current;
        for (const q of quadrants) {
            const l = layouts[q];
            if (pageX >= l.x && pageX <= l.x + l.w && pageY >= l.y && pageY <= l.y + l.h) {
                return q;
            }
        }
        return null;
    }, []);

    const handleDragStart = useCallback((task: Task, pageX: number, pageY: number, source: Quadrant | "uncategorized") => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        dragRef.current = { task, source };
        hoverRef.current = null;
        ghostX.value = pageX;
        ghostY.value = pageY;
        ghostOpacity.value = withTiming(1, { duration: 120 });
        setDragTitle(task.title);
        setIsDragging(true);
    }, [ghostX, ghostY, ghostOpacity]);

    const handleDragMove = useCallback((pageX: number, pageY: number) => {
        // Update shared values directly — no React re-render
        ghostX.value = pageX;
        ghostY.value = pageY;
        // Only set state if quadrant actually changed
        const q = hitTestQuadrant(pageX, pageY);
        if (q !== hoverRef.current) {
            hoverRef.current = q;
            setHoverQuadrant(q);
            if (q) Haptics.selectionAsync();
        }
    }, [hitTestQuadrant, ghostX, ghostY]);

    const handleDragEnd = useCallback(async () => {
        const drag = dragRef.current;
        const target = hoverRef.current;
        if (!drag) return;

        ghostOpacity.value = withTiming(0, { duration: 150 });

        if (target) {
            const meta = QUADRANT_META[target];
            const sourceQ = drag.source === "uncategorized" ? null : drag.source;
            if (target !== sourceQ) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                await updateTaskUnified(user?.uid, drag.task.id, {
                    urgent: meta.urgent,
                    important: meta.important,
                });
            } else {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
        } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        dragRef.current = null;
        hoverRef.current = null;
        setIsDragging(false);
        setHoverQuadrant(null);
        setDragTitle("");
    }, [ghostOpacity, user?.uid]);

    // Measure container offset on layout
    const measureContainer = useCallback(() => {
        containerRef.current?.measureInWindow((x, y) => {
            containerOffset.current = { x, y };
        });
    }, []);

    // Animated styles for each quadrant
    const doStyle = useAnimatedStyle(() => ({
        width: splitX.value * containerW.value,
        height: splitY.value * containerH.value,
    }));
    const scheduleStyle = useAnimatedStyle(() => ({
        width: (1 - splitX.value) * containerW.value,
        height: splitY.value * containerH.value,
    }));
    const delegateStyle = useAnimatedStyle(() => ({
        width: splitX.value * containerW.value,
        height: (1 - splitY.value) * containerH.value,
    }));
    const deleteStyle = useAnimatedStyle(() => ({
        width: (1 - splitX.value) * containerW.value,
        height: (1 - splitY.value) * containerH.value,
    }));

    const animatedStyles: Record<Quadrant, any> = {
        DO: doStyle,
        SCHEDULE: scheduleStyle,
        DELEGATE: delegateStyle,
        DELETE: deleteStyle,
    };

    // Detail levels from React state
    const detailLevels = useMemo(() => {
        const sx = expandedQIdx === -1 ? DEFAULT :
            (expandedQIdx === 0 || expandedQIdx === 2) ? EXPANDED : 1 - EXPANDED;
        const sy = expandedQIdx === -1 ? DEFAULT :
            (expandedQIdx === 0 || expandedQIdx === 1) ? EXPANDED : 1 - EXPANDED;
        const w = containerSize.w;
        const h = containerSize.h;
        return {
            DO: getDetailLevel(sx * w, sy * h),
            SCHEDULE: getDetailLevel((1 - sx) * w, sy * h),
            DELEGATE: getDetailLevel(sx * w, (1 - sy) * h),
            DELETE: getDetailLevel((1 - sx) * w, (1 - sy) * h),
        };
    }, [expandedQIdx, containerSize]);

    return (
        <View style={styles.container}>
            {/* Header */}
            <ScreenHeader title="Matrix" />

            {/* Filter Bar */}
            <View style={styles.filterBar}>
                {/* Status */}
                <View style={{ zIndex: 31 }}>
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
                <View style={{ zIndex: 30 }}>
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
                        <View style={styles.filterDropdown}>
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

                {/* Spacer */}
                <View style={{ flex: 1 }} />

                {/* Group filter */}
                <GroupFilterDropdown
                    groups={groups}
                    selectedIds={selectedGroupIds}
                    onToggle={handleToggleGroup}
                    onSelectAll={handleSelectAllGroups}
                />

                {/* Reset */}
                {expandedQIdx !== -1 && (
                    <TouchableOpacity
                        onPress={() => handleExpand(expandedQIdx)}
                        style={styles.resetBtn}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="contract-outline" size={14} color={Colors.light.accent} />
                        <Text style={styles.resetBtnText}>Reset</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Grid container */}
            <View
                ref={containerRef}
                style={styles.grid}
                onLayout={(e) => {
                    const { width, height } = e.nativeEvent.layout;
                    containerW.value = width;
                    containerH.value = height;
                    if (containerSize.w === 0) setContainerSize({ w: width, h: height });
                    // Measure absolute position for hit-testing
                    setTimeout(measureContainer, 100);
                }}
            >
                {containerSize.w > 0 && (
                    <View style={styles.gridInner}>
                        {/* Row 1: DO + SCHEDULE */}
                        <View style={styles.gridRow}>
                            <QuadrantCell
                                q="DO"
                                qIdx={0}
                                tasks={tasksByQuadrant.DO}
                                groupMap={groupMap}
                                animStyle={animatedStyles.DO}
                                detailLevel={detailLevels.DO}
                                onExpand={handleExpand}
                                onToggle={handleToggle}
                                onAdd={openNewInQuadrant}
                                onEdit={openEdit}
                                isExpanded={expandedQIdx === 0}
                                isCollapsed={expandedQIdx !== -1 && expandedQIdx !== 0}
                                isDragging={isDragging}
                                isHovered={hoverQuadrant === "DO"}
                                onDragStart={handleDragStart}
                                onDragMove={handleDragMove}
                                onDragEnd={handleDragEnd}
                                onLayoutQuadrant={(layout) => { quadrantLayouts.current.DO = layout; }}
                            />
                            <QuadrantCell
                                q="SCHEDULE"
                                qIdx={1}
                                tasks={tasksByQuadrant.SCHEDULE}
                                groupMap={groupMap}
                                animStyle={animatedStyles.SCHEDULE}
                                detailLevel={detailLevels.SCHEDULE}
                                onExpand={handleExpand}
                                onToggle={handleToggle}
                                onAdd={openNewInQuadrant}
                                onEdit={openEdit}
                                isExpanded={expandedQIdx === 1}
                                isCollapsed={expandedQIdx !== -1 && expandedQIdx !== 1}
                                isDragging={isDragging}
                                isHovered={hoverQuadrant === "SCHEDULE"}
                                onDragStart={handleDragStart}
                                onDragMove={handleDragMove}
                                onDragEnd={handleDragEnd}
                                onLayoutQuadrant={(layout) => { quadrantLayouts.current.SCHEDULE = layout; }}
                            />
                        </View>
                        {/* Row 2: DELEGATE + DELETE */}
                        <View style={styles.gridRow}>
                            <QuadrantCell
                                q="DELEGATE"
                                qIdx={2}
                                tasks={tasksByQuadrant.DELEGATE}
                                groupMap={groupMap}
                                animStyle={animatedStyles.DELEGATE}
                                detailLevel={detailLevels.DELEGATE}
                                onExpand={handleExpand}
                                onToggle={handleToggle}
                                onAdd={openNewInQuadrant}
                                onEdit={openEdit}
                                isExpanded={expandedQIdx === 2}
                                isCollapsed={expandedQIdx !== -1 && expandedQIdx !== 2}
                                isDragging={isDragging}
                                isHovered={hoverQuadrant === "DELEGATE"}
                                onDragStart={handleDragStart}
                                onDragMove={handleDragMove}
                                onDragEnd={handleDragEnd}
                                onLayoutQuadrant={(layout) => { quadrantLayouts.current.DELEGATE = layout; }}
                            />
                            <QuadrantCell
                                q="DELETE"
                                qIdx={3}
                                tasks={tasksByQuadrant.DELETE}
                                groupMap={groupMap}
                                animStyle={animatedStyles.DELETE}
                                detailLevel={detailLevels.DELETE}
                                onExpand={handleExpand}
                                onToggle={handleToggle}
                                onAdd={openNewInQuadrant}
                                onEdit={openEdit}
                                isExpanded={expandedQIdx === 3}
                                isCollapsed={expandedQIdx !== -1 && expandedQIdx !== 3}
                                isDragging={isDragging}
                                isHovered={hoverQuadrant === "DELETE"}
                                onDragStart={handleDragStart}
                                onDragMove={handleDragMove}
                                onDragEnd={handleDragEnd}
                                onLayoutQuadrant={(layout) => { quadrantLayouts.current.DELETE = layout; }}
                            />
                        </View>
                    </View>
                )}
            </View>

            {/* Uncategorized Tray */}
            {uncategorizedTasks.length > 0 && (
                <Animated.View style={[styles.tray, trayAnimStyle]}>
                    {/* Handle */}
                    <TouchableOpacity
                        style={styles.trayHandle}
                        onPress={toggleTray}
                        activeOpacity={0.8}
                    >
                        <View style={styles.trayHandlePill} />
                        <View style={styles.trayHandleRow}>
                            <View style={styles.trayHandleLeft}>
                                <Ionicons name="help-circle-outline" size={16} color={Colors.light.textTertiary} />
                                <Text style={styles.trayHandleText}>
                                    {uncategorizedTasks.length} uncategorized
                                </Text>
                            </View>
                            <Ionicons
                                name={trayOpen ? "chevron-down" : "chevron-up"}
                                size={18}
                                color={Colors.light.textTertiary}
                            />
                        </View>
                    </TouchableOpacity>

                    {/* Tray content */}
                    <Animated.View style={[styles.trayContent, trayContentStyle]}>
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.trayScrollContent}
                            scrollEnabled={!isDragging}
                        >
                            {uncategorizedTasks.map((task) => (
                                <DraggableTaskItem
                                    key={task.id}
                                    task={task}
                                    source="uncategorized"
                                    groupMap={groupMap}
                                    onEdit={openEdit}
                                    onToggle={handleToggle}
                                    onDragStart={handleDragStart}
                                    onDragMove={handleDragMove}
                                    onDragEnd={handleDragEnd}
                                />
                            ))}
                        </ScrollView>
                    </Animated.View>
                </Animated.View>
            )}

            {/* Floating Ghost Card (animated on UI thread) */}
            <Animated.View
                style={[styles.ghostCard, ghostStyle]}
                pointerEvents="none"
            >
                <View style={styles.ghostCardInner}>
                    <Text style={styles.ghostCardText} numberOfLines={1}>
                        {dragTitle}
                    </Text>
                </View>
            </Animated.View>

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

// ── Draggable Task Item (for uncategorized tray) ─────────────
function DraggableTaskItem({
    task,
    source,
    groupMap,
    onEdit,
    onToggle,
    onDragStart,
    onDragMove,
    onDragEnd,
}: {
    task: Task;
    source: Quadrant | "uncategorized";
    groupMap: Record<string, TaskGroup>;
    onEdit: (task: Task) => void;
    onToggle: (task: Task) => void;
    onDragStart: (task: Task, x: number, y: number, source: Quadrant | "uncategorized") => void;
    onDragMove: (x: number, y: number) => void;
    onDragEnd: () => void;
}) {
    const isDraggingRef = useRef(false);
    const group = task.groupId ? groupMap[task.groupId] : null;
    const due = formatDueCompact(task);

    // Instant-drag PanResponder on the handle only (no long-press delay)
    const handlePan = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                isDraggingRef.current = true;
                const { pageX, pageY } = evt.nativeEvent;
                onDragStart(task, pageX, pageY, source);
            },
            onPanResponderMove: (evt) => {
                if (isDraggingRef.current) {
                    onDragMove(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
                }
            },
            onPanResponderRelease: () => {
                isDraggingRef.current = false;
                onDragEnd();
            },
            onPanResponderTerminate: () => {
                isDraggingRef.current = false;
                onDragEnd();
            },
        })
    ).current;

    // Long-press drag on the whole row
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const rowPan = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gs) =>
                isDraggingRef.current || Math.abs(gs.dx) > 5 || Math.abs(gs.dy) > 5,
            onPanResponderGrant: (evt) => {
                const { pageX, pageY } = evt.nativeEvent;
                longPressTimer.current = setTimeout(() => {
                    isDraggingRef.current = true;
                    onDragStart(task, pageX, pageY, source);
                }, 350);
            },
            onPanResponderMove: (evt, gs) => {
                if (isDraggingRef.current) {
                    onDragMove(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
                } else if (Math.abs(gs.dx) > 8 || Math.abs(gs.dy) > 8) {
                    if (longPressTimer.current) {
                        clearTimeout(longPressTimer.current);
                        longPressTimer.current = null;
                    }
                }
            },
            onPanResponderRelease: () => {
                if (longPressTimer.current) {
                    clearTimeout(longPressTimer.current);
                    longPressTimer.current = null;
                }
                if (isDraggingRef.current) {
                    isDraggingRef.current = false;
                    onDragEnd();
                } else {
                    onEdit(task);
                }
            },
            onPanResponderTerminate: () => {
                if (longPressTimer.current) {
                    clearTimeout(longPressTimer.current);
                    longPressTimer.current = null;
                }
                if (isDraggingRef.current) {
                    isDraggingRef.current = false;
                    onDragEnd();
                }
            },
        })
    ).current;

    return (
        <View style={styles.trayTask}>
            {/* Content area: long-press to drag, tap to edit */}
            <View style={styles.trayTaskContent} {...rowPan.panHandlers}>
                <TouchableOpacity
                    style={styles.qCheckbox}
                    onPress={() => onToggle(task)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                    <View style={[
                        styles.qCheckInner,
                        { borderColor: Colors.light.textTertiary },
                        task.completed && styles.qCheckCompleted,
                    ]}>
                        {task.completed && (
                            <Ionicons name="checkmark" size={10} color="#fff" />
                        )}
                    </View>
                </TouchableOpacity>
                <View style={styles.taskItemContent}>
                    <Text
                        style={[
                            styles.trayTaskTitle,
                            task.completed && styles.qTaskTitleCompleted,
                        ]}
                        numberOfLines={1}
                    >
                        {task.title}
                    </Text>
                    {(due || group) && (
                        <View style={styles.taskItemMeta}>
                            {due && (
                                <View style={styles.taskMetaTag}>
                                    <Ionicons name="calendar-outline" size={10} color={Colors.light.textTertiary} />
                                    <Text style={styles.taskMetaText}>{due}</Text>
                                </View>
                            )}
                            {group && (
                                <View style={styles.taskMetaTag}>
                                    <View style={[styles.taskGroupDot, { backgroundColor: group.color || Colors.light.textTertiary }]} />
                                    <Text style={styles.taskMetaText} numberOfLines={1}>{group.name}</Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>
            </View>
            {/* Instant-drag handle (separate touch target) */}
            <View style={styles.dragHandle} {...handlePan.panHandlers}>
                <Ionicons name="move-outline" size={14} color={Colors.light.textTertiary} />
            </View>
        </View>
    );
}

// ── Quadrant Cell ────────────────────────────────────────────
function QuadrantCell({
    q,
    qIdx,
    tasks: qTasks,
    groupMap,
    animStyle,
    detailLevel,
    onExpand,
    onToggle,
    onAdd,
    onEdit,
    isExpanded,
    isCollapsed,
    isDragging,
    isHovered,
    onDragStart,
    onDragMove,
    onDragEnd,
    onLayoutQuadrant,
}: {
    q: Quadrant;
    qIdx: number;
    tasks: Task[];
    groupMap: Record<string, TaskGroup>;
    animStyle: any;
    detailLevel: DetailLevel;
    onExpand: (idx: number) => void;
    onToggle: (task: Task) => void;
    onAdd: (q: Quadrant) => void;
    onEdit: (task: Task) => void;
    isExpanded: boolean;
    isCollapsed: boolean;
    isDragging: boolean;
    isHovered: boolean;
    onDragStart: (task: Task, x: number, y: number, source: Quadrant | "uncategorized") => void;
    onDragMove: (x: number, y: number) => void;
    onDragEnd: () => void;
    onLayoutQuadrant: (layout: { x: number; y: number; w: number; h: number }) => void;
}) {
    const meta = QUADRANT_META[q];
    const innerRef = useRef<View>(null);

    return (
        <Animated.View
            style={[styles.quadrant, animStyle]}
            onLayout={() => {
                // Measure the inner view's position in the window
                innerRef.current?.measureInWindow((x, y, w, h) => {
                    onLayoutQuadrant({ x, y, w, h });
                });
            }}
        >
            <View
                ref={innerRef}
                style={[
                    styles.qInner,
                    { borderColor: meta.border },
                    isHovered && {
                        borderColor: meta.color,
                        borderWidth: 2,
                        backgroundColor: meta.bg,
                        shadowColor: meta.color,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.3,
                        shadowRadius: 12,
                        elevation: 8,
                    },
                ]}
            >
                {/* Header */}
                <View style={[styles.qHeader, { backgroundColor: meta.bg }]}>
                    <View style={styles.qHeaderLeft}>
                        <View style={[styles.qDot, { backgroundColor: meta.color }]} />
                        {!isCollapsed && (
                            <>
                                <Text
                                    style={[
                                        styles.qLabel,
                                        { color: meta.color },
                                        isExpanded && styles.qLabelExpanded,
                                    ]}
                                    numberOfLines={1}
                                >
                                    {meta.sublabel}
                                </Text>
                                <Text style={[styles.qCount, isExpanded && styles.qCountExpanded]}>
                                    {qTasks.length}
                                </Text>
                            </>
                        )}
                        {isCollapsed && (
                            <Text style={styles.qCount}>{qTasks.length}</Text>
                        )}
                    </View>
                    <View style={styles.qHeaderRight}>
                        {!isCollapsed && (
                            <TouchableOpacity
                                onPress={() => onAdd(q)}
                                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                            >
                                <Ionicons name="add-circle-outline" size={18} color={meta.color} />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            onPress={() => onExpand(qIdx)}
                            hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                            style={[
                                styles.expandBtn,
                                isExpanded && { backgroundColor: meta.color + "20" },
                            ]}
                        >
                            <Ionicons
                                name={isExpanded ? "contract-outline" : "expand-outline"}
                                size={14}
                                color={meta.color}
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Task list */}
                <ScrollView
                    style={styles.qTaskList}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled
                    scrollEnabled={!isDragging}
                >
                    {qTasks.map((task) => (
                        <TaskItem
                            key={task.id}
                            task={task}
                            q={q}
                            meta={meta}
                            detailLevel={detailLevel}
                            groupMap={groupMap}
                            onToggle={onToggle}
                            onEdit={onEdit}
                            isExpanded={isExpanded}
                            onDragStart={onDragStart}
                            onDragMove={onDragMove}
                            onDragEnd={onDragEnd}
                        />
                    ))}
                    {qTasks.length === 0 && (
                        <View style={styles.qEmptyContainer}>
                            {isDragging ? (
                                <View style={styles.dropZone}>
                                    <Ionicons name="add-circle" size={24} color={meta.color + "80"} />
                                    <Text style={[styles.dropZoneText, { color: meta.color }]}>
                                        Drop here
                                    </Text>
                                </View>
                            ) : (
                                <Text style={styles.qEmpty}>No tasks</Text>
                            )}
                        </View>
                    )}
                </ScrollView>
            </View>
        </Animated.View>
    );
}

// ── Task Item (progressive detail + draggable) ───────────────
function TaskItem({
    task,
    q,
    meta,
    detailLevel,
    groupMap,
    onToggle,
    onEdit,
    isExpanded,
    onDragStart,
    onDragMove,
    onDragEnd,
}: {
    task: Task;
    q: Quadrant;
    meta: typeof QUADRANT_META["DO"];
    detailLevel: DetailLevel;
    groupMap: Record<string, TaskGroup>;
    onToggle: (task: Task) => void;
    onEdit: (task: Task) => void;
    isExpanded: boolean;
    onDragStart: (task: Task, x: number, y: number, source: Quadrant | "uncategorized") => void;
    onDragMove: (x: number, y: number) => void;
    onDragEnd: () => void;
}) {
    const due = formatDueCompact(task);
    const group = task.groupId ? groupMap[task.groupId] : null;
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isDraggingRef = useRef(false);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gs) =>
                isDraggingRef.current || Math.abs(gs.dx) > 5 || Math.abs(gs.dy) > 5,
            onPanResponderGrant: (evt) => {
                const { pageX, pageY } = evt.nativeEvent;
                longPressTimer.current = setTimeout(() => {
                    isDraggingRef.current = true;
                    onDragStart(task, pageX, pageY, q);
                }, 350);
            },
            onPanResponderMove: (evt, gs) => {
                if (isDraggingRef.current) {
                    onDragMove(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
                } else if (Math.abs(gs.dx) > 8 || Math.abs(gs.dy) > 8) {
                    if (longPressTimer.current) {
                        clearTimeout(longPressTimer.current);
                        longPressTimer.current = null;
                    }
                }
            },
            onPanResponderRelease: () => {
                if (longPressTimer.current) {
                    clearTimeout(longPressTimer.current);
                    longPressTimer.current = null;
                }
                if (isDraggingRef.current) {
                    isDraggingRef.current = false;
                    onDragEnd();
                } else {
                    onEdit(task);
                }
            },
            onPanResponderTerminate: () => {
                if (longPressTimer.current) {
                    clearTimeout(longPressTimer.current);
                    longPressTimer.current = null;
                }
                if (isDraggingRef.current) {
                    isDraggingRef.current = false;
                    onDragEnd();
                }
            },
        })
    ).current;

    return (
        <View style={styles.qTask} {...panResponder.panHandlers}>
            {/* Checkbox */}
            <TouchableOpacity
                style={styles.qCheckbox}
                onPress={() => onToggle(task)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
                <View style={[
                    styles.qCheckInner,
                    { borderColor: meta.color },
                    task.completed && styles.qCheckCompleted,
                ]}>
                    {task.completed && (
                        <Ionicons name="checkmark" size={10} color="#fff" />
                    )}
                </View>
            </TouchableOpacity>

            {/* Content */}
            <View style={styles.taskItemContent}>
                <Text
                    style={[
                        styles.qTaskTitle,
                        isExpanded && styles.qTaskTitleExpanded,
                        task.completed && styles.qTaskTitleCompleted,
                    ]}
                    numberOfLines={detailLevel === "compact" ? 1 : 2}
                >
                    {task.title}
                </Text>

                {/* Medium: show due date + group */}
                {detailLevel !== "compact" && (
                    <View style={styles.taskItemMeta}>
                        {due && (
                            <View style={styles.taskMetaTag}>
                                <Ionicons name="calendar-outline" size={10} color={Colors.light.textTertiary} />
                                <Text style={styles.taskMetaText}>{due}</Text>
                            </View>
                        )}
                        {group && (
                            <View style={styles.taskMetaTag}>
                                <View style={[styles.taskGroupDot, { backgroundColor: group.color || Colors.light.textTertiary }]} />
                                <Text style={styles.taskMetaText} numberOfLines={1}>{group.name}</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Expanded: notes preview */}
                {detailLevel === "expanded" && task.notes ? (
                    <Text style={styles.taskNotes} numberOfLines={1}>
                        {task.notes}
                    </Text>
                ) : null}
            </View>
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────
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
        paddingTop: Platform.OS === "ios" ? 60 : 48,
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
    resetBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: Radius.full,
        backgroundColor: Colors.light.accentLight,
    },
    resetBtnText: {
        fontSize: FontSize.xs,
        fontWeight: "600",
        color: Colors.light.accent,
    },
    grid: {
        flex: 1,
    },
    gridInner: {
        flex: 1,
    },
    gridRow: {
        flexDirection: "row",
    },
    quadrant: {
        padding: Spacing.xs,
    },
    qInner: {
        flex: 1,
        borderRadius: Radius.lg,
        borderWidth: 1,
        overflow: "hidden",
    },
    qHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: Spacing.sm + 2,
        paddingVertical: 7,
    },
    qHeaderLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        flex: 1,
    },
    qHeaderRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    qDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    qLabel: {
        fontSize: FontSize.sm,
        fontWeight: "700",
        flexShrink: 1,
    },
    qLabelExpanded: {
        fontSize: FontSize.md,
    },
    qCount: {
        fontSize: 11,
        color: Colors.light.textTertiary,
        fontWeight: "600",
    },
    qCountExpanded: {
        fontSize: FontSize.xs,
    },
    expandBtn: {
        padding: 4,
        borderRadius: Radius.sm,
    },
    qTaskList: {
        flex: 1,
        backgroundColor: Colors.light.bgCard,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
    },
    qTask: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 6,
        paddingVertical: 6,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.light.borderLight,
    },
    qCheckbox: {
        padding: 2,
        marginTop: 1,
    },
    qCheckInner: {
        width: 16,
        height: 16,
        borderRadius: 5,
        borderWidth: 1.5,
        justifyContent: "center" as const,
        alignItems: "center" as const,
    },
    taskItemContent: {
        flex: 1,
    },
    qTaskTitle: {
        fontSize: FontSize.sm,
        color: Colors.light.textPrimary,
        lineHeight: 18,
    },
    qTaskTitleExpanded: {
        fontSize: FontSize.md,
        lineHeight: 22,
    },
    qTaskTitleCompleted: {
        textDecorationLine: "line-through" as const,
        color: Colors.light.textTertiary,
    },
    qCheckCompleted: {
        backgroundColor: Colors.light.success,
        borderColor: Colors.light.success,
    },
    taskItemMeta: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 3,
    },
    taskMetaTag: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
    },
    taskMetaText: {
        fontSize: 11,
        color: Colors.light.textTertiary,
    },
    taskGroupDot: {
        width: 5,
        height: 5,
        borderRadius: 3,
    },
    taskNotes: {
        fontSize: 11,
        color: Colors.light.textTertiary,
        fontStyle: "italic",
        marginTop: 2,
    },
    qEmptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: Spacing.lg,
    },
    qEmpty: {
        fontSize: FontSize.xs,
        color: Colors.light.textTertiary,
        textAlign: "center",
    },
    dropZone: {
        alignItems: "center",
        gap: 4,
    },
    dropZoneText: {
        fontSize: FontSize.xs,
        fontWeight: "600",
    },
    filterBar: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: Spacing.lg,
        paddingTop: 8,
        paddingBottom: 4,
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
        fontWeight: "500" as const,
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
    // ── Tray styles ──────────────────────────────────────────
    tray: {
        backgroundColor: Colors.light.bgCard,
        borderTopWidth: 0,
        borderTopLeftRadius: Radius.xl,
        borderTopRightRadius: Radius.xl,
        ...Shadows.xl,
        shadowOffset: { width: 0, height: -4 },
        overflow: "hidden",
    },
    trayHandle: {
        alignItems: "center",
        paddingTop: 10,
        paddingBottom: 8,
        paddingHorizontal: Spacing.lg,
    },
    trayHandlePill: {
        width: 40,
        height: 5,
        borderRadius: 3,
        backgroundColor: Colors.light.borderLight,
        marginBottom: 10,
    },
    trayHandleRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
    },
    trayHandleLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    trayHandleText: {
        fontSize: FontSize.sm,
        color: Colors.light.textTertiary,
        fontWeight: "600",
    },
    trayContent: {
        overflow: "hidden",
    },
    trayScrollContent: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.lg,
    },
    trayTask: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: Spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.light.borderLight,
        backgroundColor: Colors.light.bgCard,
        borderRadius: Radius.sm,
    },
    trayTaskContent: {
        flex: 1,
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 8,
    },
    trayTaskTitle: {
        fontSize: FontSize.sm,
        color: Colors.light.textPrimary,
        lineHeight: 18,
    },
    dragHandle: {
        width: 34,
        height: 34,
        borderRadius: Radius.sm,
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
        backgroundColor: Colors.light.bg,
        justifyContent: "center" as const,
        alignItems: "center" as const,
        marginLeft: 8,
        ...Shadows.sm,
    },
    // ── Ghost card ───────────────────────────────────────────
    ghostCard: {
        position: "absolute",
        zIndex: 999,
        width: 170,
    },
    ghostCardInner: {
        backgroundColor: Colors.light.bgCard,
        borderRadius: Radius.lg,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderWidth: 1.5,
        borderColor: Colors.light.accent,
        ...Shadows.xl,
        shadowColor: Colors.light.accent,
        shadowOpacity: 0.25,
    },
    ghostCardText: {
        fontSize: FontSize.sm,
        fontWeight: "600",
        color: Colors.light.textPrimary,
    },
});
