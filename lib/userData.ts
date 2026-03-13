/**
 * lib/userData.ts
 *
 * Manages the `userData/{uid}` Firestore document for every signed-in user.
 * This is separate from `users/{uid}` (which holds calendarToken, etc.)
 * and is our primary analytics/admin data store.
 *
 * Admin note: The `dailyAiLimit` field on this doc controls how many AI parses
 * a user gets per day. Default is 25. You can raise/lower it per-user directly
 * in the Firebase console without a code deploy.
 */
import * as Application from "expo-application";
import * as Device from "expo-device";
import type { User } from "firebase/auth";
import {
    doc,
    getDoc,
    increment,
    serverTimestamp,
    setDoc,
    updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { scheduleStreakMilestoneNotification } from "./notifications";

export type CreatedFrom = "tasks" | "ai" | "calendar" | "matrix";

export type StreakData = {
    current: number;
    longest: number;
    lastCompletedDate: string | null; // YYYY-MM-DD
};

export type UserData = {
    // Profile
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    provider: string | null; // "google.com" | "apple.com" | "password"
    createdAt: any; // serverTimestamp
    lastSeenAt: any; // serverTimestamp

    // Device / app info
    deviceModel: string | null;
    osVersion: string | null;
    appVersion: string | null;
    appBuild: string | null;
    timezone: string;

    // Task counters
    taskCount: number;
    tasksCreatedFromTasks: number; // from tasks screen
    tasksCreatedFromAI: number;
    tasksCreatedFromCalendar: number;
    tasksCreatedFromMatrix: number;
    tasksCompleted: number;

    // AI counters
    aiPromptsCount: number;     // times "Parse with AI" was pressed
    aiParseSuccessCount: number;
    aiParseFailCount: number;

    // Rate limit (admin-configurable)
    dailyAiLimit: number; // default 25

    // Streak
    streakData: StreakData;

    // Onboarding
    onboardingCompleted: boolean;
};

function getUserDocRef(uid: string) {
    return doc(db, "userData", uid);
}

/**
 * Called on every sign-in.
 * Creates the doc if new, or updates lastSeenAt + device info if returning.
 * Never downgrades dailyAiLimit or wipes existing counters.
 */
export async function initUserData(user: User): Promise<void> {
    try {
        const ref = getUserDocRef(user.uid);
        const snap = await getDoc(ref);

        const providerData = user.providerData?.[0];
        const provider = providerData?.providerId ?? null;

        const deviceInfo = {
            deviceModel: Device.modelName ?? null,
            osVersion: Device.osVersion ?? null,
            appVersion: Application.nativeApplicationVersion ?? null,
            appBuild: Application.nativeBuildVersion ?? null,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };

        if (!snap.exists()) {
            // First sign-in — create the full document
            const newDoc: Omit<UserData, "createdAt" | "lastSeenAt"> = {
                uid: user.uid,
                email: user.email ?? null,
                displayName: user.displayName ?? null,
                photoURL: user.photoURL ?? null,
                provider,
                ...deviceInfo,
                taskCount: 0,
                tasksCreatedFromTasks: 0,
                tasksCreatedFromAI: 0,
                tasksCreatedFromCalendar: 0,
                tasksCreatedFromMatrix: 0,
                tasksCompleted: 0,
                aiPromptsCount: 0,
                aiParseSuccessCount: 0,
                aiParseFailCount: 0,
                dailyAiLimit: 25,
                streakData: { current: 0, longest: 0, lastCompletedDate: null },
                onboardingCompleted: false,
            };
            await setDoc(ref, {
                ...newDoc,
                createdAt: serverTimestamp(),
                lastSeenAt: serverTimestamp(),
            });
        } else {
            // Returning user — update mutable fields only
            await updateDoc(ref, {
                lastSeenAt: serverTimestamp(),
                email: user.email ?? null,
                displayName: user.displayName ?? null,
                photoURL: user.photoURL ?? null,
                ...deviceInfo,
            });
        }
    } catch (err) {
        // Never block sign-in for analytics errors
        console.warn("[userData] initUserData failed:", err);
    }
}

/**
 * Increment the task counter for a specific creation source.
 * Call this from createTaskUnified (or the AI tab) after a task is created.
 */
export async function incrementTaskCounter(
    uid: string,
    source: CreatedFrom
): Promise<void> {
    try {
        const ref = getUserDocRef(uid);
        const fieldMap: Record<CreatedFrom, string> = {
            tasks: "tasksCreatedFromTasks",
            ai: "tasksCreatedFromAI",
            calendar: "tasksCreatedFromCalendar",
            matrix: "tasksCreatedFromMatrix",
        };
        await updateDoc(ref, {
            taskCount: increment(1),
            [fieldMap[source]]: increment(1),
        });
    } catch (err) {
        console.warn("[userData] incrementTaskCounter failed:", err);
    }
}

/** Call when a task is marked complete. */
export async function incrementTaskCompleted(uid: string): Promise<void> {
    try {
        await updateDoc(getUserDocRef(uid), {
            tasksCompleted: increment(1),
        });
    } catch (err) {
        console.warn("[userData] incrementTaskCompleted failed:", err);
    }
}

/** Call when "Parse with AI" is pressed. */
export async function incrementAiPrompt(uid: string): Promise<void> {
    try {
        await updateDoc(getUserDocRef(uid), {
            aiPromptsCount: increment(1),
        });
    } catch (err) {
        console.warn("[userData] incrementAiPrompt failed:", err);
    }
}

/** Call after AI parse succeeds or fails. */
export async function incrementAiResult(
    uid: string,
    success: boolean
): Promise<void> {
    try {
        await updateDoc(getUserDocRef(uid), {
            [success ? "aiParseSuccessCount" : "aiParseFailCount"]: increment(1),
        });
    } catch (err) {
        console.warn("[userData] incrementAiResult failed:", err);
    }
}

/**
 * Fetch the user's daily AI limit.
 * Returns the admin-set value if present, else 25.
 */
// In-session cache so we only hit Firestore once per app session per user
const _limitCache: Record<string, number> = {};

/**
 * Fetch the user's daily AI limit.
 * Returns the admin-set value if present, else 25.
 * Uses an in-memory cache + 2s timeout to avoid blocking the UI.
 */
export async function getDailyAiLimit(uid: string): Promise<number> {
    if (_limitCache[uid] !== undefined) return _limitCache[uid];
    try {
        const snap = await Promise.race([
            getDoc(getUserDocRef(uid)),
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("timeout")), 2000)
            ),
        ]);
        const limit = (snap as any).data?.()?.dailyAiLimit;
        if (typeof limit === "number" && limit > 0) {
            _limitCache[uid] = limit;
            return limit;
        }
    } catch {
        // timeout or Firestore error — fall through to default
    }
    _limitCache[uid] = 25;
    return 25;
}

