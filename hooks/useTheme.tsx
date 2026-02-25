import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/lib/theme";

export type ThemeMode = "auto" | "light" | "dark";

type ThemeContextValue = {
    themeMode: ThemeMode;
    setThemeMode: (mode: ThemeMode) => void;
    isDark: boolean;
    colors: typeof Colors.light;
};

const STORAGE_KEY = "app_theme_mode";

const ThemeContext = createContext<ThemeContextValue>({
    themeMode: "auto",
    setThemeMode: () => {},
    isDark: false,
    colors: Colors.light,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const systemScheme = useColorScheme();
    const [themeMode, setThemeModeState] = useState<ThemeMode>("auto");

    // Load persisted preference on mount
    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY).then((val) => {
            if (val === "light" || val === "dark" || val === "auto") {
                setThemeModeState(val);
            }
        });
    }, []);

    const setThemeMode = (mode: ThemeMode) => {
        setThemeModeState(mode);
        AsyncStorage.setItem(STORAGE_KEY, mode);
    };

    const isDark = useMemo(() => {
        if (themeMode === "dark") return true;
        if (themeMode === "light") return false;
        return systemScheme === "dark";
    }, [themeMode, systemScheme]);

    const colors = isDark ? Colors.dark : Colors.light;

    return (
        <ThemeContext.Provider value={{ themeMode, setThemeMode, isDark, colors }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}

/** Shorthand: returns just the current color palette */
export function useColors() {
    return useContext(ThemeContext).colors;
}
