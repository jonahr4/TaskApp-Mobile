import { useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useTheme";
import { Colors, Spacing, Radius, FontSize } from "@/lib/theme";

type Props = {
    visible: boolean;
    busyAction: "keep" | "all" | null;
    onKeep: () => void;
    onDeleteAll: () => void;
    onCancel: () => void;
};

function makeStyles(C: typeof Colors.light) {
    return StyleSheet.create({
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
            maxWidth: 320,
        },
        warning: {
            backgroundColor: C.bgCard,
            borderRadius: Radius.lg,
            borderWidth: 1,
            borderColor: C.borderLight,
            padding: Spacing.lg,
            flexDirection: "row",
            alignItems: "center",
            gap: Spacing.md,
            marginBottom: Spacing.xxl,
        },
        warningText: {
            flex: 1,
            fontSize: FontSize.sm,
            color: C.textSecondary,
            lineHeight: 20,
        },
        actions: {
            gap: Spacing.md,
        },
        keepBtn: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: Spacing.sm,
            backgroundColor: C.accent,
            paddingVertical: 16,
            borderRadius: Radius.md,
        },
        keepText: {
            color: "#fff",
            fontSize: FontSize.md,
            fontWeight: "600",
        },
        deleteBtn: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: Spacing.sm,
            backgroundColor: C.bgCard,
            borderWidth: 1,
            borderColor: C.borderLight,
            paddingVertical: 16,
            borderRadius: Radius.md,
        },
        deleteText: {
            fontSize: FontSize.md,
            fontWeight: "600",
            color: C.danger,
        },
        cancelBtn: {
            alignItems: "center",
            paddingVertical: 14,
        },
        cancelText: {
            fontSize: FontSize.md,
            color: C.textTertiary,
        },
        disabled: {
            opacity: 0.6,
        },
    });
}

export default function DeleteAccountPrompt({
    visible,
    busyAction,
    onKeep,
    onDeleteAll,
    onCancel,
}: Props) {
    const C = useColors();
    const styles = useMemo(() => makeStyles(C), [C]);
    const busy = busyAction !== null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={busy ? undefined : onCancel}
        >
            <View style={styles.container}>
                <View style={styles.header}>
                    <View style={styles.headerIcon}>
                        <Ionicons name="trash-outline" size={40} color={C.danger} />
                    </View>
                    <Text style={styles.title}>Delete Account</Text>
                    <Text style={styles.subtitle}>
                        This permanently deletes your account and the tasks stored in the cloud. You can keep a copy on this device.
                    </Text>
                </View>

                <View style={styles.warning}>
                    <Ionicons name="warning-outline" size={22} color={C.danger} />
                    <Text style={styles.warningText}>
                        The cloud copy is gone for good. A device copy stays only on this phone and is not tied to the account.
                    </Text>
                </View>

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.keepBtn, busy && styles.disabled]}
                        onPress={onKeep}
                        disabled={busy}
                        activeOpacity={0.85}
                    >
                        {busyAction === "keep" ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Ionicons name="phone-portrait-outline" size={18} color="#fff" />
                        )}
                        <Text style={styles.keepText}>
                            {busyAction === "keep" ? "Deleting account…" : "Keep Tasks on Device"}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.deleteBtn, busy && styles.disabled]}
                        onPress={onDeleteAll}
                        disabled={busy}
                        activeOpacity={0.7}
                    >
                        {busyAction === "all" ? (
                            <ActivityIndicator color={C.danger} />
                        ) : (
                            <Ionicons name="trash-outline" size={18} color={C.danger} />
                        )}
                        <Text style={styles.deleteText}>
                            {busyAction === "all" ? "Deleting account…" : "Delete Everything"}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={onCancel}
                        disabled={busy}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}
