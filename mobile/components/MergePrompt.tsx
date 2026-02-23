import { useState, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useTheme";
import { Colors, Spacing, Radius, FontSize } from "@/lib/theme";
import { getQuadrant, QUADRANT_META } from "@/lib/types";
import type { Task } from "@/lib/types";

type Props = {
    visible: boolean;
    localTasks: Task[];
    merging: boolean;
    onConfirm: (selectedIds?: string[]) => void;
    onDiscard: () => void;
};

function makeStyles(C: typeof Colors.light) { return StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: C.bg,
        padding: Spacing.xxl,
        justifyContent: "center",
    },
    header: {
        alignItems: "center",
        marginBottom: Spacing.xxl,
    },
    headerIcon: {
        marginBottom: Spacing.md,
    },
    title: {
        fontSize: FontSize.xxl,
        fontWeight: "700",
        color: C.textPrimary,
        textAlign: "center",
    },
    subtitle: {
        fontSize: FontSize.md,
        color: C.textSecondary,
        textAlign: "center",
        marginTop: Spacing.sm,
        lineHeight: 22,
        maxWidth: 300,
    },
    previewCard: {
        backgroundColor: C.bgCard,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: C.borderLight,
        overflow: "hidden",
        marginBottom: Spacing.xxl,
    },
    expandToggle: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: Spacing.lg,
    },
    expandLabel: {
        fontSize: FontSize.md,
        fontWeight: "600",
        color: C.textPrimary,
    },
    taskList: {
        maxHeight: 250,
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.lg,
    },
    taskRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        paddingVertical: 8,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: C.borderLight,
    },
    taskDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    taskInfo: {
        flex: 1,
    },
    taskTitle: {
        fontSize: FontSize.sm,
        fontWeight: "500",
        color: C.textPrimary,
    },
    taskMeta: {
        flexDirection: "row",
        gap: Spacing.sm,
        marginTop: 1,
    },
    metaText: {
        fontSize: FontSize.xs,
        color: C.textTertiary,
    },
    actions: {
        gap: Spacing.md,
    },
    confirmBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: Spacing.sm,
        backgroundColor: C.accent,
        paddingVertical: 16,
        borderRadius: Radius.md,
    },
    btnDisabled: {
        opacity: 0.6,
    },
    confirmText: {
        color: "#fff",
        fontSize: FontSize.md,
        fontWeight: "600",
    },
    discardBtn: {
        alignItems: "center",
        paddingVertical: 14,
    },
    discardText: {
        fontSize: FontSize.md,
        color: C.textTertiary,
    },
});
}

export default function MergePrompt({
    visible,
    localTasks,
    merging,
    onConfirm,
    onDiscard,
}: Props) {
    const C = useColors();
    const [expanded, setExpanded] = useState(false);

    const styles = useMemo(() => makeStyles(C), [C]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => { }}
        >
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerIcon}>
                        <Ionicons name="sync-circle" size={40} color={C.accent} />
                    </View>
                    <Text style={styles.title}>Local Tasks Found</Text>
                    <Text style={styles.subtitle}>
                        You have {localTasks.length} task{localTasks.length !== 1 ? "s" : ""}{" "}
                        saved on this device. Would you like to add them to your account?
                    </Text>
                </View>

                {/* Tasks Preview */}
                <View style={styles.previewCard}>
                    <TouchableOpacity
                        style={styles.expandToggle}
                        onPress={() => setExpanded(!expanded)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.expandLabel}>
                            {localTasks.length} task{localTasks.length !== 1 ? "s" : ""} on device
                        </Text>
                        <Ionicons
                            name={expanded ? "chevron-up" : "chevron-down"}
                            size={18}
                            color={C.textSecondary}
                        />
                    </TouchableOpacity>

                    {expanded && (
                        <ScrollView style={styles.taskList} nestedScrollEnabled>
                            {localTasks.map((task) => {
                                const q = getQuadrant(task);
                                const meta = q ? QUADRANT_META[q] : null;
                                return (
                                    <View key={task.id} style={styles.taskRow}>
                                        <View
                                            style={[
                                                styles.taskDot,
                                                { backgroundColor: meta?.color || C.textTertiary },
                                            ]}
                                        />
                                        <View style={styles.taskInfo}>
                                            <Text style={styles.taskTitle} numberOfLines={1}>
                                                {task.title}
                                            </Text>
                                            <View style={styles.taskMeta}>
                                                {task.dueDate && (
                                                    <Text style={styles.metaText}>{task.dueDate}</Text>
                                                )}
                                                {meta && (
                                                    <Text style={[styles.metaText, { color: meta.color }]}>
                                                        {meta.sublabel}
                                                    </Text>
                                                )}
                                                {task.completed && (
                                                    <Text style={[styles.metaText, { color: C.success }]}>
                                                        ✓ Done
                                                    </Text>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}
                        </ScrollView>
                    )}
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.confirmBtn, merging && styles.btnDisabled]}
                        onPress={() => onConfirm()}
                        disabled={merging}
                        activeOpacity={0.85}
                    >
                        {merging ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <>
                                <Ionicons name="cloud-upload" size={18} color="#fff" />
                                <Text style={styles.confirmText}>Add to Account</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.discardBtn}
                        onPress={onDiscard}
                        disabled={merging}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.discardText}>Discard Local Tasks</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}
