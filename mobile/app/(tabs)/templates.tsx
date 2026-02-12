import { useState, useMemo, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/hooks/useAuth";
import { useTasks } from "@/hooks/useTasks";
import { useTaskGroups } from "@/hooks/useTaskGroups";
import { createTaskUnified } from "@/lib/crud";
import { Colors, Spacing, Radius, FontSize } from "@/lib/theme";

// ── Template data ────────────────────────────────────────────

type Template = {
    title: string;
    notes?: string;
    urgent: boolean;
    important: boolean;
};

type TemplateCategory = {
    name: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    templates: Template[];
};

const TEMPLATE_CATEGORIES: TemplateCategory[] = [
    {
        name: "Morning Routine",
        icon: "sunny-outline",
        color: "#f59e0b",
        templates: [
            { title: "Make bed", urgent: false, important: false },
            { title: "Drink water", urgent: false, important: true },
            { title: "Exercise / stretch", urgent: false, important: true },
            { title: "Shower & get ready", urgent: false, important: false },
            { title: "Eat breakfast", urgent: false, important: true },
            { title: "Plan the day", urgent: false, important: true },
        ],
    },
    {
        name: "Work & Productivity",
        icon: "briefcase-outline",
        color: "#3b82f6",
        templates: [
            { title: "Check emails", urgent: true, important: false },
            { title: "Review calendar", urgent: true, important: true },
            { title: "Deep work block", notes: "90-minute focused work session", urgent: false, important: true },
            { title: "Team standup", urgent: true, important: false },
            { title: "Update project tracker", urgent: false, important: false },
            { title: "Clear Slack messages", urgent: true, important: false },
            { title: "Weekly planning session", urgent: false, important: true },
        ],
    },
    {
        name: "Fitness",
        icon: "barbell-outline",
        color: "#ef4444",
        templates: [
            { title: "Upper body workout", urgent: false, important: true },
            { title: "Lower body workout", urgent: false, important: true },
            { title: "Cardio session", notes: "30 min run or cycling", urgent: false, important: true },
            { title: "Yoga / mobility", urgent: false, important: true },
            { title: "Track meals", urgent: false, important: false },
            { title: "Drink 8 glasses of water", urgent: false, important: true },
        ],
    },
    {
        name: "Home & Errands",
        icon: "home-outline",
        color: "#10b981",
        templates: [
            { title: "Grocery shopping", urgent: true, important: false },
            { title: "Do laundry", urgent: false, important: false },
            { title: "Clean kitchen", urgent: false, important: false },
            { title: "Vacuum / mop floors", urgent: false, important: false },
            { title: "Take out trash", urgent: true, important: false },
            { title: "Pay bills", urgent: true, important: true },
            { title: "Schedule appointment", urgent: false, important: true },
        ],
    },
    {
        name: "Learning",
        icon: "school-outline",
        color: "#8b5cf6",
        templates: [
            { title: "Read for 30 minutes", urgent: false, important: true },
            { title: "Online course lesson", urgent: false, important: true },
            { title: "Practice new skill", urgent: false, important: true },
            { title: "Review notes", urgent: false, important: false },
            { title: "Write journal entry", urgent: false, important: true },
            { title: "Listen to podcast", urgent: false, important: false },
        ],
    },
    {
        name: "Social & Relationships",
        icon: "people-outline",
        color: "#ec4899",
        templates: [
            { title: "Text a friend", urgent: false, important: true },
            { title: "Plan a hangout", urgent: false, important: true },
            { title: "Call family", urgent: false, important: true },
            { title: "Send thank you note", urgent: false, important: false },
            { title: "Date night planning", urgent: false, important: true },
        ],
    },
    {
        name: "Evening Wind-Down",
        icon: "moon-outline",
        color: "#6366f1",
        templates: [
            { title: "Review today's tasks", urgent: false, important: true },
            { title: "Prepare tomorrow's outfit", urgent: false, important: false },
            { title: "Screen-free time", urgent: false, important: true },
            { title: "Skincare routine", urgent: false, important: false },
            { title: "Read before bed", urgent: false, important: true },
            { title: "Set alarm", urgent: false, important: false },
        ],
    },
];

// ── Component ────────────────────────────────────────────────

export default function TemplatesScreen() {
    const { user } = useAuth();
    const { reloadLocal } = useTasks(user?.uid);
    const { groups } = useTaskGroups(user?.uid);
    const [search, setSearch] = useState("");

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return TEMPLATE_CATEGORIES;
        return TEMPLATE_CATEGORIES.map((cat) => ({
            ...cat,
            templates: cat.templates.filter(
                (t) =>
                    t.title.toLowerCase().includes(q) ||
                    cat.name.toLowerCase().includes(q) ||
                    (t.notes && t.notes.toLowerCase().includes(q))
            ),
        })).filter((cat) => cat.templates.length > 0);
    }, [search]);

    const addTemplate = useCallback(
        async (template: Template) => {
            await createTaskUnified(user?.uid, {
                title: template.title,
                notes: template.notes || "",
                urgent: template.urgent,
                important: template.important,
                completed: false,
                dueDate: null,
                dueTime: null,
                groupId: groups[0]?.id ?? null,
                order: 0,
                autoUrgentDays: null,
                location: null,
            });
            if (!user) reloadLocal();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
        [user, groups, reloadLocal]
    );

    const addAllInCategory = useCallback(
        async (cat: TemplateCategory) => {
            Alert.alert(
                `Add ${cat.templates.length} tasks?`,
                `This will add all tasks from "${cat.name}" to your list.`,
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Add All",
                        onPress: async () => {
                            for (const t of cat.templates) {
                                await createTaskUnified(user?.uid, {
                                    title: t.title,
                                    notes: t.notes || "",
                                    urgent: t.urgent,
                                    important: t.important,
                                    completed: false,
                                    dueDate: null,
                                    dueTime: null,
                                    groupId: groups[0]?.id ?? null,
                                    order: 0,
                                    autoUrgentDays: null,
                                    location: null,
                                });
                            }
                            if (!user) reloadLocal();
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        },
                    },
                ]
            );
        },
        [user, groups, reloadLocal]
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Templates</Text>
                <Text style={styles.headerSub}>Quick-add tasks from curated templates</Text>
            </View>

            {/* Search */}
            <View style={styles.searchWrap}>
                <Ionicons name="search" size={18} color={Colors.light.textTertiary} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search templates..."
                    placeholderTextColor={Colors.light.textTertiary}
                    value={search}
                    onChangeText={setSearch}
                    autoCapitalize="none"
                    autoCorrect={false}
                    clearButtonMode="while-editing"
                />
            </View>

            {/* Templates */}
            <ScrollView
                style={styles.body}
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                keyboardDismissMode="on-drag"
            >
                {filtered.length === 0 && (
                    <View style={styles.emptyState}>
                        <Ionicons name="search-outline" size={40} color={Colors.light.borderLight} />
                        <Text style={styles.emptyText}>No templates match "{search}"</Text>
                    </View>
                )}

                {filtered.map((cat) => (
                    <View key={cat.name} style={styles.categoryCard}>
                        {/* Category Header */}
                        <View style={styles.categoryHeader}>
                            <View style={[styles.categoryIcon, { backgroundColor: `${cat.color}15` }]}>
                                <Ionicons name={cat.icon} size={20} color={cat.color} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.categoryName}>{cat.name}</Text>
                                <Text style={styles.categoryCount}>{cat.templates.length} tasks</Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.addAllBtn, { borderColor: cat.color }]}
                                onPress={() => addAllInCategory(cat)}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="add-circle-outline" size={16} color={cat.color} />
                                <Text style={[styles.addAllText, { color: cat.color }]}>Add All</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Template Items */}
                        {cat.templates.map((t, idx) => (
                            <TouchableOpacity
                                key={t.title}
                                style={[
                                    styles.templateRow,
                                    idx === cat.templates.length - 1 && { borderBottomWidth: 0 },
                                ]}
                                onPress={() => addTemplate(t)}
                                activeOpacity={0.65}
                            >
                                <View style={styles.templateContent}>
                                    <Text style={styles.templateTitle}>{t.title}</Text>
                                    {t.notes && (
                                        <Text style={styles.templateNotes} numberOfLines={1}>{t.notes}</Text>
                                    )}
                                </View>
                                <Ionicons name="add" size={20} color={Colors.light.accent} />
                            </TouchableOpacity>
                        ))}
                    </View>
                ))}
            </ScrollView>
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
        paddingHorizontal: Spacing.xl,
        paddingTop: Platform.OS === "ios" ? 60 : 48,
        paddingBottom: Spacing.sm,
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
    headerSub: {
        fontSize: FontSize.sm,
        color: Colors.light.textTertiary,
        marginTop: 2,
    },
    searchWrap: {
        flexDirection: "row",
        alignItems: "center",
        margin: Spacing.lg,
        backgroundColor: Colors.light.bgCard,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
        paddingHorizontal: Spacing.md,
    },
    searchIcon: {
        marginRight: Spacing.xs,
    },
    searchInput: {
        flex: 1,
        height: 44,
        fontSize: FontSize.md,
        color: Colors.light.textPrimary,
    },
    body: {
        flex: 1,
        paddingHorizontal: Spacing.lg,
    },
    emptyState: {
        alignItems: "center",
        paddingTop: 60,
        gap: Spacing.sm,
    },
    emptyText: {
        fontSize: FontSize.md,
        color: Colors.light.textTertiary,
    },
    categoryCard: {
        backgroundColor: Colors.light.bgCard,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
        marginBottom: Spacing.lg,
        overflow: "hidden",
    },
    categoryHeader: {
        flexDirection: "row",
        alignItems: "center",
        padding: Spacing.md,
        gap: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.borderLight,
    },
    categoryIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
    },
    categoryName: {
        fontSize: FontSize.md,
        fontWeight: "600",
        color: Colors.light.textPrimary,
    },
    categoryCount: {
        fontSize: FontSize.xs,
        color: Colors.light.textTertiary,
    },
    addAllBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: Radius.full,
        borderWidth: 1,
    },
    addAllText: {
        fontSize: FontSize.xs,
        fontWeight: "600",
    },
    templateRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm + 2,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.light.borderLight,
    },
    templateContent: {
        flex: 1,
    },
    templateTitle: {
        fontSize: FontSize.md,
        color: Colors.light.textPrimary,
    },
    templateNotes: {
        fontSize: FontSize.xs,
        color: Colors.light.textTertiary,
        marginTop: 1,
    },
});
