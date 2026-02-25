import { useState, useCallback } from "react";
import { getDocs } from "firebase/firestore";
import { tasksQuery, groupsQuery, createTask, createGroup } from "@/lib/firestore";
import {
    getLocalTasks,
    getLocalGroups,
    replaceAllLocalTasks,
    replaceAllLocalGroups,
    clearLocalData,
    isLocalId,
} from "@/lib/localDb";
import type { Task, TaskGroup } from "@/lib/types";
import type { User } from "firebase/auth";

export type SyncScenario =
    | "none"           // no data anywhere
    | "upload"         // local → cloud (new account)
    | "download"       // cloud → local cache
    | "merge_needed";  // both have data → show prompt

export type SyncState = {
    syncing: boolean;
    scenario: SyncScenario | null;
    localTasks: Task[];
    cloudTasks: Task[];
};

export function useSync() {
    const [state, setState] = useState<SyncState>({
        syncing: false,
        scenario: null,
        localTasks: [],
        cloudTasks: [],
    });

    /**
     * Run on sign-in. Detects scenario and auto-resolves simple cases.
     * Returns "merge_needed" if user input is required.
     */
    const onSignIn = useCallback(async (user: User): Promise<SyncScenario> => {
        setState((s) => ({ ...s, syncing: true }));

        const [localTasks, localGroups] = await Promise.all([
            getLocalTasks(),
            getLocalGroups(),
        ]);

        const [cloudTasksSnap, cloudGroupsSnap] = await Promise.all([
            getDocs(tasksQuery(user.uid)),
            getDocs(groupsQuery(user.uid)),
        ]);

        const cloudTasks = cloudTasksSnap.docs.map(
            (d) => ({ id: d.id, ...d.data() } as Task)
        );
        const cloudGroups = cloudGroupsSnap.docs.map(
            (d) => ({ id: d.id, ...d.data() } as TaskGroup)
        );

        const hasLocal = localTasks.length > 0;
        const hasCloud = cloudTasks.length > 0;

        // Scenario 1: nothing anywhere
        if (!hasLocal && !hasCloud) {
            setState({ syncing: false, scenario: "none", localTasks: [], cloudTasks: [] });
            return "none";
        }

        // Scenario 2: local data + empty cloud → upload
        if (hasLocal && !hasCloud) {
            // Upload local groups first, then tasks with remapped group IDs
            const groupIdMap: Record<string, string> = {};
            for (const g of localGroups) {
                const { id, createdAt, ...data } = g;
                const ref = await createGroup(user.uid, data as Omit<TaskGroup, "id" | "createdAt">);
                groupIdMap[id] = ref.id;
            }
            for (const t of localTasks) {
                const { id, createdAt, updatedAt, ...data } = t;
                await createTask(user.uid, {
                    ...data,
                    groupId: data.groupId && groupIdMap[data.groupId]
                        ? groupIdMap[data.groupId]
                        : data.groupId,
                } as Omit<Task, "id" | "createdAt" | "updatedAt">);
            }
            await clearLocalData();
            setState({ syncing: false, scenario: "upload", localTasks: [], cloudTasks: [] });
            return "upload";
        }

        // Scenario 3: no local + cloud data → download (cache locally)
        if (!hasLocal && hasCloud) {
            await replaceAllLocalTasks(cloudTasks);
            await replaceAllLocalGroups(cloudGroups);
            setState({ syncing: false, scenario: "download", localTasks: [], cloudTasks });
            return "download";
        }

        // Scenario 4: both have data → need merge prompt
        setState({
            syncing: false,
            scenario: "merge_needed",
            localTasks,
            cloudTasks,
        });
        return "merge_needed";
    }, []);

    /**
     * User confirmed: merge local tasks into the cloud account.
     */
    const confirmMerge = useCallback(
        async (user: User, selectedTaskIds?: string[]) => {
            setState((s) => ({ ...s, syncing: true }));

            const localTasks = await getLocalTasks();
            const localGroups = await getLocalGroups();

            // Determine which tasks to merge
            const tasksToMerge = selectedTaskIds
                ? localTasks.filter((t) => selectedTaskIds.includes(t.id))
                : localTasks;

            // Get existing cloud groups to avoid duplicates
            const cloudGroupsSnap = await getDocs(groupsQuery(user.uid));
            const existingGroupNames = new Set(
                cloudGroupsSnap.docs.map((d) => (d.data().name as string).toLowerCase())
            );

            // Upload groups that don't already exist
            const groupIdMap: Record<string, string> = {};
            for (const g of localGroups) {
                if (existingGroupNames.has(g.name.toLowerCase())) {
                    // Map to existing cloud group
                    const match = cloudGroupsSnap.docs.find(
                        (d) => (d.data().name as string).toLowerCase() === g.name.toLowerCase()
                    );
                    if (match) groupIdMap[g.id] = match.id;
                } else {
                    const { id, createdAt, ...data } = g;
                    const ref = await createGroup(user.uid, data as Omit<TaskGroup, "id" | "createdAt">);
                    groupIdMap[id] = ref.id;
                }
            }

            // Upload selected tasks
            for (const t of tasksToMerge) {
                const { id, createdAt, updatedAt, ...data } = t;
                await createTask(user.uid, {
                    ...data,
                    groupId: data.groupId && groupIdMap[data.groupId]
                        ? groupIdMap[data.groupId]
                        : data.groupId,
                } as Omit<Task, "id" | "createdAt" | "updatedAt">);
            }

            await clearLocalData();
            setState({ syncing: false, scenario: null, localTasks: [], cloudTasks: [] });
        },
        []
    );

    /**
     * User chose to discard local data and keep only cloud.
     */
    const discardLocal = useCallback(async () => {
        await clearLocalData();
        setState({ syncing: false, scenario: null, localTasks: [], cloudTasks: [] });
    }, []);

    return { ...state, onSignIn, confirmMerge, discardLocal };
}
