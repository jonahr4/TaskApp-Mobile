import { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Modal,
    ScrollView,
    Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";
import { createGroupUnified, updateGroupUnified, deleteGroupUnified } from "@/lib/crud";
import { Colors, Spacing, Radius, FontSize } from "@/lib/theme";
import type { TaskGroup } from "@/lib/types";

const GROUP_COLORS = [
    "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7",
    "#ec4899", "#ef4444", "#f97316", "#f59e0b",
    "#eab308", "#22c55e", "#14b8a6", "#06b6d4",
    "#0ea5e9", "#64748b",
];

type Props = {
    visible: boolean;
    onClose: () => void;
    group?: TaskGroup | null;
    groupCount: number;
};

export default function GroupModal({ visible, onClose, group, groupCount }: Props) {
    const { user } = useAuth();
    const isEdit = !!group;
    const [name, setName] = useState("");
    const [color, setColor] = useState(GROUP_COLORS[0]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (visible) {
            setName(group?.name || "");
            setColor(group?.color || GROUP_COLORS[0]);
        }
    }, [group, visible]);

    const handleSave = async () => {
        if (!name.trim()) return;
        setSaving(true);
        try {
            if (isEdit && group) {
                await updateGroupUnified(user?.uid, group.id, {
                    name: name.trim(),
                    color,
                });
            } else {
                await createGroupUnified(user?.uid, {
                    name: name.trim(),
                    color,
                    order: groupCount,
                } as any);
            }
            onClose();
        } catch {
            Alert.alert("Error", "Failed to save list.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        if (!group) return;
        Alert.alert(
            "Delete List",
            `Delete "${group.name}" and all its tasks?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        await deleteGroupUnified(user?.uid, group.id);
                        onClose();
                    },
                },
            ]
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>
                        {isEdit ? "Edit List" : "New List"}
                    </Text>
                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={saving || !name.trim()}
                    >
                        <Text
                            style={[
                                styles.saveText,
                                (!name.trim() || saving) && styles.saveTextDisabled,
                            ]}
                        >
                            {saving ? "Saving..." : "Save"}
                        </Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={styles.body}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Name */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>List Name</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="e.g. Work, Personal, CS 505"
                            placeholderTextColor={Colors.light.textTertiary}
                            autoFocus
                        />
                    </View>

                    {/* Color */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>Color</Text>
                        <View style={styles.colorGrid}>
                            {GROUP_COLORS.map((c) => (
                                <TouchableOpacity
                                    key={c}
                                    style={[
                                        styles.colorSwatch,
                                        { backgroundColor: c },
                                        color === c && styles.colorSwatchSelected,
                                    ]}
                                    onPress={() => setColor(c)}
                                    activeOpacity={0.8}
                                >
                                    {color === c && (
                                        <Ionicons name="checkmark" size={16} color="#fff" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Preview */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>Preview</Text>
                        <View style={styles.previewCard}>
                            <View style={[styles.previewDot, { backgroundColor: color }]} />
                            <Text style={styles.previewName}>
                                {name.trim() || "Untitled"}
                            </Text>
                        </View>
                    </View>

                    {/* Delete */}
                    {isEdit && (
                        <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={handleDelete}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="trash-outline" size={18} color={Colors.light.danger} />
                            <Text style={styles.deleteText}>Delete List</Text>
                        </TouchableOpacity>
                    )}
                </ScrollView>
            </View>
        </Modal>
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
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.borderLight,
        backgroundColor: Colors.light.bgCard,
    },
    cancelText: {
        fontSize: FontSize.md,
        color: Colors.light.textSecondary,
    },
    headerTitle: {
        fontSize: FontSize.md,
        fontWeight: "600",
        color: Colors.light.textPrimary,
    },
    saveText: {
        fontSize: FontSize.md,
        fontWeight: "600",
        color: Colors.light.accent,
    },
    saveTextDisabled: {
        opacity: 0.4,
    },
    body: {
        flex: 1,
        padding: Spacing.lg,
    },
    section: {
        marginBottom: Spacing.xxl,
    },
    sectionLabel: {
        fontSize: FontSize.xs,
        fontWeight: "600",
        color: Colors.light.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: Spacing.sm,
    },
    input: {
        backgroundColor: Colors.light.bgCard,
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: 14,
        fontSize: FontSize.md,
        color: Colors.light.textPrimary,
    },
    colorGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: Spacing.md,
    },
    colorSwatch: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
    },
    colorSwatchSelected: {
        borderWidth: 3,
        borderColor: "rgba(255,255,255,0.5)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    previewCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        backgroundColor: Colors.light.bgCard,
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },
    previewDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    previewName: {
        fontSize: FontSize.md,
        fontWeight: "600",
        color: Colors.light.textPrimary,
    },
    deleteBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: Spacing.sm,
        paddingVertical: Spacing.md,
        marginTop: Spacing.lg,
    },
    deleteText: {
        fontSize: FontSize.md,
        color: Colors.light.danger,
        fontWeight: "500",
    },
});
