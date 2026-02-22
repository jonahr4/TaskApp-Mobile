import { StyleSheet } from "react-native";
import { Colors, Spacing, Radius, FontSize } from "./theme";

/**
 * Shared filter bar styles used across Tasks, Matrix, and Calendar screens.
 * Import and spread into your local StyleSheet to keep all filter bars consistent.
 */
export const FilterStyles = StyleSheet.create({
    filterBar: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: Spacing.lg,
        paddingTop: 8,
        paddingBottom: 8,
        zIndex: 20,
        backgroundColor: Colors.light.bgElevated,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.light.borderLight,
    },
    filterChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: Radius.full,
        backgroundColor: Colors.light.bgCard,
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
    },
    filterChipActive: {
        backgroundColor: Colors.light.accentLight,
        borderColor: Colors.light.accent,
    },
    filterChipText: {
        fontSize: FontSize.xs,
        fontWeight: "500" as const,
        color: Colors.light.textSecondary,
    },
    filterChipTextActive: {
        color: Colors.light.accent,
    },
});
