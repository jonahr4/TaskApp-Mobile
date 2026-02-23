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
        bg: "#1c1c1e",
        bgCard: "#2c2c2e",
        bgElevated: "#3a3a3c",
        textPrimary: "#f2f2f7",
        textSecondary: "#aeaeb2",
        textTertiary: "#636366",
        accent: "#7c7ff5",
        accentSoft: "#9496f8",
        accentLight: "rgba(124, 127, 245, 0.18)",
        borderLight: "#38383a",
        border: "#48484a",
        shadow: "rgba(0,0,0,0.35)",
        shadowMd: "rgba(0,0,0,0.5)",
        danger: "#ff453a",
        success: "#30d158",
        successBg: "#0a2e1a",
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
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
    },
    md: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 5,
    },
    lg: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.16,
        shadowRadius: 20,
        elevation: 8,
    },
    xl: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 30,
        elevation: 12,
    },
};

export const SCREEN = {
    width: SCREEN_WIDTH,
};
