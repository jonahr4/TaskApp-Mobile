import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import type { Task } from "@/lib/types";

// ── Settings shape ──────────────────────────────────────────────────────────

export type NotificationSettings = {
    enabled: boolean;
    reminderMinutes: number; // how many minutes before due time
    enabledGroupIds: string[]; // empty = all groups
    allGroupsEnabled: boolean; // true = notify for all groups
    dailySummaryEnabled: boolean;
    dailySummaryHour: number; // 0-23
    dailySummaryMinute: number; // 0-59
    locationRemindersEnabled: boolean; // WIP — UI only
};

const SETTINGS_KEY = "notificationSettings";

export const DEFAULT_SETTINGS: NotificationSettings = {
    enabled: false,
    reminderMinutes: 15,
    enabledGroupIds: [],
    allGroupsEnabled: true,
    dailySummaryEnabled: false,
    dailySummaryHour: 8,
    dailySummaryMinute: 0,
    locationRemindersEnabled: false,
};

export const REMINDER_OPTIONS = [
    { label: "At time of event", value: 0 },
    { label: "5 minutes before", value: 5 },
    { label: "15 minutes before", value: 15 },
    { label: "30 minutes before", value: 30 },
    { label: "1 hour before", value: 60 },
    { label: "2 hours before", value: 120 },
    { label: "1 day before", value: 1440 },
];

// ── Persistence ─────────────────────────────────────────────────────────────

export async function loadSettings(): Promise<NotificationSettings> {
    try {
        const raw = await AsyncStorage.getItem(SETTINGS_KEY);
        if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch { }
    return { ...DEFAULT_SETTINGS };
}

export async function saveSettings(settings: NotificationSettings): Promise<void> {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ── Permissions ─────────────────────────────────────────────────────────────

export async function requestPermissions(): Promise<boolean> {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === "granted") return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
}

// ── Notification channel (Android) ──────────────────────────────────────────

export async function setupNotificationChannel() {
    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("task-reminders", {
            name: "Task Reminders",
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            sound: "default",
        });
    }
}

// ── Configure foreground behavior ───────────────────────────────────────────

export function configureForegroundHandler() {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });
}

// ── Task reminder scheduling ────────────────────────────────────────────────

function getTaskNotificationId(taskId: string): string {
    return `task-reminder-${taskId}`;
}

function getDailySummaryId(): string {
    return "daily-summary";
}

export async function scheduleTaskReminder(
    task: Task,
    minutesBefore: number,
    groupName?: string,
    groupColor?: string
): Promise<void> {
    if (!task.dueDate) return;

    // Build the trigger date
    const [year, month, day] = task.dueDate.split("-").map(Number);
    let hours = 9, minutes = 0; // default: 9am if no time set

    if (task.dueTime) {
        const [h, m] = task.dueTime.split(":").map(Number);
        hours = h;
        minutes = m;
    }

    const dueDate = new Date(year, month - 1, day, hours, minutes, 0);
    const triggerDate = new Date(dueDate.getTime() - minutesBefore * 60 * 1000);

    // Don't schedule if the trigger is in the past
    if (triggerDate <= new Date()) return;

    // Cancel any existing notification for this task
    await cancelTaskReminder(task.id);

    // Priority label — only show if task actually has a priority set
    const hasPriority = task.urgent === true || task.important === true;
    const priorityLabel = !hasPriority ? null :
        task.urgent && task.important ? "🔴 Do First" :
            !task.urgent && task.important ? "🔵 Schedule" :
                task.urgent && !task.important ? "🟡 Delegate" : null;

    // Build body parts
    const bodyParts: string[] = [];
    bodyParts.push(minutesBefore === 0 ? "Due now" : `Due in ${formatMinutes(minutesBefore)}`);
    if (priorityLabel) bodyParts.push(priorityLabel);

    const emoji = colorToEmoji(groupColor);

    await Notifications.scheduleNotificationAsync({
        identifier: getTaskNotificationId(task.id),
        content: {
            title: `${emoji} ${task.title}`,
            subtitle: groupName || undefined,
            body: bodyParts.join(" • "),
            data: { taskId: task.id },
            sound: "default",
            ...(Platform.OS === "android" ? { channelId: "task-reminders" } : {}),
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
        },
    });
}

