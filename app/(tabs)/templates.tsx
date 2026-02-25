import { useState, useMemo, useCallback, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Fuse from "fuse.js";
import { useAuth } from "@/hooks/useAuth";
import { useTasks } from "@/hooks/useTasks";
import { useTaskGroups } from "@/hooks/useTaskGroups";
import { useColors } from "@/hooks/useTheme";
import { Colors, Spacing, Radius, FontSize, Shadows } from "@/lib/theme";
import { getQuadrant, QUADRANT_META } from "@/lib/types";
import type { Task, TaskGroup } from "@/lib/types";
import TaskModal from "@/components/TaskModal";
import ScreenHeader from "@/components/ScreenHeader";

// ── Date parsing ─────────────────────────────────────────────
const MONTH_NAMES: Record<string, number> = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, sept: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11,
};

/**
 * Parse natural date queries into { month, day? } for matching.
 * Handles: "sep", "sept 5", "september 5", "12/5", "12-5", "2025-12-05"
 */
function parseDateQuery(q: string): { month: number; day?: number } | null {
    const trimmed = q.trim().toLowerCase();

    // ISO: 2025-12-05
    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
        return { month: parseInt(isoMatch[2], 10) - 1, day: parseInt(isoMatch[3], 10) };
    }

    // Numeric: 12/5 or 12-5
    const numMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
    if (numMatch) {
        return { month: parseInt(numMatch[1], 10) - 1, day: parseInt(numMatch[2], 10) };
    }

    // Month name with optional day: "sep", "sept 5", "september 12"
    const nameMatch = trimmed.match(/^([a-z]+)\s*(\d{1,2})?$/);
    if (nameMatch) {
        const monthNum = MONTH_NAMES[nameMatch[1]];
        if (monthNum !== undefined) {
            return { month: monthNum, day: nameMatch[2] ? parseInt(nameMatch[2], 10) : undefined };
        }
    }

    return null;
}

function matchesDateQuery(dueDate: string | null, dateQ: { month: number; day?: number }): boolean {
    if (!dueDate) return false;
    // dueDate is "YYYY-MM-DD"
    const parts = dueDate.split("-");
    if (parts.length < 3) return false;
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (m !== dateQ.month) return false;
    if (dateQ.day !== undefined && d !== dateQ.day) return false;
    return true;
}

// ── Formatting helpers ───────────────────────────────────────
function formatDueDate(task: Task): string | null {
    if (!task.dueDate) return null;
    const [y, m, d] = task.dueDate.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.getTime() === today.getTime()) return "Today";
    if (date.getTime() === tomorrow.getTime()) return "Tomorrow";
    if (date.getTime() === yesterday.getTime()) return "Yesterday";

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const str = `${months[date.getMonth()]} ${date.getDate()}`;
    if (date.getFullYear() !== today.getFullYear()) return `${str}, ${date.getFullYear()}`;
    return str;
}

type StatusFilter = "all" | "active" | "completed";

