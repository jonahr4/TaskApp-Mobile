import { useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";
import { useTasks } from "@/hooks/useTasks";
import { useTaskGroups } from "@/hooks/useTaskGroups";
import { Colors, Spacing, Radius, FontSize, Shadows } from "@/lib/theme";
import { getQuadrant, QUADRANT_META } from "@/lib/types";
import type { Task, Quadrant } from "@/lib/types";
import ScreenHeader from "@/components/ScreenHeader";

function StatCard({
    icon,
    label,
    value,
    subValue,
    color,
    bgColor,
}: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    subValue: string;
    color: string;
    bgColor: string;
}) {
    return (
        <View style={[styles.statCard, { borderLeftColor: color }]}>
            <View style={[styles.statIcon, { backgroundColor: bgColor }]}>
                {icon}
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={styles.statSub}>{subValue}</Text>
        </View>
    );
}

export default function StatsScreen() {
    const { user } = useAuth();
    const { tasks } = useTasks(user?.uid);
    const { groups } = useTaskGroups(user?.uid);

    const stats = useMemo(() => {
        const total = tasks.length;
        const completed = tasks.filter((t) => t.completed).length;
        const active = total - completed;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        // By quadrant
        const quadrantCounts: Record<string, number> = { DO: 0, SCHEDULE: 0, DELEGATE: 0, DELETE: 0, none: 0 };
        for (const t of tasks) {
            const q = getQuadrant(t);
            quadrantCounts[q ?? "none"]++;
        }

        // By group
        const groupCounts: { name: string; color: string; count: number }[] = [];
        for (const g of groups) {
            const count = tasks.filter((t) => t.groupId === g.id).length;
            groupCounts.push({ name: g.name, color: g.color || Colors.light.textTertiary, count });
        }
        groupCounts.sort((a, b) => b.count - a.count);

        // Overdue
        const today = new Date().toISOString().split("T")[0];
        const overdue = tasks.filter(
            (t) => !t.completed && t.dueDate && t.dueDate < today
        ).length;

        // Due today
        const dueToday = tasks.filter(
            (t) => !t.completed && t.dueDate === today
        ).length;

        // Streak (consecutive days with completed tasks)
        const completedDates = new Set(
            tasks
                .filter((t) => t.completed && t.updatedAt)
                .map((t) => {
                    try {
                        const d = t.updatedAt.toDate();
                        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                    } catch {
                        return null;
                    }
                })
                .filter(Boolean) as string[]
        );
        let streak = 0;
        const d = new Date();
        while (true) {
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            if (completedDates.has(dateStr)) {
                streak++;
                d.setDate(d.getDate() - 1);
            } else {
                break;
            }
        }

        return { total, completed, active, completionRate, quadrantCounts, groupCounts, overdue, dueToday, streak };
    }, [tasks, groups]);

    return (
        <View style={styles.container}>
            {/* Header */}
            <ScreenHeader title="Stats" />

            <ScrollView
                style={styles.body}
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Quick Stats */}
                <View style={styles.statGrid}>
                    <StatCard
                        icon={<Ionicons name="checkmark-circle" size={20} color={Colors.light.success} />}
                        label="Completed"
                        value={stats.completed}
                        subValue={`${stats.completionRate}% rate`}
                        color={Colors.light.success}
                        bgColor="#f0fdf4"
                    />
                    <StatCard
                        icon={<Ionicons name="time" size={20} color={Colors.light.accent} />}
                        label="Active"
                        value={stats.active}
                        subValue={`${stats.total} total`}
                        color={Colors.light.accent}
                        bgColor={Colors.light.accentLight}
                    />
                    <StatCard
                        icon={<Ionicons name="flame" size={20} color="#f59e0b" />}
                        label="Streak"
                        value={`${stats.streak}d`}
                        subValue="consecutive"
                        color="#f59e0b"
                        bgColor="#fffbeb"
                    />
                    <StatCard
                        icon={<Ionicons name="alert-circle" size={20} color={Colors.light.danger} />}
                        label="Overdue"
                        value={stats.overdue}
                        subValue={`${stats.dueToday} due today`}
                        color={Colors.light.danger}
                        bgColor="#fef2f2"
                    />
                </View>

                {/* Quadrant Distribution */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Priority Distribution</Text>
                    {(["DO", "SCHEDULE", "DELEGATE", "DELETE"] as Quadrant[]).map((q) => {
                        const meta = QUADRANT_META[q];
                        const count = stats.quadrantCounts[q];
                        const total = stats.total || 1;
                        const pct = Math.round((count / total) * 100);
                        return (
                            <View key={q} style={styles.barRow}>
                                <View style={styles.barLabel}>
                                    <View style={[styles.barDot, { backgroundColor: meta.color }]} />
                                    <Text style={styles.barLabelText}>{meta.sublabel}</Text>
                                </View>
                                <View style={styles.barTrack}>
                                    <View
                                        style={[
                                            styles.barFill,
                                            { width: `${pct}%`, backgroundColor: meta.color },
                                        ]}
                                    />
                                </View>
                                <Text style={styles.barCount}>{count}</Text>
                            </View>
                        );
                    })}
                    {stats.quadrantCounts.none > 0 && (
                        <View style={styles.barRow}>
                            <View style={styles.barLabel}>
                                <View style={[styles.barDot, { backgroundColor: Colors.light.textTertiary }]} />
                                <Text style={styles.barLabelText}>No Priority</Text>
                            </View>
                            <View style={styles.barTrack}>
                                <View
                                    style={[
                                        styles.barFill,
                                        {
                                            width: `${Math.round((stats.quadrantCounts.none / (stats.total || 1)) * 100)}%`,
                                            backgroundColor: Colors.light.textTertiary,
                                        },
                                    ]}
                                />
                            </View>
                            <Text style={styles.barCount}>{stats.quadrantCounts.none}</Text>
                        </View>
                    )}
                </View>

                {/* Group Breakdown */}
                {stats.groupCounts.length > 0 && (
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Tasks by List</Text>
                        {stats.groupCounts.map((g) => (
                            <View key={g.name} style={styles.groupRow}>
                                <View style={[styles.barDot, { backgroundColor: g.color }]} />
                                <Text style={styles.groupName}>{g.name}</Text>
                                <Text style={styles.groupCount}>{g.count}</Text>
                            </View>
                        ))}
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
        ...Shadows.sm,
    },
    headerTitle: {
        fontSize: FontSize.title,
        fontWeight: "800",
        color: Colors.light.textPrimary,
        letterSpacing: -0.5,
    },
    body: {
        flex: 1,
        padding: Spacing.lg,
    },
    statGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: Spacing.md,
        marginBottom: Spacing.lg,
    },
    statCard: {
        width: "47%",
        backgroundColor: Colors.light.bgCard,
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        borderWidth: 0,
        borderLeftWidth: 4,
        ...Shadows.md,
    },
    statIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: Spacing.sm,
    },
    statValue: {
        fontSize: FontSize.xxl,
        fontWeight: "700",
        color: Colors.light.textPrimary,
    },
    statLabel: {
        fontSize: FontSize.sm,
        fontWeight: "600",
        color: Colors.light.textSecondary,
        marginTop: 2,
    },
    statSub: {
        fontSize: FontSize.xs,
        color: Colors.light.textTertiary,
        marginTop: 1,
    },
    sectionCard: {
        backgroundColor: Colors.light.bgCard,
        borderRadius: Radius.xl,
        padding: Spacing.xl,
        marginBottom: Spacing.lg,
        borderWidth: 0,
        ...Shadows.md,
    },
    sectionTitle: {
        fontSize: FontSize.lg,
        fontWeight: "600",
        color: Colors.light.textPrimary,
        marginBottom: Spacing.lg,
    },
    barRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    barLabel: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        width: 90,
    },
    barDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    barLabelText: {
        fontSize: FontSize.sm,
        color: Colors.light.textSecondary,
        fontWeight: "500",
    },
    barTrack: {
        flex: 1,
        height: 10,
        backgroundColor: Colors.light.bg,
        borderRadius: 5,
        overflow: "hidden",
    },
    barFill: {
        height: "100%",
        borderRadius: 5,
    },
    barCount: {
        fontSize: FontSize.sm,
        fontWeight: "600",
        color: Colors.light.textPrimary,
        width: 30,
        textAlign: "right",
    },
    groupRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        paddingVertical: Spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.light.borderLight,
    },
    groupName: {
        flex: 1,
        fontSize: FontSize.md,
        color: Colors.light.textPrimary,
    },
    groupCount: {
        fontSize: FontSize.md,
        fontWeight: "600",
        color: Colors.light.textSecondary,
    },
});
