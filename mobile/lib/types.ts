import { Timestamp } from "firebase/firestore";

export type Task = {
    id: string;
    title: string;
    notes?: string;
    urgent: boolean | null;
    important: boolean | null;
    reminder?: boolean;
    dueDate: string | null;
    dueTime: string | null;
    groupId: string | null;
    autoUrgentDays: number | null;
    completed: boolean;
    order: number;
    createdAt: Timestamp;
    updatedAt: Timestamp;
};

export type TaskGroup = {
    id: string;
    name: string;
    color: string | null;
    order: number;
    createdAt: Timestamp;
};

export type Quadrant = "DO" | "SCHEDULE" | "DELEGATE" | "DELETE";

export function getQuadrant(t: Task): Quadrant | null {
    if (t.urgent === null || t.important === null) return null;
    if (t.urgent && t.important) return "DO";
    if (!t.urgent && t.important) return "SCHEDULE";
    if (t.urgent && !t.important) return "DELEGATE";
    return "DELETE";
}

export const QUADRANT_META: Record<
    Quadrant,
    { label: string; sublabel: string; color: string; bg: string; border: string; urgent: boolean; important: boolean }
> = {
    DO: { label: "Important & Urgent", sublabel: "Do First", color: "#ef4444", bg: "#fef2f2", border: "#fecaca", urgent: true, important: true },
    SCHEDULE: { label: "Important & Not Urgent", sublabel: "Schedule", color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe", urgent: false, important: true },
    DELEGATE: { label: "Urgent & Not Important", sublabel: "Delegate", color: "#f59e0b", bg: "#fffbeb", border: "#fed7aa", urgent: true, important: false },
    DELETE: { label: "Not Important or Urgent", sublabel: "Eliminate", color: "#9ca3af", bg: "#f9fafb", border: "#e5e7eb", urgent: false, important: false },
};
