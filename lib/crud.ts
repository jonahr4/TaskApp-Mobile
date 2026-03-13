/**
 * Unified CRUD that routes to local storage or Firestore
 * depending on whether a user is logged in.
 */
import { logEvent } from "./analytics";
import {
    createGroup as cloudCreateGroup,
    createTask as cloudCreateTask,
    deleteGroup as cloudDeleteGroup,
    deleteTask as cloudDeleteTask,
    updateGroup as cloudUpdateGroup,
    updateTask as cloudUpdateTask
} from "./firestore";
import {
    localCreateGroup,
    localCreateTask,
    localDeleteGroup,
    localDeleteTask,
    localReorderGroups,
    localUpdateGroup,
    localUpdateTask
} from "./localDb";
import { trackTaskCreatedAndMaybeReview } from "./reviewPrompt";
import type { CreatedFrom, Task, TaskGroup } from "./types";
import { incrementTaskCompleted, incrementTaskCounter, updateStreakData } from "./userData";

// ---- Tasks ----

export async function createTaskUnified(
    uid: string | undefined,
    data: Omit<Task, "id" | "createdAt" | "updatedAt">
) {
    const result = uid
        ? await cloudCreateTask(uid, data)
        : await localCreateTask(data);

    // Fire-and-forget side-effects (never block task creation)
    const source = (data.createdFrom ?? "tasks") as CreatedFrom;
    const isAi = source === "ai";

    trackTaskCreatedAndMaybeReview(isAi).catch(() => null);

    if (uid) {
        incrementTaskCounter(uid, source).catch(() => null);
        logEvent(uid, "task_created", { source }).catch(() => null);
    }

    return result;
}

export async function updateTaskUnified(
    uid: string | undefined,
    taskId: string,
    data: Partial<Omit<Task, "id" | "createdAt">>
) {
    const result = uid
        ? await cloudUpdateTask(uid, taskId, data)
        : await localUpdateTask(taskId, data);

    // If this is a completion, update streak + counter
    if (data.completed === true && uid) {
        incrementTaskCompleted(uid).catch(() => null);
        updateStreakData(uid).catch(() => null);
        logEvent(uid, "task_completed").catch(() => null);
    }

    return result;
}

export async function deleteTaskUnified(
    uid: string | undefined,
    taskId: string
) {
    if (uid) {
        return cloudDeleteTask(uid, taskId);
    } else {
        return localDeleteTask(taskId);
    }
}

// ---- Groups ----

export async function createGroupUnified(
    uid: string | undefined,
    data: Omit<TaskGroup, "id" | "createdAt">
) {
    if (uid) {
        return cloudCreateGroup(uid, data);
    } else {
        return localCreateGroup(data);
    }
}

export async function updateGroupUnified(
    uid: string | undefined,
    groupId: string,
    data: Partial<Omit<TaskGroup, "id" | "createdAt">>
) {
    if (uid) {
        return cloudUpdateGroup(uid, groupId, data);
    } else {
        return localUpdateGroup(groupId, data);
    }
}

export async function deleteGroupUnified(
    uid: string | undefined,
    groupId: string
) {
    if (uid) {
        return cloudDeleteGroup(uid, groupId);
    } else {
        return localDeleteGroup(groupId);
    }
}

export async function reorderGroupsUnified(
    uid: string | undefined,
    orderedGroups: { id: string }[]
) {
    if (uid) {
        // Cloud: sequential updates to avoid race conditions
        for (let i = 0; i < orderedGroups.length; i++) {
            await cloudUpdateGroup(uid, orderedGroups[i].id, { order: i });
        }
    } else {
        // Local: atomic batch update
        await localReorderGroups(orderedGroups.map((g) => g.id));
    }
}
