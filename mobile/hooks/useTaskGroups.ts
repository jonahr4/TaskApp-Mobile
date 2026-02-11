import { useEffect, useState, useCallback } from "react";
import { onSnapshot } from "firebase/firestore";
import { groupsQuery } from "@/lib/firestore";
import { getLocalGroups } from "@/lib/localDb";
import type { TaskGroup } from "@/lib/types";

export function useTaskGroups(uid: string | undefined) {
    const [groups, setGroups] = useState<TaskGroup[]>([]);
    const [loading, setLoading] = useState(true);

    const loadLocal = useCallback(async () => {
        const local = await getLocalGroups();
        setGroups(local);
        setLoading(false);
    }, []);

    useEffect(() => {
        if (uid) {
            // Cloud mode: real-time Firestore listener
            const unsub = onSnapshot(groupsQuery(uid), (snap) => {
                setGroups(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TaskGroup)));
                setLoading(false);
            });
            return unsub;
        } else {
            // Local mode: read from AsyncStorage
            loadLocal();
        }
    }, [uid, loadLocal]);

    return { groups, loading, reloadLocal: loadLocal };
}
