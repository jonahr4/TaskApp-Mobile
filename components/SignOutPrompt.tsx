import { useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useTheme";
import { Colors, Spacing, Radius, FontSize } from "@/lib/theme";

type Props = {
    visible: boolean;
    onKeep: () => void;
    onClear: () => void;
    onCancel: () => void;
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
    reassurance: {
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
    reassuranceText: {
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
    clearBtn: {
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
    clearText: {
        fontSize: FontSize.md,
        fontWeight: "600",
        color: C.textPrimary,
    },
    cancelBtn: {
        alignItems: "center",
        paddingVertical: 14,
    },
    cancelText: {
        fontSize: FontSize.md,
        color: C.textTertiary,
    },
});
}

export default function SignOutPrompt({
    visible,
    onKeep,
    onClear,
    onCancel,
}: Props) {
    const C = useColors();
    const styles = useMemo(() => makeStyles(C), [C]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onCancel}
        >
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerIcon}>
                        <Ionicons name="log-out-outline" size={40} color={C.accent} />
                    </View>
                    <Text style={styles.title}>Sign Out</Text>
                    <Text style={styles.subtitle}>
                        Would you like to keep your tasks on this device for offline access, or start with a clean slate?
                    </Text>
                </View>

                {/* Reassurance */}
                <View style={styles.reassurance}>
                    <Ionicons name="cloud-done" size={22} color={C.success} />
                    <Text style={styles.reassuranceText}>
                        Your tasks are safe in your account and will be right here when you sign back in.
                    </Text>
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.keepBtn}
                        onPress={onKeep}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="phone-portrait-outline" size={18} color="#fff" />
                        <Text style={styles.keepText}>Keep Tasks on Device</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.clearBtn}
                        onPress={onClear}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="refresh-outline" size={18} color={C.textPrimary} />
                        <Text style={styles.clearText}>Clear & Sign Out</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={onCancel}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}
