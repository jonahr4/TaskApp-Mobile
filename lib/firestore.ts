import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    setDoc,
    serverTimestamp,
    query,
    orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Task, TaskGroup } from "./types";

/** Firestore rejects `undefined` values — strip them. */
function stripUndefined(obj: Record<string, any>): Record<string, any> {
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

// --- Tasks ---

function tasksCol(uid: string) {
    return collection(db, "users", uid, "tasks");
}

export function tasksQuery(uid: string) {
    return query(tasksCol(uid), orderBy("order", "asc"));
}

export async function createTask(
    uid: string,
    data: Omit<Task, "id" | "createdAt" | "updatedAt">
) {
    return addDoc(tasksCol(uid), {
        ...stripUndefined(data as any),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
}

export async function updateTask(
    uid: string,
    taskId: string,
    data: Partial<Omit<Task, "id" | "createdAt">>
) {
    return updateDoc(doc(db, "users", uid, "tasks", taskId), {
        ...stripUndefined(data as any),
        updatedAt: serverTimestamp(),
    });
}

export async function deleteTask(uid: string, taskId: string) {
    return deleteDoc(doc(db, "users", uid, "tasks", taskId));
}

// --- Task Groups ---

function groupsCol(uid: string) {
    return collection(db, "users", uid, "taskGroups");
}

export function groupsQuery(uid: string) {
    return query(groupsCol(uid), orderBy("order", "asc"));
}

export async function createGroup(
    uid: string,
    data: Omit<TaskGroup, "id" | "createdAt">
) {
    return addDoc(groupsCol(uid), {
        ...data,
        createdAt: serverTimestamp(),
    });
}

export async function updateGroup(
    uid: string,
    groupId: string,
    data: Partial<Omit<TaskGroup, "id" | "createdAt">>
) {
    return updateDoc(doc(db, "users", uid, "taskGroups", groupId), data);
}

export async function deleteGroup(uid: string, groupId: string) {
    return deleteDoc(doc(db, "users", uid, "taskGroups", groupId));
}

// --- Calendar Token ---

export async function getOrCreateCalendarToken(uid: string): Promise<string> {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (snap.exists() && snap.data().calendarToken) {
        return snap.data().calendarToken as string;
    }
    // crypto.randomUUID not available in RN, use simple fallback
    const token = "xxxx-xxxx-xxxx-xxxx".replace(/x/g, () =>
        Math.floor(Math.random() * 16).toString(16)
    );
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    await setDoc(ref, { calendarToken: token, uid, timezone }, { merge: true });
    return token;
}

// --- Account Deletion ---

/** Delete all Firestore data for a user (tasks, groups, user doc). */
export async function deleteAllUserData(uid: string): Promise<void> {
    // Delete all tasks
    const tasksSnap = await getDocs(tasksQuery(uid));
    for (const d of tasksSnap.docs) {
        await deleteDoc(d.ref);
    }

    // Delete all task groups
    const groupsSnap = await getDocs(groupsQuery(uid));
    for (const d of groupsSnap.docs) {
        await deleteDoc(d.ref);
    }

    // Delete user document (calendar token, etc.)
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        await deleteDoc(userRef);
    }
}
