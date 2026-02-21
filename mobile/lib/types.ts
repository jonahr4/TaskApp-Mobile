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
    location?: string | null;
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
    DO: { label: "Important & Urgent", sublabel: "Do First", color: "#dc2626", bg: "#fef2f2", border: "#fca5a5", urgent: true, important: true },
    SCHEDULE: { label: "Important & Not Urgent", sublabel: "Schedule", color: "#2563eb", bg: "#eff6ff", border: "#93c5fd", urgent: false, important: true },
    DELEGATE: { label: "Urgent & Not Important", sublabel: "Delegate", color: "#d97706", bg: "#fffbeb", border: "#fbbf24", urgent: true, important: false },
    DELETE: { label: "Not Important or Urgent", sublabel: "Eliminate", color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db", urgent: false, important: false },
};
