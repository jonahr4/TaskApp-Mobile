import { Dimensions } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const Colors = {
    light: {
        bg: "#f4f5f9",
        bgCard: "#ffffff",
        bgElevated: "#fafbff",
        textPrimary: "#1a1d23",
        textSecondary: "#5f6775",
        textTertiary: "#959dab",
        accent: "#4f46e5",
        accentSoft: "#6366f1",
        accentLight: "rgba(79, 70, 229, 0.08)",
        borderLight: "#e8eaf0",
        border: "#d0d4dc",
        shadow: "rgba(0,0,0,0.05)",
        shadowMd: "rgba(0,0,0,0.08)",
        danger: "#ef4444",
        success: "#34d399",
        successBg: "#ecfdf5",
    },
    dark: {
        bg: "#0f0f0f",
        bgCard: "#1a1a1a",
        bgElevated: "#222222",
        textPrimary: "#f0f0f0",
        textSecondary: "#9ca3af",
        textTertiary: "#6b7280",
        accent: "#6366f1",
        accentSoft: "#818cf8",
        accentLight: "rgba(99, 102, 241, 0.15)",
        borderLight: "#2a2a2a",
        border: "#3a3a3a",
        shadow: "rgba(0,0,0,0.3)",
        shadowMd: "rgba(0,0,0,0.4)",
        danger: "#f87171",
        success: "#4ade80",
        successBg: "#052e16",
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
    sm: 8,
    md: 12,
    lg: 16,
    xl: 22,
    xxl: 28,
    full: 9999,
};

export const FontSize = {
    xs: 12,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 26,
    title: 30,
};

export const Shadows = {
    sm: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    md: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    lg: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 6,
    },
    xl: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        elevation: 10,
    },
};

export const SCREEN = {
    width: SCREEN_WIDTH,
};