// ── Component ────────────────────────────────────────────────
function makeStyles(C: typeof Colors.light) { return StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: C.bg,
    },
    header: {
        paddingHorizontal: Spacing.xl,
        paddingTop: Platform.OS === "ios" ? 60 : 48,
        paddingBottom: Spacing.sm,
        backgroundColor: C.bgCard,
        ...Shadows.sm,
    },
    headerTitle: {
        fontSize: FontSize.title,
        fontWeight: "800",
        color: C.textPrimary,
        letterSpacing: -0.5,
    },
    searchWrap: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: Spacing.lg,
        marginTop: Spacing.md,
        backgroundColor: C.bgCard,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: C.borderLight,
        paddingHorizontal: Spacing.md,
        ...Shadows.sm,
    },
    searchInput: {
        flex: 1,
        height: 44,
        fontSize: FontSize.md,
        color: C.textPrimary,
    },
    filterRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: Radius.full,
        backgroundColor: C.bgCard,
        borderWidth: 1,
        borderColor: C.borderLight,
    },
    chipActive: {
        backgroundColor: C.accent,
        borderColor: C.accent,
    },
    chipText: {
        fontSize: FontSize.xs,
        fontWeight: "600",
        color: C.textSecondary,
    },
    chipTextActive: {
        color: "#fff",
    },
    resultCount: {
        fontSize: FontSize.xs,
        color: C.textTertiary,
        marginLeft: "auto",
    },
    body: {
        flex: 1,
        paddingHorizontal: Spacing.lg,
    },
    emptyState: {
        alignItems: "center",
        paddingTop: 80,
        gap: 8,
    },
    emptyTitle: {
        fontSize: FontSize.lg,
        fontWeight: "600",
        color: C.textSecondary,
    },
    emptyHint: {
        fontSize: FontSize.sm,
        color: C.textTertiary,
        textAlign: "center",
        paddingHorizontal: Spacing.xl,
    },
    resultRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: C.bgCard,
        borderRadius: Radius.lg,
        borderWidth: 0,
        padding: Spacing.lg,
        marginBottom: Spacing.sm,
        ...Shadows.sm,
    },
    statusDot: {
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: "center",
        alignItems: "center",
        marginRight: Spacing.md,
        marginTop: 1,
    },
    statusDotActive: {
        borderWidth: 2,
        borderColor: C.borderLight,
        backgroundColor: "transparent",
    },
    statusDotDone: {
        backgroundColor: C.success,
    },
    resultContent: {
        flex: 1,
    },
    resultTitle: {
        fontSize: FontSize.md,
        fontWeight: "500",
        color: C.textPrimary,
        marginBottom: 3,
    },
    resultTitleDone: {
        textDecorationLine: "line-through",
        color: C.textTertiary,
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 6,
    },
    metaTag: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
    },
    metaText: {
        fontSize: FontSize.xs,
        color: C.textTertiary,
    },
    groupDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    priorityBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: Radius.full,
        borderWidth: 1,
    },
    priorityDot: {
        width: 5,
        height: 5,
        borderRadius: 3,
    },
    priorityText: {
        fontSize: 11,
        fontWeight: "600",
    },
    notesPreview: {
        fontSize: FontSize.xs,
        color: C.textTertiary,
        fontStyle: "italic",
        marginTop: 3,
    },
});
}

