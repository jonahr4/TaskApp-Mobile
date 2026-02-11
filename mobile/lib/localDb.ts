import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Task, TaskGroup } from "./types";

const TASKS_KEY = "@local_tasks";
const GROUPS_KEY = "@local_groups";

// ---------- helpers ----------

function localId(): string {
    return (
        "local_" +
        Date.now().toString(36) +
        Math.random().toString(36).slice(2, 8)
    );
}

// ---------- Tasks ----------

export async function getLocalTasks(): Promise<Task[]> {
    const raw = await AsyncStorage.getItem(TASKS_KEY);
    if (!raw) return [];
    try {
        return JSON.parse(raw) as Task[];
    } catch {
        return [];
    }
}

async function saveLocalTasks(tasks: Task[]): Promise<void> {
    await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

export async function localCreateTask(
    data: Omit<Task, "id" | "createdAt" | "updatedAt">
): Promise<Task> {
    const tasks = await getLocalTasks();
    const now = new Date().toISOString();
    const task: Task = {
        ...data,
        id: localId(),
        createdAt: now as any,
        updatedAt: now as any,
    };
    tasks.push(task);
    await saveLocalTasks(tasks);
    return task;
}

export async function localUpdateTask(
    taskId: string,
    data: Partial<Omit<Task, "id" | "createdAt">>
): Promise<void> {
    const tasks = await getLocalTasks();
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return;
    tasks[idx] = { ...tasks[idx], ...data, updatedAt: new Date().toISOString() as any };
    await saveLocalTasks(tasks);
}

export async function localDeleteTask(taskId: string): Promise<void> {
    const tasks = await getLocalTasks();
    await saveLocalTasks(tasks.filter((t) => t.id !== taskId));
}

// ---------- Groups ----------

export async function getLocalGroups(): Promise<TaskGroup[]> {
    const raw = await AsyncStorage.getItem(GROUPS_KEY);
    if (!raw) return [];
    try {
        return JSON.parse(raw) as TaskGroup[];
    } catch {
        return [];
    }
}

async function saveLocalGroups(groups: TaskGroup[]): Promise<void> {
    await AsyncStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
}

export async function localCreateGroup(
    data: Omit<TaskGroup, "id" | "createdAt">
): Promise<TaskGroup> {
    const groups = await getLocalGroups();
    const group: TaskGroup = {
        ...data,
        id: localId(),
        createdAt: new Date().toISOString() as any,
    };
    groups.push(group);
    await saveLocalGroups(groups);
    return group;
}

export async function localUpdateGroup(
    groupId: string,
    data: Partial<Omit<TaskGroup, "id" | "createdAt">>
): Promise<void> {
    const groups = await getLocalGroups();
    const idx = groups.findIndex((g) => g.id === groupId);
    if (idx === -1) return;
    groups[idx] = { ...groups[idx], ...data };
    await saveLocalGroups(groups);
}

export async function localDeleteGroup(groupId: string): Promise<void> {
    const groups = await getLocalGroups();
    await saveLocalGroups(groups.filter((g) => g.id !== groupId));
}

// ---------- Bulk ops (for sync) ----------

export async function replaceAllLocalTasks(tasks: Task[]): Promise<void> {
    await saveLocalTasks(tasks);
}

export async function replaceAllLocalGroups(groups: TaskGroup[]): Promise<void> {
    await saveLocalGroups(groups);
}

export async function clearLocalData(): Promise<void> {
    await AsyncStorage.multiRemove([TASKS_KEY, GROUPS_KEY]);
}

export function isLocalId(id: string): boolean {
    return id.startsWith("local_");
}
