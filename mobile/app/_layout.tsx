import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Colors } from "@/lib/theme";
import MergePrompt from "@/components/MergePrompt";

function AppShell() {
  const { loading, syncScenario, syncing, syncLocalTasks, confirmMerge, discardLocal } =
    useAuth();

  if (loading) {
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