export default function SearchScreen() {
    const C = useColors();
    const styles = useMemo(() => makeStyles(C), [C]);
    const { user } = useAuth();
    const { tasks, reloadLocal } = useTasks(user?.uid);
    const { groups, reloadLocal: reloadLocalGroups } = useTaskGroups(user?.uid);
    const inputRef = useRef<TextInput>(null);

    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [editTask, setEditTask] = useState<Task | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    const handleLocalChange = useCallback(() => {
        reloadLocal();
        reloadLocalGroups();
    }, [reloadLocal, reloadLocalGroups]);

    // Group lookup map
    const groupMap = useMemo(() => {
        const m: Record<string, TaskGroup> = {};
        for (const g of groups) m[g.id] = g;
        return m;
    }, [groups]);

    // Fuse instance (fuzzy text search on title + notes)
    const fuse = useMemo(() => {
        return new Fuse(tasks, {
            keys: [
                { name: "title", weight: 0.7 },
                { name: "notes", weight: 0.3 },
            ],
            threshold: 0.35,
            ignoreLocation: true,
            minMatchCharLength: 1,
        });
    }, [tasks]);

    // Search results
    const results = useMemo(() => {
        const q = query.trim();
        if (!q) return [];

        // 1. Status filter
        let pool = tasks;
        if (statusFilter === "active") pool = tasks.filter((t) => !t.completed);
        else if (statusFilter === "completed") pool = tasks.filter((t) => t.completed);

        // 2. Try date parsing first
        const dateQ = parseDateQuery(q);
        let dateMatches: Task[] = [];
        if (dateQ) {
            dateMatches = pool.filter((t) => matchesDateQuery(t.dueDate, dateQ));
        }

        // 3. Group name matching (case-insensitive contains)
        const qLower = q.toLowerCase();
        const groupMatches = pool.filter((t) => {
            const g = t.groupId ? groupMap[t.groupId] : undefined;
            return g && g.name.toLowerCase().includes(qLower);
        });

        // 4. Fuzzy text search
        const fuseForPool = new Fuse(pool, {
            keys: [
                { name: "title", weight: 0.7 },
                { name: "notes", weight: 0.3 },
            ],
            threshold: 0.35,
            ignoreLocation: true,
            minMatchCharLength: 1,
        });
        const textResults = fuseForPool.search(q).map((r) => r.item);

        // 5. Merge: date matches → group matches → text matches (deduped)
        const seen = new Set<string>();
        const merged: Task[] = [];
        for (const t of dateMatches) {
            if (!seen.has(t.id)) {
                seen.add(t.id);
                merged.push(t);
            }
        }
        for (const t of groupMatches) {
            if (!seen.has(t.id)) {
                seen.add(t.id);
                merged.push(t);
            }
        }
        for (const t of textResults) {
            if (!seen.has(t.id)) {
                seen.add(t.id);
                merged.push(t);
            }
        }

        return merged;
    }, [query, tasks, groups, statusFilter, groupMap]);

    const resultCount = results.length;

    return (
        <View style={styles.container}>
            {/* Header */}
            <ScreenHeader title="Search" />

            {/* Search bar */}
            <View style={styles.searchWrap}>
                <Ionicons name="search" size={18} color={C.textTertiary} style={{ marginRight: 6 }} />
                <TextInput
                    ref={inputRef}
                    style={styles.searchInput}
                    placeholder="Search tasks, groups, dates..."
                    placeholderTextColor={C.textTertiary}
                    value={query}
                    onChangeText={setQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                    clearButtonMode="while-editing"
                    returnKeyType="search"
                />
            </View>

            {/* Status filter chips */}
            <View style={styles.filterRow}>
                {(["all", "active", "completed"] as StatusFilter[]).map((f) => (
                    <TouchableOpacity
                        key={f}
                        style={[styles.chip, statusFilter === f && styles.chipActive]}
                        onPress={() => setStatusFilter(f)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.chipText, statusFilter === f && styles.chipTextActive]}>
                            {f === "all" ? "All" : f === "active" ? "Active" : "Completed"}
                        </Text>
                    </TouchableOpacity>
                ))}
                {query.length > 0 && (
                    <Text style={styles.resultCount}>{resultCount} result{resultCount !== 1 ? "s" : ""}</Text>
                )}
            </View>

            {/* Results */}
            <ScrollView
                style={styles.body}
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
            >
                {query.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="search-outline" size={48} color={C.borderLight} />
                        <Text style={styles.emptyTitle}>Search your tasks</Text>
                        <Text style={styles.emptyHint}>Try a task name, note, or date like "sep 5" or "12/5"</Text>
                    </View>
                ) : results.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="alert-circle-outline" size={40} color={C.borderLight} />
                        <Text style={styles.emptyTitle}>No matches</Text>
                        <Text style={styles.emptyHint}>Try a different search term</Text>
                    </View>
                ) : (
                    results.map((task) => {
                        const quadrant = getQuadrant(task);
                        const meta = quadrant ? QUADRANT_META[quadrant] : null;
                        const due = formatDueDate(task);
                        const group = task.groupId ? groupMap[task.groupId] : null;

                        return (
                            <TouchableOpacity
                                key={task.id}
                                style={styles.resultRow}
                                activeOpacity={0.65}
                                onPress={() => {
                                    inputRef.current?.blur();
                                    setEditTask(task);
                                    setModalOpen(true);
                                }}
                            >
                                {/* Status indicator */}
                                <View style={[styles.statusDot, task.completed ? styles.statusDotDone : styles.statusDotActive]} >
                                    {task.completed && <Ionicons name="checkmark" size={10} color="#fff" />}
                                </View>

                                {/* Content */}
                                <View style={styles.resultContent}>
                                    <Text
                                        style={[styles.resultTitle, task.completed && styles.resultTitleDone]}
                                        numberOfLines={1}
                                    >
                                        {task.title}
                                    </Text>

                                    {/* Meta row */}
                                    <View style={styles.metaRow}>
                                        {due && (
                                            <View style={styles.metaTag}>
                                                <Ionicons name="calendar-outline" size={12} color={C.textTertiary} />
                                                <Text style={styles.metaText}>{due}</Text>
                                            </View>
                                        )}
                                        {group && (
                                            <View style={styles.metaTag}>
                                                <View style={[styles.groupDot, { backgroundColor: group.color || C.textTertiary }]} />
                                                <Text style={styles.metaText} numberOfLines={1}>{group.name}</Text>
                                            </View>
                                        )}
                                        {meta && (
                                            <View style={[styles.priorityBadge, { backgroundColor: meta.bg, borderColor: meta.border }]}>
                                                <View style={[styles.priorityDot, { backgroundColor: meta.color }]} />
                                                <Text style={[styles.priorityText, { color: meta.color }]}>{meta.sublabel}</Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Notes preview */}
                                    {task.notes ? (
                                        <Text style={styles.notesPreview} numberOfLines={1}>
                                            {task.notes}
                                        </Text>
                                    ) : null}
                                </View>
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>

            {/* Task Modal */}
            <TaskModal
                visible={modalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setEditTask(null);
                    if (!user) handleLocalChange();
                }}
                task={editTask}
                groups={groups}
            />
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────