import ScreenHeader from "@/components/ScreenHeader";
import { useAuth } from "@/hooks/useAuth";
import { useTaskGroups } from "@/hooks/useTaskGroups";
import { useTasks } from "@/hooks/useTasks";
import { useColors } from "@/hooks/useTheme";
import { db } from "@/lib/firebase";
import { Colors, FontSize, Radius, Shadows, Spacing } from "@/lib/theme";
import type { Quadrant } from "@/lib/types";
import { getQuadrant, QUADRANT_META } from "@/lib/types";
import { UserData } from "@/lib/userData";
import { Ionicons } from "@expo/vector-icons";
import { doc, DocumentData, DocumentSnapshot, onSnapshot } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

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
    const C = useColors();
    const styles = useMemo(() => makeStyles(C), [C]);
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

function makeStyles(C: typeof Colors.light) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: C.bg,
        },
        header: {
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
            backgroundColor: C.bgCard,
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
            color: C.textPrimary,
        },
        statLabel: {
            fontSize: FontSize.sm,
            fontWeight: "600",
            color: C.textSecondary,
            marginTop: 2,
        },
        statSub: {
            fontSize: FontSize.xs,
            color: C.textTertiary,
            marginTop: 1,
        },
        sectionCard: {
            backgroundColor: C.bgCard,
            borderRadius: Radius.xl,
            padding: Spacing.xl,
            marginBottom: Spacing.lg,
            borderWidth: 0,
            ...Shadows.md,
        },
        sectionTitle: {
            fontSize: FontSize.lg,
            fontWeight: "600",
            color: C.textPrimary,
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
            color: C.textSecondary,
            fontWeight: "500",
        },
        barTrack: {
            flex: 1,
            height: 10,
            backgroundColor: C.bg,
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
            color: C.textPrimary,
            width: 30,
            textAlign: "right",
        },
        groupRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: Spacing.sm,
            paddingVertical: Spacing.sm,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: C.borderLight,
        },
        groupName: {
            flex: 1,
            fontSize: FontSize.md,
            color: C.textPrimary,
        },
        groupCount: {
            fontSize: FontSize.md,
            fontWeight: "600",
            color: C.textSecondary,
        },
        datesUsedHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: Spacing.sm,
        },
        datesUsedHeaderLeft: {
            flexDirection: "row",
            alignItems: "center",
            gap: Spacing.sm,
        },
        datesUsedTitle: {
            fontSize: FontSize.lg,
            fontWeight: "600",
            color: C.textPrimary,
        },
        datesUsedContent: {
            marginTop: Spacing.md,
            backgroundColor: C.bg,
            borderRadius: Radius.lg,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: C.borderLight,
        },
        datesUsedRow: {
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: Spacing.md,
            paddingHorizontal: Spacing.md,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: C.borderLight,
        },
        datesUsedRowLast: {
            borderBottomWidth: 0,
        },
        datesUsedDate: {
            flex: 1,
            fontSize: FontSize.md,
            fontWeight: "600",
            color: C.textPrimary,
        },
        datesUsedDataRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: Spacing.lg,
        },
        datesUsedDataItem: {
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            width: 50,
        },
        datesUsedDataText: {
            fontSize: FontSize.md,
            fontWeight: "600",
            color: C.textSecondary,
        },
        datesUsedEmpty: {
            padding: Spacing.lg,
            alignItems: "center",
        },
        datesUsedEmptyText: {
            fontSize: FontSize.md,
            color: C.textTertiary,
        },
    });
}