/** Update streak data after a task is completed. Call from updateTaskUnified. */
export async function updateStreakData(uid: string): Promise<void> {
    try {
        const ref = getUserDocRef(uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) return;

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

        const current: StreakData = snap.data().streakData ?? {
            current: 0,
            longest: 0,
            lastCompletedDate: null,
        };

        if (current.lastCompletedDate === todayStr) {
            // Already counted today — no change
            return;
        }

        // Check if yesterday
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

        const newCurrent =
            current.lastCompletedDate === yesterdayStr
                ? current.current + 1
                : 1; // streak broken, restart

        const newLongest = Math.max(newCurrent, current.longest);

        await updateDoc(ref, {
            streakData: {
                current: newCurrent,
                longest: newLongest,
                lastCompletedDate: todayStr,
            },
        });

        // Trigger streak milestone notification if applicable
        if (newCurrent > current.current) {
            scheduleStreakMilestoneNotification(newCurrent).catch(() => null);
        }
    } catch (err) {
        console.warn("[userData] updateStreakData failed:", err);
    }
}

/** Mark onboarding as completed in userData. */
export async function markOnboardingCompleted(uid: string): Promise<void> {
    try {
        await updateDoc(getUserDocRef(uid), { onboardingCompleted: true });
    } catch {
        // non-critical
    }
}
