/**
 * Unified CRUD that routes to local storage or Firestore
 * depending on whether a user is logged in.
 */
import {
    createTask as cloudCreateTask,
    updateTask as cloudUpdateTask,
    deleteTask as cloudDeleteTask,
    createGroup as cloudCreateGroup,
    updateGroup as cloudUpdateGroup,
    deleteGroup as cloudDeleteGroup,
} from "./firestore";
import {
    localCreateTask,
    localUpdateTask,
    localDeleteTask,
    localCreateGroup,
    localUpdateGroup,
    localDeleteGroup,
    localReorderGroups,
} from "./localDb";
import type { Task, TaskGroup } from "./types";

// ---- Tasks ----

export async function createTaskUnified(
    uid: string | undefined,
    data: Omit<Task, "id" | "createdAt" | "updatedAt">
) {
    if (uid) {
        return cloudCreateTask(uid, data);
    } else {
        return localCreateTask(data);
    }
}

export async function updateTaskUnified(
    uid: string | undefined,
    taskId: string,
    data: Partial<Omit<Task, "id" | "createdAt">>
) {
    if (uid) {
        return cloudUpdateTask(uid, taskId, data);
    } else {
        return localUpdateTask(taskId, data);
    }
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
