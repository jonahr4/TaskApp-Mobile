import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Modal,
    Keyboard,
    Platform,
    Dimensions,
    Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAuth } from "@/hooks/useAuth";
import { useTasks } from "@/hooks/useTasks";
import { useTaskGroups } from "@/hooks/useTaskGroups";
import { createTaskUnified } from "@/lib/crud";
import { Colors, Spacing, Radius, FontSize, Shadows } from "@/lib/theme";
import { QUADRANT_META } from "@/lib/types";
import type { Quadrant } from "@/lib/types";

// Lazy-load speech recognition (native module, fails in Expo Go)
let SpeechModule: any = null;
let useSpeechEvent: any = null;
try {
    const sr = require("expo-speech-recognition");
    SpeechModule = sr.ExpoSpeechRecognitionModule;
    useSpeechEvent = sr.useSpeechRecognitionEvent;
} catch {
    // Not available in Expo Go
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 100; // carousel card width

// ── Types ───────────────────────────────────────────────────
type AiTask = {
    title: string;
    notes: string;
    dueDate: string | null;
    dueTime: string | null;
    priority: Quadrant;
    group: string | null;
    groupId: string | null;
    timeSource: "explicit" | "guessed" | "none";
};

type ChatMessage =
    | { role: "user"; text: string }
    | { role: "assistant"; tasks: AiTask[]; text?: string }
    | { role: "assistant-text"; text: string }
    | { role: "system"; text: string };

// ── Helpers ─────────────────────────────────────────────────
function formatDate(d: string | null): string {
    if (!d) return "No date";
    const [y, m, day] = d.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[parseInt(m) - 1]} ${parseInt(day)}`;
}

function formatTime(t: string | null): string {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

// Simple markdown renderer: supports **bold**
function renderMarkdown(text: string, baseStyle: any) {
    const parts = text.split(/(\*\*[^*]+\*\*)/);
    return parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
            return (
                <Text key={i} style={[baseStyle, { fontWeight: "800" }]}>
                    {part.slice(2, -2)}
                </Text>
            );
        }
        return <Text key={i} style={baseStyle}>{part}</Text>;
    });
}

// ── Task Carousel ───────────────────────────────────────────
const PRIORITIES: Quadrant[] = ["DO", "SCHEDULE", "DELEGATE", "DELETE"];

function TaskCarousel({
    tasks,
    onAddOne,
    onAddAll,
    onUpdateTask,
    addingAll,
}: {
    tasks: AiTask[];
    onAddOne: (idx: number) => void;
    onAddAll: () => void;
    onUpdateTask: (idx: number, updates: Partial<AiTask>) => void;
    addingAll: boolean;
}) {
    const [page, setPage] = useState(0);
    const scrollRef = useRef<ScrollView>(null);
    const [pickerTarget, setPickerTarget] = useState<{ idx: number; mode: "date" | "time" } | null>(null);

    const goTo = (idx: number) => {
        const clamped = Math.max(0, Math.min(idx, tasks.length - 1));
        setPage(clamped);
        scrollRef.current?.scrollTo({ x: clamped * (CARD_WIDTH + 12), animated: true });
    };

    const cyclePriority = (idx: number) => {
        const current = PRIORITIES.indexOf(tasks[idx].priority);
        const next = PRIORITIES[(current + 1) % PRIORITIES.length];
        onUpdateTask(idx, { priority: next });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const clearDate = (idx: number) => {
        onUpdateTask(idx, { dueDate: null, dueTime: null });
    };

    return (
        <View>
            <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled={false}
                snapToInterval={CARD_WIDTH + 12}
                decelerationRate="fast"
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 6, gap: 12 }}
                onMomentumScrollEnd={(e) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + 12));
                    setPage(Math.max(0, Math.min(idx, tasks.length - 1)));
                }}
            >
                {tasks.map((task, idx) => {
                    const meta = QUADRANT_META[task.priority];
                    return (
                        <View key={idx} style={[s.carouselCard, { width: CARD_WIDTH }]}>
                            {/* Title row + add button */}
                            <View style={s.cardHeader}>
                                <TextInput
                                    style={s.cardTitleInput}
                                    value={task.title}
                                    onChangeText={(v) => onUpdateTask(idx, { title: v })}
                                    placeholder="Task title..."
                                    placeholderTextColor={Colors.light.textTertiary}
                                    multiline
                                />
                                <TouchableOpacity
                                    style={[s.addOneBtn, { backgroundColor: meta.color }]}
                                    onPress={() => onAddOne(idx)}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="add" size={16} color="#fff" />
                                </TouchableOpacity>
                            </View>

                            {/* Editable description */}
                            <TextInput
                                style={s.cardNotesInput}
                                value={task.notes}
                                onChangeText={(v) => onUpdateTask(idx, { notes: v })}
                                placeholder="Add description..."
                                placeholderTextColor={Colors.light.textTertiary}
                                multiline
                                numberOfLines={2}
                            />

                            {/* Priority picker row */}
                            <View style={s.priorityRow}>
                                <Text style={s.fieldLabel}>Priority</Text>
                                <View style={s.priorityPills}>
                                    {PRIORITIES.map((p) => {
                                        const pm = QUADRANT_META[p];
                                        const active = task.priority === p;
                                        return (
                                            <TouchableOpacity
                                                key={p}
                                                style={[
                                                    s.priorityPill,
                                                    active
                                                        ? { backgroundColor: pm.color, borderColor: pm.color }
                                                        : { backgroundColor: Colors.light.bg, borderColor: Colors.light.borderLight },
                                                ]}
                                                onPress={() => {
                                                    onUpdateTask(idx, { priority: p });
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[
                                                    s.priorityPillText,
                                                    { color: active ? "#fff" : Colors.light.textSecondary },
                                                ]}>{pm.sublabel}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* Date + Time row */}
                            <View style={s.dateTimeRow}>
                                {/* Date */}
                                <TouchableOpacity
                                    style={s.dateTimeItem}
                                    onPress={() => {
                                        if (!task.dueDate) {
                                            const today = new Date().toISOString().split("T")[0];
                                            onUpdateTask(idx, { dueDate: today });
                                        }
                                        setPickerTarget(
                                            pickerTarget?.idx === idx && pickerTarget?.mode === "date"
                                                ? null
                                                : { idx, mode: "date" }
                                        );
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="calendar-outline" size={16} color={task.dueDate ? Colors.light.accent : Colors.light.textTertiary} />
                                    <Text style={task.dueDate ? s.dateTimeText : s.dateTimePlaceholder}>
                                        {task.dueDate ? formatDate(task.dueDate) : "Add date"}
                                    </Text>
                                </TouchableOpacity>
                                {task.dueDate && (
                                    <TouchableOpacity onPress={() => onUpdateTask(idx, { dueDate: null, dueTime: null })} hitSlop={8} style={s.clearBtn}>
                                        <Ionicons name="close-circle" size={16} color={Colors.light.textTertiary} />
                                    </TouchableOpacity>
                                )}

                                {/* Time — only if date exists */}
                                {task.dueDate && (
                                    <>
                                        <TouchableOpacity
                                            style={s.dateTimeItem}
                                            onPress={() => {
                                                if (!task.dueTime) {
                                                    onUpdateTask(idx, { dueTime: "12:00" });
                                                }
                                                setPickerTarget(
                                                    pickerTarget?.idx === idx && pickerTarget?.mode === "time"
                                                        ? null
                                                        : { idx, mode: "time" }
                                                );
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons name="time-outline" size={16} color={task.dueTime ? Colors.light.accent : Colors.light.textTertiary} />
                                            <Text style={task.dueTime ? s.dateTimeText : s.dateTimePlaceholder}>
                                                {task.dueTime ? formatTime(task.dueTime) : "Add time"}
                                            </Text>
                                        </TouchableOpacity>
                                        {task.dueTime && (
                                            <TouchableOpacity onPress={() => onUpdateTask(idx, { dueTime: null })} hitSlop={8} style={s.clearBtn}>
                                                <Ionicons name="close-circle" size={16} color={Colors.light.textTertiary} />
                                            </TouchableOpacity>
                                        )}
                                    </>
                                )}
                            </View>

                            {/* Inline picker — expands card downward */}
                            {pickerTarget?.idx === idx && (
                                <View style={s.inlinePicker}>
                                    <DateTimePicker
                                        value={(() => {
                                            if (pickerTarget.mode === "date" && task.dueDate) {
                                                return new Date(task.dueDate + "T12:00:00");
                                            }
                                            if (pickerTarget.mode === "time" && task.dueTime) {
                                                const [h, m] = task.dueTime.split(":").map(Number);
                                                const d = new Date(); d.setHours(h, m, 0, 0);
                                                return d;
                                            }
                                            return new Date();
                                        })()}
                                        mode={pickerTarget.mode}
                                        display="spinner"
                                        style={{ height: 150 }}
                                        onChange={(_ev, selectedDate) => {
                                            if (!selectedDate) return;
                                            if (pickerTarget.mode === "date") {
                                                const y = selectedDate.getFullYear();
                                                const mo = String(selectedDate.getMonth() + 1).padStart(2, "0");
                                                const d = String(selectedDate.getDate()).padStart(2, "0");
                                                onUpdateTask(idx, { dueDate: `${y}-${mo}-${d}` });
                                            } else {
                                                const h = String(selectedDate.getHours()).padStart(2, "0");
                                                const mi = String(selectedDate.getMinutes()).padStart(2, "0");
                                                onUpdateTask(idx, { dueTime: `${h}:${mi}` });
                                            }
                                        }}
                                    />
                                    <TouchableOpacity
                                        style={s.pickerDoneBtn}
                                        onPress={() => setPickerTarget(null)}
                                    >
                                        <Text style={s.pickerDoneText}>Done</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    );
                })}
            </ScrollView>

            {/* Navigation: arrows + dots */}
            {tasks.length > 1 && (
                <View style={s.carouselNav}>
                    <TouchableOpacity
                        onPress={() => goTo(page - 1)}
                        disabled={page === 0}
                        style={[s.arrowBtn, page === 0 && s.arrowDisabled]}
                    >
                        <Ionicons name="chevron-back" size={18} color={page === 0 ? Colors.light.borderLight : Colors.light.textSecondary} />
                    </TouchableOpacity>

                    <View style={s.dots}>
                        {tasks.map((_, i) => (
                            <View
                                key={i}
                                style={[s.dot, i === page && s.dotActive]}
                            />
                        ))}
                    </View>

                    <TouchableOpacity
                        onPress={() => goTo(page + 1)}
                        disabled={page === tasks.length - 1}
                        style={[s.arrowBtn, page === tasks.length - 1 && s.arrowDisabled]}
                    >
                        <Ionicons name="chevron-forward" size={18} color={page === tasks.length - 1 ? Colors.light.borderLight : Colors.light.textSecondary} />
                    </TouchableOpacity>
                </View>
            )}

            {/* Add All */}
            <TouchableOpacity
                style={s.addAllBtn}
                onPress={onAddAll}
                activeOpacity={0.85}
                disabled={addingAll}
            >
                {addingAll ? (
                    <ActivityIndicator color="#fff" size="small" />
                ) : (
                    <>
                        <Ionicons name="checkmark-done" size={16} color="#fff" />
                        <Text style={s.addAllText}>
                            Add {tasks.length === 1 ? "Task" : `All ${tasks.length} Tasks`}
                        </Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );
}

// ── Main AiFab Component ────────────────────────────────────
export default function AiFab() {
    const { user } = useAuth();
    const { groups } = useTaskGroups(user?.uid);
    const { tasks } = useTasks(user?.uid);

    const [open, setOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [parsing, setParsing] = useState(false);
    const [creating, setCreating] = useState(false);
    const scrollRef = useRef<ScrollView>(null);
    const inputRef = useRef<TextInput>(null);
    const [listening, setListening] = useState(false);

    // Speech recognition event handlers
    useEffect(() => {
        if (!SpeechModule) return;
        const resultSub = SpeechModule.addListener?.("result", (ev: any) => {
            if (ev?.results?.[0]?.transcript) {
                setInput((prev) => prev + ev.results[0].transcript);
            }
        });
        const endSub = SpeechModule.addListener?.("end", () => setListening(false));
        const errorSub = SpeechModule.addListener?.("error", () => setListening(false));
        return () => {
            resultSub?.remove?.();
            endSub?.remove?.();
            errorSub?.remove?.();
        };
    }, []);

    const toggleMic = async () => {
        if (!SpeechModule) {
            // Fallback: just focus input so user can use keyboard dictation
            inputRef.current?.focus();
            return;
        }
        if (listening) {
            SpeechModule.stop();
            setListening(false);
        } else {
            try {
                const perm = await SpeechModule.requestPermissionsAsync();
                if (!perm.granted) return;
                SpeechModule.start({ lang: "en-US", interimResults: false });
                setListening(true);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } catch {
                inputRef.current?.focus();
            }
        }
    };

    // FAB animation
    const fabScale = useRef(new Animated.Value(1)).current;
    const fabGlow = useRef(new Animated.Value(0)).current;

    // Keyboard height tracking for pageSheet modal
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    useEffect(() => {
        const showSub = Keyboard.addListener(
            Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
            (e) => setKeyboardHeight(e.endCoordinates.height)
        );
        const hideSub = Keyboard.addListener(
            Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
            () => setKeyboardHeight(0)
        );
        return () => { showSub.remove(); hideSub.remove(); };
    }, []);

    // Pulse glow loop
    useMemo(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(fabGlow, { toValue: 1, duration: 1500, useNativeDriver: true }),
                Animated.timing(fabGlow, { toValue: 0, duration: 1500, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
    const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

    const handleOpen = () => {
        setOpen(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Animated.spring(fabScale, { toValue: 0.85, useNativeDriver: true, friction: 5 }).start();
    };

    const handleClose = () => {
        setOpen(false);
        Animated.spring(fabScale, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
    };

    const handleSend = async () => {
        const trimmed = input.trim();
        if (!trimmed || parsing) return;
        Keyboard.dismiss();

        // Add user message
        const userMsg: ChatMessage = { role: "user", text: trimmed };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setParsing(true);

        // Scroll to bottom
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

        try {
            // Use the chat endpoint which handles both queries and task creation
            const baseUrl = (process.env.EXPO_PUBLIC_AI_API_URL || "https://the-task-app.vercel.app/api/ai/parse").replace(/\/parse$/, "/chat");

            // Build existing tasks context
            const existingTasks = tasks
                .filter((t: { completed: boolean }) => !t.completed)
                .slice(0, 50)
                .map((t: { title: string; dueDate?: string | null; dueTime?: string | null; groupId?: string | null; completed: boolean }) => ({
                    title: t.title,
                    dueDate: t.dueDate || null,
                    dueTime: t.dueTime || null,
                    group: t.groupId ? groups.find((g: { id: string; name: string }) => g.id === t.groupId)?.name || null : null,
                    completed: t.completed,
                }));

            const res = await fetch(baseUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: trimmed,
                    today,
                    timezone,
                    groups: groups.map((g: { name: string }) => g.name),
                    existingTasks,
                }),
            });

            const data = await res.json().catch(() => null);
            if (!res.ok) throw new Error(data?.error || "AI request failed");

            if (data?.type === "answer") {
                // Text-only answer about existing tasks
                setMessages((prev) => [...prev, { role: "assistant-text" as const, text: data.message || "I'm not sure how to answer that." }]);
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else if (data?.type === "tasks" && Array.isArray(data.tasks)) {
                const mappedTasks: AiTask[] = data.tasks.map((t: AiTask) => {
                    let groupId: string | null = null;
                    if (t.group) {
                        const match = groups.find((g: { name: string; id: string }) => g.name.toLowerCase() === t.group!.toLowerCase());
                        if (match) groupId = match.id;
                    }
                    return { ...t, groupId };
                });

                const assistantMsg: ChatMessage = {
                    role: "assistant",
                    tasks: mappedTasks,
                    text: data.message || (mappedTasks.length === 1
                        ? "Here's a task for you:"
                        : `Here are ${mappedTasks.length} tasks:`),
                };
                setMessages((prev) => [...prev, assistantMsg]);
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                // Fallback: treat as text answer
                setMessages((prev) => [...prev, { role: "assistant-text" as const, text: data?.message || "Something went wrong." }]);
            }
        } catch (err) {
            const errMsg: ChatMessage = {
                role: "system",
                text: `⚠️ ${err instanceof Error ? err.message : "Failed to parse. Try again."}`,
            };
            setMessages((prev) => [...prev, errMsg]);
        } finally {
            setParsing(false);
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
        }
    };

    const handleAddOne = useCallback(async (msgIdx: number, taskIdx: number) => {
        const msg = messages[msgIdx];
        if (msg.role !== "assistant") return;
        const task = msg.tasks[taskIdx];
        if (!task) return;

        try {
            const meta = QUADRANT_META[task.priority];
            await createTaskUnified(user?.uid, {
                title: task.title.trim(),
                notes: task.notes?.trim() || undefined,
                dueDate: task.dueDate || null,
                dueTime: task.dueTime || null,
                urgent: meta.urgent,
                important: meta.important,
                groupId: task.groupId || groups[0]?.id || null,
                completed: false,
                order: tasks.length,
                autoUrgentDays: null,
                reminder: false,
            });
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Add success message
            setMessages((prev) => [...prev, { role: "system", text: `✅ Added "${task.title}"` }]);
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
        } catch {
            setMessages((prev) => [...prev, { role: "system", text: "❌ Failed to add task" }]);
        }
    }, [messages, user?.uid, groups, tasks.length]);

    const handleAddAll = useCallback(async (msgIdx: number) => {
        const msg = messages[msgIdx];
        if (msg.role !== "assistant") return;

        setCreating(true);
        try {
            let created = 0;
            for (const task of msg.tasks) {
                if (!task.title.trim()) continue;
                const meta = QUADRANT_META[task.priority];
                await createTaskUnified(user?.uid, {
                    title: task.title.trim(),
                    notes: task.notes?.trim() || undefined,
                    dueDate: task.dueDate || null,
                    dueTime: task.dueTime || null,
                    urgent: meta.urgent,
                    important: meta.important,
                    groupId: task.groupId || groups[0]?.id || null,
                    completed: false,
                    order: tasks.length + created,
                    autoUrgentDays: null,
                    reminder: false,
                });
                created++;
            }
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setMessages((prev) => [
                ...prev,
                { role: "system", text: `✅ Added ${created} task${created > 1 ? "s" : ""}!` },
            ]);
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
        } catch {
            setMessages((prev) => [...prev, { role: "system", text: "❌ Failed to create tasks" }]);
        } finally {
            setCreating(false);
        }
    }, [messages, user?.uid, groups, tasks.length]);

    const handleUpdateTask = useCallback((msgIdx: number, taskIdx: number, updates: Partial<AiTask>) => {
        setMessages((prev) => prev.map((msg, i) => {
            if (i !== msgIdx || msg.role !== "assistant") return msg;
            const newTasks = [...msg.tasks];
            newTasks[taskIdx] = { ...newTasks[taskIdx], ...updates };
            return { ...msg, tasks: newTasks };
        }));
    }, []);

    return (
        <>
            {/* FAB Button */}
            <Animated.View style={[s.fabWrapper, { transform: [{ scale: fabScale }] }]}>
                <Animated.View
                    style={[
                        s.fabGlow,
                        {
                            opacity: fabGlow.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.3, 0.7],
                            }),
                        },
                    ]}
                />
                <TouchableOpacity
                    style={s.fab}
                    onPress={handleOpen}
                    activeOpacity={0.85}
                >
                    <Ionicons name="sparkles" size={24} color="#fff" />
                </TouchableOpacity>
            </Animated.View>

            <Modal
                visible={open}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={handleClose}
            >
                <View style={s.sheet}>
                    {/* Sheet Header */}
                    <View style={s.sheetHeader}>
                        <View style={s.sheetHandle} />
                        <View style={s.sheetTitleRow}>
                            <View style={s.sheetTitleLeft}>
                                <View style={s.sheetIconBg}>
                                    <Ionicons name="sparkles" size={16} color="#fff" />
                                </View>
                                <Text style={s.sheetTitle}>AI Assistant</Text>
                            </View>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                {messages.length > 0 && (
                                    <TouchableOpacity
                                        onPress={() => { setMessages([]); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                                        hitSlop={12}
                                    >
                                        <Ionicons name="trash-outline" size={22} color={Colors.light.textTertiary} />
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity onPress={handleClose} hitSlop={12}>
                                    <Ionicons name="close-circle" size={28} color={Colors.light.textTertiary} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Messages */}
                    <ScrollView
                        ref={scrollRef}
                        style={s.messageList}
                        contentContainerStyle={s.messageListContent}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Welcome message if empty */}
                        {messages.length === 0 && (
                            <View style={s.welcomeContainer}>
                                <View style={s.welcomeIcon}>
                                    <Ionicons name="sparkles" size={32} color={Colors.light.accent} />
                                </View>
                                <Text style={s.welcomeTitle}>Hi! I'm your task assistant</Text>
                                <Text style={s.welcomeSub}>
                                    Ask me about your schedule, or describe tasks and I'll create them for you.
                                </Text>
                                <View style={s.suggestions}>
                                    {[
                                        "What do I have due tomorrow?",
                                        "I have a CS exam next Friday",
                                        "What's my busiest day this week?",
                                        "Buy groceries and call mom today",
                                    ].map((sug, i) => (
                                        <TouchableOpacity
                                            key={i}
                                            style={s.suggestionChip}
                                            onPress={() => { setInput(sug); }}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons name="chatbubble-outline" size={12} color={Colors.light.accent} />
                                            <Text style={s.suggestionText}>{sug}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Chat messages */}
                        {messages.map((msg, mIdx) => {
                            if (msg.role === "user") {
                                return (
                                    <View key={mIdx} style={s.userBubbleRow}>
                                        <View style={s.userBubble}>
                                            <Text selectable style={s.userBubbleText}>{msg.text}</Text>
                                        </View>
                                    </View>
                                );
                            }
                            if (msg.role === "assistant-text") {
                                return (
                                    <View key={mIdx} style={s.assistantBubbleRow}>
                                        <View style={s.assistantAvatar}>
                                            <Ionicons name="sparkles" size={14} color="#fff" />
                                        </View>
                                        <View style={s.assistantTextBubble}>
                                            <Text selectable style={s.assistantText}>{renderMarkdown(msg.text, s.assistantText)}</Text>
                                        </View>
                                    </View>
                                );
                            }
                            if (msg.role === "assistant") {
                                return (
                                    <View key={mIdx} style={s.assistantBubbleRow}>
                                        <View style={s.assistantAvatar}>
                                            <Ionicons name="sparkles" size={14} color="#fff" />
                                        </View>
                                        <View style={s.assistantContent}>
                                            {msg.text && <Text style={s.assistantText}>{msg.text}</Text>}
                                            <TaskCarousel
                                                tasks={msg.tasks}
                                                onAddOne={(tIdx) => handleAddOne(mIdx, tIdx)}
                                                onAddAll={() => handleAddAll(mIdx)}
                                                onUpdateTask={(tIdx, updates) => handleUpdateTask(mIdx, tIdx, updates)}
                                                addingAll={creating}
                                            />
                                        </View>
                                    </View>
                                );
                            }
                            // system message
                            return (
                                <View key={mIdx} style={s.systemRow}>
                                    <Text style={s.systemText}>{msg.text}</Text>
                                </View>
                            );
                        })}

                        {/* Typing indicator */}
                        {parsing && (
                            <View style={s.assistantBubbleRow}>
                                <View style={s.assistantAvatar}>
                                    <Ionicons name="sparkles" size={14} color="#fff" />
                                </View>
                                <View style={s.typingBubble}>
                                    <ActivityIndicator size="small" color={Colors.light.accent} />
                                    <Text style={s.typingText}>Thinking...</Text>
                                </View>
                            </View>
                        )}
                    </ScrollView>

                    {/* Input Bar */}
                    <View style={[s.inputBar, { paddingBottom: keyboardHeight > 0 ? 8 : (Platform.OS === "ios" ? 32 : 12) }]}>
                        <TouchableOpacity
                            style={[s.micBtn, listening && s.micBtnActive]}
                            onPress={toggleMic}
                            activeOpacity={0.7}
                        >
                            <Ionicons name={listening ? "mic" : "mic-outline"} size={22} color={listening ? "#fff" : Colors.light.accent} />
                        </TouchableOpacity>
                        <TextInput
                            ref={inputRef}
                            style={s.inputField}
                            placeholder="Ask about tasks or add new ones..."
                            placeholderTextColor={Colors.light.textTertiary}
                            value={input}
                            onChangeText={setInput}
                            multiline
                            maxLength={500}
                            returnKeyType="default"
                        />
                        <TouchableOpacity
                            style={[s.sendBtn, (!input.trim() || parsing) && s.sendBtnDisabled]}
                            onPress={handleSend}
                            disabled={!input.trim() || parsing}
                            activeOpacity={0.85}
                        >
                            <Ionicons
                                name="arrow-up"
                                size={20}
                                color={(!input.trim() || parsing) ? Colors.light.textTertiary : "#fff"}
                            />
                        </TouchableOpacity>
                    </View>
                    {keyboardHeight > 0 && <View style={{ height: keyboardHeight }} />}
                </View>
            </Modal>
        </>
    );
}

// ── Styles ──────────────────────────────────────────────────
const s = StyleSheet.create({
    // FAB
    fabWrapper: {
        position: "absolute",
        bottom: Platform.OS === "ios" ? 110 : 80,
        right: 20,
        zIndex: 999,
        alignItems: "center",
        justifyContent: "center",
    },
    fabGlow: {
        position: "absolute",
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Colors.light.accent,
    },
    fab: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.light.accent,
        alignItems: "center",
        justifyContent: "center",
        ...Shadows.lg,
        shadowColor: Colors.light.accent,
        shadowOpacity: 0.4,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
    },

    // Overlay & Sheet
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "flex-end",
    },
    overlayDismiss: {
        flex: 1,
    },
    sheet: {
        backgroundColor: Colors.light.bgCard,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        flex: 1,
        ...Shadows.lg,
    },
    sheetHeader: {
        alignItems: "center",
        paddingTop: 8,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.borderLight,
    },
    sheetHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.light.borderLight,
        marginBottom: 12,
    },
    sheetTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: Spacing.lg,
        width: "100%",
    },
    sheetTitleLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    sheetIconBg: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Colors.light.accent,
        alignItems: "center",
        justifyContent: "center",
    },
    sheetTitle: {
        fontSize: FontSize.lg,
        fontWeight: "700",
        color: Colors.light.textPrimary,
    },

    // Messages
    messageList: {
        flex: 1,
    },
    messageListContent: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xl,
        gap: 16,
    },

    // Welcome
    welcomeContainer: {
        alignItems: "center",
        paddingVertical: 24,
        gap: 8,
    },
    welcomeIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.light.accentLight,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 4,
    },
    welcomeTitle: {
        fontSize: FontSize.lg,
        fontWeight: "700",
        color: Colors.light.textPrimary,
    },
    welcomeSub: {
        fontSize: FontSize.sm,
        color: Colors.light.textSecondary,
        textAlign: "center",
        paddingHorizontal: 20,
        lineHeight: 20,
    },
    suggestions: {
        marginTop: 12,
        gap: 8,
        width: "100%",
    },
    suggestionChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: Colors.light.accentLight,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: "rgba(79, 70, 229, 0.12)",
    },
    suggestionText: {
        fontSize: FontSize.sm,
        color: Colors.light.accent,
        fontWeight: "500",
        flex: 1,
    },

    // User bubble
    userBubbleRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
    },
    userBubble: {
        backgroundColor: Colors.light.accent,
        borderRadius: 18,
        borderBottomRightRadius: 4,
        paddingHorizontal: 16,
        paddingVertical: 10,
        maxWidth: "80%",
    },
    userBubbleText: {
        color: "#fff",
        fontSize: FontSize.md,
        lineHeight: 20,
    },

    // Assistant bubble
    assistantBubbleRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
    },
    assistantAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Colors.light.accent,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 2,
    },
    assistantContent: {
        flex: 1,
        gap: 8,
    },
    assistantText: {
        fontSize: FontSize.md,
        color: Colors.light.textPrimary,
        lineHeight: 20,
        fontWeight: "500",
    },
    assistantTextBubble: {
        flex: 1,
        backgroundColor: Colors.light.bg,
        borderRadius: 18,
        borderBottomLeftRadius: 4,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },

    // Typing indicator
    typingBubble: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: Colors.light.bg,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 18,
        borderBottomLeftRadius: 4,
    },
    typingText: {
        fontSize: FontSize.sm,
        color: Colors.light.textTertiary,
    },

    // System message
    systemRow: {
        alignItems: "center",
    },
    systemText: {
        fontSize: FontSize.sm,
        color: Colors.light.textSecondary,
        backgroundColor: Colors.light.bg,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: Radius.full,
        overflow: "hidden",
        fontWeight: "500",
    },

    // Input bar
    inputBar: {
        flexDirection: "row",
        alignItems: "flex-end",
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        paddingBottom: Platform.OS === "ios" ? 32 : Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Colors.light.borderLight,
        backgroundColor: Colors.light.bgCard,
        gap: 8,
    },
    micBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: Colors.light.accentLight,
    },
    micBtnActive: {
        backgroundColor: Colors.light.accent,
    },
    inputField: {
        flex: 1,
        backgroundColor: Colors.light.bg,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: Platform.OS === "ios" ? 10 : 8,
        fontSize: FontSize.md,
        color: Colors.light.textPrimary,
        maxHeight: 100,
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
    },
    sendBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.light.accent,
        alignItems: "center",
        justifyContent: "center",
    },
    sendBtnDisabled: {
        backgroundColor: Colors.light.bg,
    },

    // Carousel card
    carouselCard: {
        backgroundColor: Colors.light.bgCard,
        borderRadius: Radius.lg,
        padding: 16,
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
        ...Shadows.sm,
        gap: 10,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 8,
    },
    cardTitle: {
        fontSize: FontSize.md,
        fontWeight: "700",
        color: Colors.light.textPrimary,
        flex: 1,
        lineHeight: 20,
    },
    cardTitleInput: {
        fontSize: FontSize.md,
        fontWeight: "700",
        color: Colors.light.textPrimary,
        flex: 1,
        lineHeight: 20,
        backgroundColor: Colors.light.bg,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    addOneBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    cardNotes: {
        fontSize: FontSize.sm,
        color: Colors.light.textSecondary,
        lineHeight: 18,
    },
    cardNotesInput: {
        fontSize: FontSize.sm,
        color: Colors.light.textSecondary,
        lineHeight: 18,
        backgroundColor: Colors.light.bg,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
        paddingHorizontal: 10,
        paddingVertical: 6,
        minHeight: 60,
    },
    // Priority picker
    priorityRow: {
        gap: 4,
    },
    fieldLabel: {
        fontSize: 11,
        fontWeight: "600",
        color: Colors.light.textTertiary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    priorityPills: {
        flexDirection: "row",
        gap: 6,
    },
    priorityPill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: Radius.full,
        borderWidth: 1,
    },
    priorityPillText: {
        fontSize: 11,
        fontWeight: "700",
    },
    // Date/time row
    dateTimeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    dateTimeItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: Colors.light.bg,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
    },
    dateTimeText: {
        fontSize: 13,
        fontWeight: "600",
        color: Colors.light.textPrimary,
    },
    dateTimePlaceholder: {
        fontSize: 13,
        color: Colors.light.accent,
        fontWeight: "600",
    },
    clearBtn: {
        marginLeft: -4,
    },
    inlinePicker: {
        borderTopWidth: 1,
        borderTopColor: Colors.light.borderLight,
        paddingTop: 4,
        alignItems: "center",
    },
    pickerDoneBtn: {
        alignSelf: "flex-end",
        paddingHorizontal: 16,
        paddingVertical: 6,
        backgroundColor: Colors.light.accent,
        borderRadius: Radius.md,
        marginBottom: 4,
    },
    pickerDoneText: {
        color: "#fff",
        fontSize: FontSize.sm,
        fontWeight: "700",
    },
    cardMeta: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 6,
        marginTop: 2,
    },
    cardPill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: Radius.full,
        borderWidth: 1,
    },
    cardPillText: {
        fontSize: 11,
        fontWeight: "700",
    },
    cardDateRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    cardDateText: {
        fontSize: 11,
        color: Colors.light.textTertiary,
        fontWeight: "500",
    },
    guessedText: {
        fontSize: 10,
        color: Colors.light.textTertiary,
        fontStyle: "italic",
    },

    // Carousel navigation
    carouselNav: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        paddingVertical: 8,
    },
    arrowBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: Colors.light.bg,
        alignItems: "center",
        justifyContent: "center",
    },
    arrowDisabled: {
        opacity: 0.4,
    },
    dots: {
        flexDirection: "row",
        gap: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.light.borderLight,
    },
    dotActive: {
        backgroundColor: Colors.light.accent,
        width: 18,
        borderRadius: 3,
    },

    // Add All
    addAllBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        backgroundColor: Colors.light.accent,
        borderRadius: Radius.lg,
        paddingVertical: 10,
        marginTop: 4,
    },
    addAllText: {
        color: "#fff",
        fontSize: FontSize.sm,
        fontWeight: "700",
    },
});
