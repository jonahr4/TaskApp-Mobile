import { useEffect } from "react";
import { updateTask } from "@/lib/firestore";
import type { Task } from "@/lib/types";

export function useAutoUrgent(uid: string | undefined, tasks: Task[]) {
    useEffect(() => {
        if (!uid || tasks.length === 0) return;

        const check = () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            for (const t of tasks) {
                if (
                    t.autoUrgentDays != null &&
                    t.dueDate &&
                    !t.urgent &&
                    !t.completed
                ) {
                    const due = new Date(`${t.dueDate}T00:00:00`);
                    const triggerDate = new Date(due.getTime() - t.autoUrgentDays * 86400000);
                    if (today >= triggerDate) {
                        updateTask(uid, t.id, { urgent: true });
                    }
                }
            }
        };

        check();

        const interval = setInterval(check, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [uid, tasks]);
}
