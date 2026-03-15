/**
 * lib/aiRateLimit.ts
 *
 * Client-side rate limiting for AI parse calls.
 * Limit resets at midnight local time every day.
 *
 * The per-user limit comes from the `userData/{uid}.dailyAiLimit` Firestore field
 * (default 25). Admins can override this per-user in the Firebase console.
 *
 * For guests (no uid), a hard cap of 5/day applies.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getDailyAiLimit } from "./userData";

const USAGE_KEY = "taskapp.aiUsage.v1"; // { date: "YYYY-MM-DD", count: number }
const GUEST_LIMIT = 5;

function todayString(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Returns seconds until midnight (local time). */
function secondsUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return Math.ceil((midnight.getTime() - now.getTime()) / 1000);
}

function formatResetTime(): string {
    const secs = secondsUntilMidnight();
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    if (hours > 0) return `~${hours}h ${mins}m`;
    return `~${mins}m`;
}

type UsageRecord = { date: string; count: number };

async function readUsage(): Promise<UsageRecord> {
    const today = todayString();
    try {
        const raw = await AsyncStorage.getItem(USAGE_KEY);
        if (raw) {
            const parsed: UsageRecord = JSON.parse(raw);
            // If it's a new day, reset
            if (parsed.date === today) return parsed;
        }
    } catch {
        // malformed — reset
    }
    return { date: today, count: 0 };
}

async function writeUsage(record: UsageRecord): Promise<void> {
    await AsyncStorage.setItem(USAGE_KEY, JSON.stringify(record));
}

export type RateLimitResult =
    | { allowed: true; remaining: number }
    | { allowed: false; remaining: 0; resetIn: string; limit: number };

/**
 * Check if the user is allowed to make an AI parse call.
 * If allowed, this also increments the counter in AsyncStorage.
 * Pass the Firebase uid for logged-in users. Pass undefined for guests.
 */
export async function checkAiRateLimit(uid: string | undefined): Promise<RateLimitResult> {
    const limit = uid ? await getDailyAiLimit(uid) : GUEST_LIMIT;
    const usage = await readUsage();

    if (usage.count >= limit) {
        return {
            allowed: false,
            remaining: 0,
            resetIn: formatResetTime(),
            limit,
        };
    }

    // Allowed — consume one slot
    const updated: UsageRecord = { date: usage.date, count: usage.count + 1 };
    await writeUsage(updated);

    return { allowed: true, remaining: limit - updated.count };
}

/** Read current usage without consuming a slot (for displaying remaining count). */
export async function getAiUsageInfo(uid: string | undefined): Promise<{ used: number; limit: number; remaining: number }> {
    const limit = uid ? await getDailyAiLimit(uid) : GUEST_LIMIT;
    const usage = await readUsage();
    return {
        used: usage.count,
        limit,
        remaining: Math.max(0, limit - usage.count),
    };
}
