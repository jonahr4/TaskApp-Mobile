/**
 * Archive view helpers — pure logic mirroring the desktop web app's
 * Archives page (TheTaskApp `src/app/archives/page.tsx`).
 *
 * Kept free of React Native imports so it can be unit-tested with Jest.
 */
import type { Task, TaskGroup } from "./types";

export type ArchiveCard = {
    /** TaskGroup id, or null for the "General Tasks" (ungrouped) card. */
    id: string | null;
    name: string;
    color: string;
    isGroupArchived: boolean;
    tasks: Task[];
};

const GENERAL_COLOR = "#64748b";
const DEFAULT_GROUP_COLOR = "#6366f1";

/**
 * Build the archive cards exactly like the desktop Archives page:
 *  1. "General Tasks" card with archived tasks that have no group
 *  2. one card per archived group (with that group's archived tasks)
 *  3. one card per unarchived group that still contains archived tasks
 */
export function buildArchiveCards(allTasks: Task[], allGroups: TaskGroup[]): ArchiveCard[] {
    const tasks = allTasks.filter((t) => t.archived);
    const archivedGroups = allGroups.filter((g) => g.archived);
    const unarchivedGroups = allGroups.filter((g) => !g.archived);

    const ungrouped = tasks.filter((t) => !t.groupId);
    const groupMap = new Map<string, Task[]>();
    for (const t of tasks) {
        if (t.groupId) {
            const arr = groupMap.get(t.groupId) || [];
            arr.push(t);
            groupMap.set(t.groupId, arr);
        }
    }

    const tasksForArchivedGroups = archivedGroups.map((g) => ({
        group: g,
        tasks: groupMap.get(g.id) || [],
    }));

    const tasksForUnarchivedGroups = unarchivedGroups
        .map((g) => ({ group: g, tasks: groupMap.get(g.id) || [] }))
        .filter((g) => g.tasks.length > 0);

    return [
        {
            id: null,
            name: "General Tasks",
            isGroupArchived: false,
            color: GENERAL_COLOR,
            tasks: ungrouped,
        },
        ...tasksForArchivedGroups.map((item) => ({
            id: item.group.id,
            name: item.group.name,
            color: item.group.color || DEFAULT_GROUP_COLOR,
            isGroupArchived: true,
            tasks: item.tasks,
        })),
        ...tasksForUnarchivedGroups.map((item) => ({
            id: item.group.id,
            name: item.group.name,
            color: item.group.color || DEFAULT_GROUP_COLOR,
            isGroupArchived: false,
            tasks: item.tasks,
        })),
    ];
}

/** Non-archived cards worth rendering (desktop skips empty non-archived cards). */
export function visibleArchiveCards(cards: ArchiveCard[]): ArchiveCard[] {
    return cards.filter(
        (c) => c.tasks.length > 0 || (c.isGroupArchived && c.id !== null)
    );
}

/** Payload for unarchiving a task — same Firestore write the desktop uses. */
export function unarchiveTaskData(): { archived: boolean } {
    return { archived: false };
}

/** Payload for unarchiving a group — same Firestore write the desktop uses. */
export function unarchiveGroupData(): { archived: boolean } {
    return { archived: false };
}
