import { useEffect, useState, useCallback, useRef } from "react";
import { Platform } from "react-native";
import { onSnapshot } from "firebase/firestore";
import { tasksQuery } from "@/lib/firestore";
import { getLocalTasks } from "@/lib/localDb";
import type { Task } from "@/lib/types";
import type { WidgetTask } from "@/modules/widget-data";

/** Push current tasks to the iOS widget via shared UserDefaults. */
async function syncToWidget(tasks: Task[]) {
    if (Platform.OS !== "ios") return;
    try {
        const WidgetDataModule = require("@/modules/widget-data").default;
        // Only send incomplete tasks, sorted by due date, capped at 10
        const upcoming: WidgetTask[] = tasks
            .filter((t) => !t.completed)
            .sort((a, b) => {
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return a.dueDate.localeCompare(b.dueDate);
            })
            .slice(0, 10)
            .map((t) => ({
                id: t.id,
                title: t.title,
                dueDate: t.dueDate,
                dueTime: t.dueTime,
                completed: t.completed,
                urgent: t.urgent,
                important: t.important,
                groupColor: null,
            }));

        await WidgetDataModule.setTasksJSON(JSON.stringify(upcoming));
        await WidgetDataModule.setTaskCount(upcoming.length);
    } catch {
        // Module not available (e.g. Expo Go) — silently skip
    }
}

export function useTasks(uid: string | undefined) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const uidRef = useRef(uid);
    uidRef.current = uid;

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

    // Sync tasks to iOS widget whenever they change
    useEffect(() => {
        syncToWidget(tasks);
    }, [tasks]);

    // Safe reload: only touches local storage when NOT logged in
    const reloadLocal = useCallback(async () => {
        if (!uidRef.current) {
            await loadLocal();
        }
        // When logged in, Firestore onSnapshot handles updates automatically
    }, [loadLocal]);

    return { tasks, loading, reloadLocal };
}