export async function cancelTaskReminder(taskId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(getTaskNotificationId(taskId));
}

// ── Daily summary ───────────────────────────────────────────────────────────

export async function scheduleDailySummary(
    hour: number,
    minute: number,
    taskCount: number
): Promise<void> {
    // Cancel existing
    await Notifications.cancelScheduledNotificationAsync(getDailySummaryId());

    if (taskCount === 0) return;

    await Notifications.scheduleNotificationAsync({
        identifier: getDailySummaryId(),
        content: {
            title: "📅 Daily Task Summary",
            body: `You have ${taskCount} task${taskCount === 1 ? "" : "s"} due today. Stay on track!`,
            sound: "default",
            ...(Platform.OS === "android" ? { channelId: "task-reminders" } : {}),
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour,
            minute,
        },
    });
}

export async function cancelDailySummary(): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(getDailySummaryId());
}

// ── Bulk reschedule ─────────────────────────────────────────────────────────

export async function rescheduleAllReminders(
    tasks: Task[],
    settings: NotificationSettings,
    groupNameMap?: Record<string, string>,
    groupColorMap?: Record<string, string>
): Promise<void> {
    // Cancel all existing scheduled notifications
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (!settings.enabled) return;

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    // Filter tasks that should get notifications
    const eligibleTasks = tasks.filter((t) => {
        if (t.completed) return false;
        if (!t.dueDate) return false;
        if (!settings.allGroupsEnabled) {
            const gid = t.groupId || "";
            if (!settings.enabledGroupIds.includes(gid)) return false;
        }
        return true;
    });

    // Schedule individual reminders
    for (const task of eligibleTasks) {
        const gName = task.groupId && groupNameMap ? groupNameMap[task.groupId] : undefined;
        const gColor = task.groupId && groupColorMap ? groupColorMap[task.groupId] : undefined;
        await scheduleTaskReminder(task, settings.reminderMinutes, gName || "General Tasks", gColor);
    }

    // Schedule daily summary if enabled
    if (settings.dailySummaryEnabled) {
        const today = new Date().toISOString().slice(0, 10);
        const todayTasks = eligibleTasks.filter((t) => t.dueDate === today);
        await scheduleDailySummary(settings.dailySummaryHour, settings.dailySummaryMinute, todayTasks.length);
    }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

export function formatMinutes(mins: number): string {
    if (mins === 0) return "at time of event";
    if (mins < 60) return `${mins} min`;
    if (mins === 60) return "1 hour";
    if (mins < 1440) {
        const h = Math.round(mins / 60);
        return `${h} hour${h === 1 ? "" : "s"}`;
    }
    const d = Math.round(mins / 1440);
    return `${d} day${d === 1 ? "" : "s"}`;
}

/** Map a hex colour to the closest coloured-circle emoji */
function colorToEmoji(hex?: string): string {
    if (!hex) return "📋";
    // Parse hex to RGB
    const c = hex.replace("#", "");
    const r = parseInt(c.substring(0, 2), 16) / 255;
    const g = parseInt(c.substring(2, 4), 16) / 255;
    const b = parseInt(c.substring(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    if (d < 0.08) return l > 0.6 ? "⚪" : "⚫"; // achromatic — grey/white/black
    let h = 0;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
    // Map hue to emoji
    if (h < 15 || h >= 345) return "🔴";
    if (h < 45) return "🟠";
    if (h < 70) return "🟡";
    if (h < 170) return "🟢";
    if (h < 260) return "🔵";
    if (h < 310) return "🟣";
    return "🔴"; // pinkish reds
}
