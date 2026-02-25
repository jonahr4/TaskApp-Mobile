import { Redirect } from "expo-router";

/**
 * This route exists solely to handle the `mobile://openai` deep link
 * from the AI Quick Action widget. Expo Router intercepts the URL and
 * routes here; the AiFab component's Linking listener detects "openai"
 * in the URL and auto-opens the AI Assistant modal.
 */
export default function OpenAI() {
    return <Redirect href="/(tabs)/tasks" />;
}
