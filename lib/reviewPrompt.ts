/**
 * lib/reviewPrompt.ts
 *
 * Tracks task-creation milestones and triggers App Store review prompts
 * at the right moments — only for activity after March 12, 2026
 * (so existing users without usage aren't prompted immediately).
 *
 * Triggers:
 *   Manual/AI tasks: 5th, 15th, 30th, 50th task created
 *   AI tasks:        1st and 5th AI-created task
 *
 * Each trigger fires at most once, ever (tracked in AsyncStorage).
 * Apple's StoreReview API may suppress the prompt at its own discretion.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as StoreReview from "expo-store-review";

// Only count tasks created on/after this date (ensures existing users
// aren't prompted on their first new task).
const CUTOFF_DATE = new Date("2026-03-12T00:00:00.000Z").getTime();

// AsyncStorage keys
const TOTAL_COUNT_KEY = "taskapp.reviewTrack.totalCount.v1";
const AI_COUNT_KEY = "taskapp.reviewTrack.aiCount.v1";
// Fired flags — once set to "1", the prompt for that milestone won't show again
const FLAG_KEY = (label: string) => `taskapp.reviewFired.${label}.v1`;

const TOTAL_THRESHOLDS = [5, 15, 30, 50];
const AI_THRESHOLDS = [1, 5];

async function maybeShowReview(): Promise<void> {
    try {
        const available = await StoreReview.isAvailableAsync();
        if (available) {
            await StoreReview.requestReview();
        }
    } catch {
        // Never throw — review prompts are best-effort
    }
}

async function checkThresholds(
    key: string,
    thresholds: number[],
    flagPrefix: string,
    currentCount: number
): Promise<boolean> {
    for (const threshold of thresholds) {
        if (currentCount >= threshold) {
            const flagKey = FLAG_KEY(`${flagPrefix}_${threshold}`);
            const fired = await AsyncStorage.getItem(flagKey);
            if (!fired) {
                await AsyncStorage.setItem(flagKey, "1");
                return true; // show review for this threshold
            }
        }
    }
    return false;
}

/**
 * Call this every time a task is created (from ANY source).
 * Pass `isAi = true` when the task came from the AI tab.
 */
export async function trackTaskCreatedAndMaybeReview(
    isAi: boolean = false
): Promise<void> {
    // Only count tasks created after the cutoff date
    if (Date.now() < CUTOFF_DATE) return;

    try {
        // Increment total count
        const rawTotal = await AsyncStorage.getItem(TOTAL_COUNT_KEY);
        const totalCount = (parseInt(rawTotal ?? "0", 10) || 0) + 1;
        await AsyncStorage.setItem(TOTAL_COUNT_KEY, String(totalCount));

        // Check total thresholds
        const shouldReviewFromTotal = await checkThresholds(
            TOTAL_COUNT_KEY,
            TOTAL_THRESHOLDS,
            "total",
            totalCount
        );
        if (shouldReviewFromTotal) {
            await maybeShowReview();
            return; // Don't stack multiple prompts
        }

        // If AI task, also check AI-specific thresholds
        if (isAi) {
            const rawAi = await AsyncStorage.getItem(AI_COUNT_KEY);
            const aiCount = (parseInt(rawAi ?? "0", 10) || 0) + 1;
            await AsyncStorage.setItem(AI_COUNT_KEY, String(aiCount));

            const shouldReviewFromAi = await checkThresholds(
                AI_COUNT_KEY,
                AI_THRESHOLDS,
                "ai",
                aiCount
            );
            if (shouldReviewFromAi) {
                await maybeShowReview();
            }
        }
    } catch (err) {
        console.warn("[reviewPrompt] failed:", err);
    }
}
