import { useEffect, useState } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/lib/theme";
import { configureForegroundHandler } from "@/lib/notifications";
import MergePrompt from "@/components/MergePrompt";
import { OnboardingScreen } from "@/components/OnboardingScreen";

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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

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
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.light.accent} />
      </View>
    );
  }

  return (
    <>
      <Slot />
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
      <AuthProvider>
        <StatusBar style="auto" />
        <AppShell />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.light.bg,
  },
});
