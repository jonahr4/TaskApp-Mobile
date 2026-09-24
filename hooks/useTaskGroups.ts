import { useEffect, useState, useCallback, useRef } from "react";
import { onSnapshot } from "firebase/firestore";
import { groupsQuery } from "@/lib/firestore";
import { getLocalGroups } from "@/lib/localDb";
import type { TaskGroup } from "@/lib/types";

export function useTaskGroups(uid: string | undefined, includeArchived: boolean = false) {
    const [groups, setGroups] = useState<TaskGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const uidRef = useRef(uid);
    uidRef.current = uid;
    const includeArchivedRef = useRef(includeArchived);
    includeArchivedRef.current = includeArchived;

    const loadLocal = useCallback(async () => {
        const local = await getLocalGroups();
        setGroups(includeArchivedRef.current ? local : local.filter((g) => !g.archived));
        setLoading(false);
    }, []);

    useEffect(() => {
        if (uid) {
            // Cloud mode: real-time Firestore listener
            const unsub = onSnapshot(groupsQuery(uid), (snap) => {
                const fetched = snap.docs.map((d) => ({ id: d.id, ...d.data() } as TaskGroup));
                setGroups(includeArchivedRef.current ? fetched : fetched.filter((g) => !g.archived));
                setLoading(false);
            });
            return unsub;
        } else {
            // Local mode: read from AsyncStorage
            loadLocal();
        }
    }, [uid, loadLocal]);

    // Safe reload: only touches local storage when NOT logged in
    const reloadLocal = useCallback(async () => {
        if (!uidRef.current) {
            await loadLocal();
        }
    }, [loadLocal]);

    return { groups, loading, reloadLocal };
}
