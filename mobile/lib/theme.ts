import { Dimensions } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const Colors = {
    light: {
        bg: "#f2f3f7",
        bgCard: "#ffffff",
        textPrimary: "#1a1d21",
        textSecondary: "#6b7280",
        textTertiary: "#9ca3af",
        accent: "#4f46e5",
        accentLight: "rgba(79, 70, 229, 0.1)",
        borderLight: "#eef0f2",
        border: "#d1d5db",
        shadow: "rgba(0,0,0,0.06)",
        danger: "#ef4444",
        success: "#22c55e",
    },
    dark: {
        bg: "#0f0f0f",
        bgCard: "#1a1a1a",
        textPrimary: "#f0f0f0",
        textSecondary: "#9ca3af",
        textTertiary: "#6b7280",
        accent: "#6366f1",
        accentLight: "rgba(99, 102, 241, 0.15)",
        borderLight: "#2a2a2a",
        border: "#3a3a3a",
        shadow: "rgba(0,0,0,0.3)",
        danger: "#f87171",
        success: "#4ade80",
    },
};

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
};

export const Radius = {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
    full: 9999,
};

export const FontSize = {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    title: 28,
};

export const SCREEN = {
    width: SCREEN_WIDTH,
};
