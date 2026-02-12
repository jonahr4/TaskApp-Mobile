import { useState, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Pressable,
    ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, Radius, FontSize } from "@/lib/theme";
import type { TaskGroup } from "@/lib/types";

type Props = {
    groups: TaskGroup[];
    selectedIds: Set<string>;
    onToggle: (groupId: string) => void;
    onSelectAll: () => void;
};

/**
 * Multi-select group filter dropdown chip.
 * Shows "All Tasks ▼" when everything selected, "3/7 Groups ▼" otherwise.
 */
export function GroupFilterDropdown({ groups, selectedIds, onToggle, onSelectAll }: Props) {
    const [open, setOpen] = useState(false);

    // Include "General Tasks" (empty-id bucket) + user groups
    const allEntries = useMemo(() => {
        const entries: { id: string; name: string; color: string }[] = [
            { id: "", name: "General Tasks", color: "#94a3b8" },
            ...groups.map((g) => ({ id: g.id, name: g.name, color: g.color || "#6366f1" })),
        ];
        return entries;
    }, [groups]);

    const totalCount = allEntries.length;
    const selectedCount = selectedIds.size;
    const allSelected = selectedCount === totalCount;

    const label = allSelected
        ? "All Tasks"
        : `${selectedCount}/${totalCount} Groups`;

    const isFiltered = !allSelected;

    return (
        <>
            <View style={{ zIndex: 29 }}>
                <TouchableOpacity
                    style={[styles.chip, isFiltered && styles.chipActive]}
                    onPress={() => setOpen(!open)}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name="layers-outline"
                        size={12}
                        color={isFiltered ? Colors.light.accent : Colors.light.textSecondary}
                    />
                    <Text style={[styles.chipText, isFiltered && styles.chipTextActive]}>
                        {label}
                    </Text>
                    <Ionicons name="chevron-down" size={10} color={Colors.light.textTertiary} />
                </TouchableOpacity>

                {open && (
                    <View style={styles.dropdown}>
                        {/* Select / Deselect All */}
                        <TouchableOpacity
                            style={[styles.option, styles.allOption]}
                            onPress={() => {
                                onSelectAll();
                            }}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={allSelected ? "checkbox" : "square-outline"}
                                size={16}
                                color={allSelected ? Colors.light.accent : Colors.light.textTertiary}
                            />
                            <Text
                                style={[
                                    styles.optionText,
                                    allSelected && styles.optionTextActive,
                                    { fontWeight: "600" },
                                ]}
                            >
                                All Tasks
                            </Text>
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <ScrollView style={styles.listScroll} bounces={false}>
                            {allEntries.map((entry) => {
                                const checked = selectedIds.has(entry.id);
                                return (
                                    <TouchableOpacity
                                        key={entry.id || "__general"}
                                        style={[styles.option, checked && styles.optionActive]}
                                        onPress={() => onToggle(entry.id)}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons
                                            name={checked ? "checkbox" : "square-outline"}
                                            size={16}
                                            color={checked ? Colors.light.accent : Colors.light.textTertiary}
                                        />
                                        <View
                                            style={[styles.colorDot, { backgroundColor: entry.color }]}
                                        />
                                        <Text
                                            style={[
                                                styles.optionText,
                                                checked && styles.optionTextActive,
                                            ]}
                                            numberOfLines={1}
                                        >
                                            {entry.name}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}
            </View>

            {/* Backdrop to dismiss */}
            {open && (
                <Pressable
                    style={StyleSheet.absoluteFillObject}
                    onPress={() => setOpen(false)}
                />
            )}
        </>
    );
}

const styles = StyleSheet.create({
    chip: {
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
    chipActive: {
        backgroundColor: Colors.light.accentLight,
        borderColor: Colors.light.accent,
    },
    chipText: {
        fontSize: FontSize.xs,
        fontWeight: "600",
        color: Colors.light.textSecondary,
    },
    chipTextActive: {
        color: Colors.light.accent,
    },
    dropdown: {
        position: "absolute",
        top: "100%",
        right: 0,
        marginTop: 4,
        minWidth: 190,
        backgroundColor: Colors.light.bgCard,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
        overflow: "hidden",
    },
    listScroll: {
        maxHeight: 240,
    },
    allOption: {
        borderBottomWidth: 0,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.light.borderLight,
    },
    option: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    optionActive: {
        backgroundColor: Colors.light.accentLight + "30",
    },
    optionText: {
        flex: 1,
        fontSize: FontSize.sm,
        color: Colors.light.textSecondary,
    },
    optionTextActive: {
        color: Colors.light.textPrimary,
        fontWeight: "500",
    },
    colorDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
});
