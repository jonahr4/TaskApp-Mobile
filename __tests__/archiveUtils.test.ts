/**
 * Unit tests for lib/archiveUtils.ts — the archive card logic that mirrors
 * the desktop web app's Archives page. Firestore is not touched here;
 * these tests cover the pure grouping/filtering logic.
 */
import {
    buildArchiveCards,
    unarchiveGroupData,
    unarchiveTaskData,
    visibleArchiveCards,
} from "../lib/archiveUtils";
import type { Task, TaskGroup } from "../lib/types";

function makeTask(overrides: Partial<Task> & { id: string }): Task {
    return {
        title: "task",
        urgent: null,
        important: null,
        dueDate: null,
        dueTime: null,
        groupId: null,
        autoUrgentDays: null,
        completed: false,
        archived: false,
        order: 0,
        createdAt: { seconds: 0, nanoseconds: 0 } as any,
        updatedAt: { seconds: 0, nanoseconds: 0 } as any,
        ...overrides,
    };
}

function makeGroup(overrides: Partial<TaskGroup> & { id: string }): TaskGroup {
    return {
        name: "group",
        color: "#123456",
        archived: false,
        order: 0,
        createdAt: { seconds: 0, nanoseconds: 0 } as any,
        ...overrides,
    };
}

describe("buildArchiveCards", () => {
    it("returns only archived tasks, grouped like the desktop page", () => {
        const tasks = [
            makeTask({ id: "a1", archived: true }),
            makeTask({ id: "a2", archived: true, groupId: "g1" }),
            makeTask({ id: "active", archived: false }),
            makeTask({ id: "a3", archived: true, groupId: "g2" }),
        ];
        const groups = [
            makeGroup({ id: "g1", name: "Work", archived: true }),
            makeGroup({ id: "g2", name: "Home" }),
            makeGroup({ id: "g3", name: "Empty" }),
        ];

        const cards = buildArchiveCards(tasks, groups);

        // Order: General, archived groups, unarchived groups with archived tasks
        expect(cards.map((c) => c.id)).toEqual([null, "g1", "g2"]);
        expect(cards[0].name).toBe("General Tasks");
        expect(cards[0].tasks.map((t) => t.id)).toEqual(["a1"]);
        expect(cards[1].isGroupArchived).toBe(true);
        expect(cards[1].tasks.map((t) => t.id)).toEqual(["a2"]);
        expect(cards[2].isGroupArchived).toBe(false);
        expect(cards[2].tasks.map((t) => t.id)).toEqual(["a3"]);
    });

    it("omits unarchived groups that have no archived tasks", () => {
        const tasks = [makeTask({ id: "a1", archived: true })];
        const groups = [makeGroup({ id: "g1", name: "Empty" })];
        const cards = buildArchiveCards(tasks, groups);
        expect(cards.map((c) => c.id)).toEqual([null]);
    });

    it("keeps archived groups even when they contain no archived tasks", () => {
        const groups = [makeGroup({ id: "g1", name: "Old", archived: true })];
        const cards = buildArchiveCards([], groups);
        expect(cards.map((c) => c.id)).toEqual([null, "g1"]);
        expect(cards[1].tasks).toEqual([]);
    });

    it("handles an empty archive", () => {
        expect(buildArchiveCards([], [])).toEqual([
            {
                id: null,
                name: "General Tasks",
                isGroupArchived: false,
                color: "#64748b",
                tasks: [],
            },
        ]);
    });
});

describe("visibleArchiveCards", () => {
    it("drops empty non-archived cards but keeps archived-group cards", () => {
        const cards = buildArchiveCards([], [
            makeGroup({ id: "g1", name: "Old", archived: true }),
        ]);
        const visible = visibleArchiveCards(cards);
        // General (empty, not archived) is dropped; archived group card stays
        expect(visible.map((c) => c.id)).toEqual(["g1"]);
    });

    it("keeps cards that have tasks", () => {
        const cards = buildArchiveCards(
            [makeTask({ id: "a1", archived: true })],
            []
        );
        expect(visibleArchiveCards(cards).map((c) => c.id)).toEqual([null]);
    });
});

describe("unarchive payloads", () => {
    it("matches the desktop Firestore write ({ archived: false })", () => {
        expect(unarchiveTaskData()).toEqual({ archived: false });
        expect(unarchiveGroupData()).toEqual({ archived: false });
    });
});
