import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import DraggableFlatList, { RenderItemParams } from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColors } from "@/hooks/useTheme";
import { reorderGroupsUnified } from "@/lib/crud";
import { saveGeneralListOrder } from "@/lib/listOrder";
import { Colors, FontSize, Radius, Spacing } from "@/lib/theme";
import type { TaskGroup } from "@/lib/types";

const GENERAL_KEY = "general";
const GENERAL_COLOR = "#94a3b8";

type Row =
    | { key: typeof GENERAL_KEY; kind: "general" }
    | { key: string; kind: "group"; group: TaskGroup };

type Props = {
    visible: boolean;
    groups: TaskGroup[];
    generalIndex: number;
    uid: string | undefined;
    onClose: () => void;
    onApplied: (generalIndex: number, orderedGroupIds: string[]) => void;
    onPersisted?: () => void;
};

function sortedGroups(groups: TaskGroup[]): TaskGroup[] {
    return [...groups].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function buildReorderRows(groups: TaskGroup[], generalIndex: number): Row[] {
    const rows: Row[] = sortedGroups(groups).map((group) => ({
        key: group.id,
        kind: "group",
        group,
    }));
    const index = Math.min(Math.max(generalIndex, 0), rows.length);
    rows.splice(index, 0, { key: GENERAL_KEY, kind: "general" });
    return rows;
}

function makeStyles(C: typeof Colors.light) {
    return StyleSheet.create({
        root: {
            flex: 1,
            backgroundColor: C.bg,
        },
        header: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: Spacing.lg,
            paddingTop: Spacing.lg,
            paddingBottom: Spacing.md,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: C.borderLight,
        },
        title: {
            fontSize: FontSize.lg,
            fontWeight: "700",
            color: C.textPrimary,
        },
        hint: {
            paddingHorizontal: Spacing.lg,
            paddingTop: Spacing.md,
            paddingBottom: Spacing.xs,
            fontSize: FontSize.sm,
            color: C.textTertiary,
        },
        list: {
            flex: 1,
        },
        listContent: {
            paddingHorizontal: Spacing.lg,
            paddingTop: Spacing.sm,
            paddingBottom: Spacing.xxl,
        },
        cell: {
            paddingBottom: 8,
        },
        row: {
            flexDirection: "row",
            alignItems: "center",
            height: 44,
            paddingRight: Spacing.md,
            backgroundColor: C.bgCard,
            borderRadius: Radius.md,
            borderWidth: 1,
            borderColor: C.borderLight,
        },
        rowActive: {
            backgroundColor: C.accentLight,
            borderColor: C.accent,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.16,
            shadowRadius: 10,
            elevation: 6,
        },
        handle: {
            width: 40,
            height: 44,
            alignItems: "center",
            justifyContent: "center",
        },
        dot: {
            width: 10,
            height: 10,
            borderRadius: 5,
            marginRight: Spacing.sm,
        },
        name: {
            flex: 1,
            fontSize: FontSize.md,
            fontWeight: "600",
            color: C.textPrimary,
            lineHeight: 20,
        },
    });
}

export default function ReorderGroupsSheet({
    visible,
    groups,
    generalIndex,
    uid,
    onClose,
    onApplied,
    onPersisted,
}: Props) {
    const C = useColors();
    const styles = useMemo(() => makeStyles(C), [C]);
    const [rows, setRows] = useState<Row[]>(() => buildReorderRows(groups, generalIndex));
    const pendingRef = useRef<{ generalIndex: number; orderedIds: string[] } | null>(null);

    useEffect(() => {
        if (!visible) return;
        pendingRef.current = null;
        setRows(buildReorderRows(groups, generalIndex));
        // Seed once per open. A save must not rebuild the list while it is showing.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    const close = () => {
        const pending = pendingRef.current;
        pendingRef.current = null;
        if (pending) {
            onApplied(pending.generalIndex, pending.orderedIds);
            onPersisted?.();
        }
        onClose();
    };

    const renderItem = ({ item, drag, isActive }: RenderItemParams<Row>) => {
        const name = item.kind === "general" ? "General Tasks" : item.group.name;
        const color = item.kind === "general" ? GENERAL_COLOR : item.group.color || C.textTertiary;
        return (
            <View style={styles.cell}>
                <View style={[styles.row, isActive && styles.rowActive]}>
                    <TouchableOpacity
                        onLongPress={drag}
                        delayLongPress={120}
                        disabled={isActive}
                        style={styles.handle}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons name="reorder-three" size={22} color={isActive ? C.accent : C.textTertiary} />
                    </TouchableOpacity>
                    <View style={[styles.dot, { backgroundColor: color }]} />
                    <Text style={styles.name} numberOfLines={1}>{name}</Text>
                </View>
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={close}
        >
        <GestureHandlerRootView style={styles.root}>
            <View style={styles.header}>
                <Text style={styles.title}>Reorder Lists</Text>
                <TouchableOpacity onPress={close} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={28} color={C.textTertiary} />
                </TouchableOpacity>
            </View>
            <Text style={styles.hint}>Drag the handle to reorder.</Text>
            <DraggableFlatList
                containerStyle={styles.list}
                contentContainerStyle={styles.listContent}
                data={rows}
                keyExtractor={(item) => item.key}
                activationDistance={8}
                onDragBegin={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
                onDragEnd={({ data }) => {
                    const previous = rows;
                    setRows(data);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    const nextGeneral = Math.max(0, data.findIndex((row) => row.kind === "general"));
                    const orderedGroups = data
                        .filter((row): row is Extract<Row, { kind: "group" }> => row.kind === "group")
                        .map((row) => row.group);
                    const orderedIds = orderedGroups.map((group) => group.id);
                    pendingRef.current = { generalIndex: nextGeneral, orderedIds };
                    reorderGroupsUnified(uid, orderedGroups)
                        .then(() => saveGeneralListOrder(uid, nextGeneral))
                        .catch(() => {
                            pendingRef.current = null;
                            setRows(previous);
                        });
                }}
                renderItem={renderItem}
            />
        </GestureHandlerRootView>
        </Modal>
    );
}
