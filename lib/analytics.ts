/**
 * lib/analytics.ts
 *
 * Lightweight event logging to Firestore for signed-in users.
 * Events are stored at `users/{uid}/events/{eventId}`.
 *
 * For non-authenticated users, events are silently skipped —
 * no uid = no storage = within privacy policy.
 */
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export type EventName =
    | "tab_view"
    | "task_created"
    | "task_completed"
    | "ai_parse"
    | "onboarding_completed";

export type EventParams = Record<string, string | number | boolean>;

/**
 * Log a named event for a signed-in user.
 * Fire-and-forget — never throws, never blocks the caller.
 */
export async function logEvent(
    uid: string | undefined,
    name: EventName,
    params?: EventParams
): Promise<void> {
    if (!uid) return; // guest users not tracked
    try {
        await addDoc(collection(db, "users", uid, "events"), {
            name,
            ...params,
            ts: serverTimestamp(),
        });
    } catch {
        // Never surface analytics errors to the user
    }
}