export default function StatsScreen() {
    const C = useColors();
    const { user } = useAuth();
    const { tasks } = useTasks(user?.uid);
    const { groups } = useTaskGroups(user?.uid);
    const styles = useMemo(() => makeStyles(C), [C]);

    const [userData, setUserData] = useState<UserData | null>(null);
    const [isDatesUsedExpanded, setIsDatesUsedExpanded] = useState(false);

    useEffect(() => {
        if (!user?.uid) return;
        const unsub = onSnapshot(doc(db, "userData", user.uid), (snap: DocumentSnapshot<DocumentData, DocumentData>) => {
            if (snap.exists()) setUserData(snap.data() as UserData);
        });
        return () => unsub();
    }, [user?.uid]);

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
            groupCounts.push({ name: g.name, color: g.color || C.textTertiary, count });
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
    }, [tasks, groups, C]);

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
                        icon={<Ionicons name="checkmark-circle" size={20} color={C.success} />}
                        label="Completed"
                        value={stats.completed}
                        subValue={`${stats.completionRate}% rate`}
                        color={C.success}
                        bgColor="#f0fdf4"
                    />
                    <StatCard
                        icon={<Ionicons name="time" size={20} color={C.accent} />}
                        label="Active"
                        value={stats.active}
                        subValue={`${stats.total} total`}
                        color={C.accent}
                        bgColor={C.accentLight}
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
                        icon={<Ionicons name="alert-circle" size={20} color={C.danger} />}
                        label="Overdue"
                        value={stats.overdue}
                        subValue={`${stats.dueToday} due today`}
                        color={C.danger}
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
                                <View style={[styles.barDot, { backgroundColor: C.textTertiary }]} />
                                <Text style={styles.barLabelText}>No Priority</Text>
                            </View>
                            <View style={styles.barTrack}>
                                <View
                                    style={[
                                        styles.barFill,
                                        {
                                            width: `${Math.round((stats.quadrantCounts.none / (stats.total || 1)) * 100)}%`,
                                            backgroundColor: C.textTertiary,
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

                {/* Dates Used (Daily Usage) */}
                <View style={[styles.sectionCard, { marginBottom: 40 }]}>
                    <TouchableOpacity
                        style={styles.datesUsedHeader}
                        onPress={() => setIsDatesUsedExpanded(!isDatesUsedExpanded)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.datesUsedHeaderLeft}>
                            <Ionicons
                                name={isDatesUsedExpanded ? "folder-open" : "folder"}
                                size={24}
                                color={C.accent}
                            />
                            <Text style={styles.datesUsedTitle}>Dates Used</Text>
                        </View>
                        <Ionicons
                            name={isDatesUsedExpanded ? "chevron-up" : "chevron-down"}
                            size={20}
                            color={C.textTertiary}
                        />
                    </TouchableOpacity>

                    {isDatesUsedExpanded && (
                        <View style={styles.datesUsedContent}>
                            {userData?.dailyUsage && Object.keys(userData.dailyUsage).length > 0 ? (
                                Object.entries(userData.dailyUsage)
                                    .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
                                    .map(([dateStr, metrics], idx, arr) => {
                                        // Format date: "YYYY-MM-DD" -> "MMM D, YYYY"
                                        const [y, m, d] = dateStr.split("-").map(Number);
                                        const formattedDate = new Date(y, m - 1, d).toLocaleDateString(undefined, {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        });

                                        return (
                                            <View key={dateStr} style={[styles.datesUsedRow, idx === arr.length - 1 && styles.datesUsedRowLast]}>
                                                <Text style={styles.datesUsedDate}>{formattedDate}</Text>
                                                <View style={styles.datesUsedDataRow}>
                                                    <View style={styles.datesUsedDataItem}>
                                                        <Ionicons name="add-circle" size={16} color={C.accent} />
                                                        <Text style={styles.datesUsedDataText}>{metrics.created || 0}</Text>
                                                    </View>
                                                    <View style={styles.datesUsedDataItem}>
                                                        <Ionicons name="checkmark-circle" size={16} color={C.success} />
                                                        <Text style={styles.datesUsedDataText}>{metrics.completed || 0}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        );
                                    })
                            ) : (
                                <View style={styles.datesUsedEmpty}>
                                    <Text style={styles.datesUsedEmptyText}>No daily usage data yet.</Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
