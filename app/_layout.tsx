import AiFab from "@/components/AiFab";
import MergePrompt from "@/components/MergePrompt";
import { OnboardingScreen } from "@/components/OnboardingScreen";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider, useTheme } from "@/hooks/useTheme";
import { configureForegroundHandler } from "@/lib/notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Slot, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// Configure notification display while app is in foreground
configureForegroundHandler();

const ONBOARDING_KEY = "hasSeenOnboarding";

// Global callback so account menu can retrigger onboarding
let _showOnboarding: (() => void) | null = null;
export function triggerOnboarding() {
  _showOnboarding?.();
}

function AppShell() {
  const { loading, syncScenario, syncing, syncLocalTasks, confirmMerge, discardLocal } =
    useAuth();
  const { isDark, colors } = useTheme();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const segments = useSegments();
  const isAuthScreen = segments[0] === "(auth)";

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((val: string | null) => {
      if (val !== "true") {
        setShowOnboarding(true);
      }
      setOnboardingChecked(true);
    });
  }, []);

  // Register the global retrigger callback
  useEffect(() => {
    _showOnboarding = () => setShowOnboarding(true);
    return () => { _showOnboarding = null; };
  }, []);

  const handleOnboardingDone = async () => {
    setShowOnboarding(false);
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
  };

  if (loading || !onboardingChecked) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Slot />
      {!isAuthScreen && <AiFab />}
      {/* Merge prompt shown after sign-in when both local and cloud data exist */}
      <MergePrompt
        visible={syncScenario === "merge_needed"}
        localTasks={syncLocalTasks}
        merging={syncing}
        onConfirm={confirmMerge}
        onDiscard={discardLocal}
      />
      {/* Onboarding — first launch or retriggered */}
      <OnboardingScreen visible={showOnboarding} onDone={handleOnboardingDone} />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
