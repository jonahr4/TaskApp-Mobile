import { useEffect, useState, useCallback } from "react";
import { onSnapshot } from "firebase/firestore";
import { tasksQuery } from "@/lib/firestore";
import { getLocalTasks } from "@/lib/localDb";
import type { Task } from "@/lib/types";

export function useTasks(uid: string | undefined) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    const loadLocal = useCallback(async () => {
        const local = await getLocalTasks();
        setTasks(local);
        setLoading(false);
    }, []);

    useEffect(() => {
        if (uid) {
            // Cloud mode: real-time Firestore listener
            const unsub = onSnapshot(tasksQuery(uid), (snap) => {
                setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Task)));
                setLoading(false);
            });
            return unsub;
        } else {
            // Local mode: read from AsyncStorage
            loadLocal();
        }
    }, [uid, loadLocal]);

    return { tasks, loading, reloadLocal: loadLocal };
}
