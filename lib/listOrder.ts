import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

const storageKey = (uid?: string) => `@general_list_order:${uid ?? "local"}`;

function normalize(value: unknown): number | null {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
    return Math.floor(value);
}

/** Where the General list sits among real lists. 0 means first. */
export async function loadGeneralListOrder(uid: string | undefined): Promise<number> {
    if (uid) {
        try {
            const snap = await getDoc(doc(db, "users", uid));
            const cloud = normalize(snap.data()?.generalListOrder);
            if (cloud !== null) {
                await AsyncStorage.setItem(storageKey(uid), String(cloud));
                return cloud;
            }
        } catch {
            // Fall back to the on-device copy.
        }
    }
    const raw = await AsyncStorage.getItem(storageKey(uid));
    return normalize(raw == null ? 0 : Number(raw)) ?? 0;
}

export async function saveGeneralListOrder(uid: string | undefined, index: number): Promise<void> {
    const next = normalize(index) ?? 0;
    await AsyncStorage.setItem(storageKey(uid), String(next));
    if (!uid) return;
    try {
        await setDoc(doc(db, "users", uid), { generalListOrder: next }, { merge: true });
    } catch {
        // The device copy is already saved.
    }
}
