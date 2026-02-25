import { StyleSheet } from "react-native";
import { Colors, Spacing, Radius, FontSize } from "./theme";

export const makeFilterStyles = (C: typeof Colors.light) =>
    StyleSheet.create({
        filterBar: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: Spacing.lg,
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
            gap: 4,
            paddingHorizontal: 10,
            paddingVertical: 6,
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
            fontSize: FontSize.xs,
            fontWeight: "500" as const,
            color: C.textSecondary,
        },
        filterChipTextActive: {
            color: C.accent,
        },
    });

// Legacy static export kept for any file not yet migrated
export const FilterStyles = makeFilterStyles(Colors.light);
