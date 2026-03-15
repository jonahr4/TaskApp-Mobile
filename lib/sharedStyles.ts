import { StyleSheet } from "react-native";
import { Colors, Radius, Spacing } from "./theme";

export const makeFilterStyles = (C: typeof Colors.light) =>
    StyleSheet.create({
        filterBar: {
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: Spacing.md,
            paddingTop: 8,
            paddingBottom: 8,
            zIndex: 20,
            backgroundColor: C.bgElevated,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: C.borderLight,
        },
        filterChip: {
            flexDirection: "row",
            alignItems: "center",
            gap: 3,
            paddingHorizontal: 8,
            paddingVertical: 5,
            borderRadius: Radius.full,
            backgroundColor: C.bgCard,
            borderWidth: 1,
            borderColor: C.borderLight,
        },
        filterChipActive: {
            backgroundColor: C.accentLight,
            borderColor: C.accent,
        },
        filterChipText: {
            fontSize: 11,
            fontWeight: "500" as const,
            color: C.textSecondary,
        },
        filterChipTextActive: {
            color: C.accent,
        },
    });

// Legacy static export kept for any file not yet migrated
export const FilterStyles = makeFilterStyles(Colors.light);
