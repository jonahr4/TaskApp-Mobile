import { useAuth } from "@/hooks/useAuth";
import { useColors } from "@/hooks/useTheme";
import { getOrCreateCalendarToken } from "@/lib/firestore";
import {
    loadSettings,
    requestPermissions,
    saveSettings,
    setupNotificationChannel
} from "@/lib/notifications";
import { Colors, FontSize, Radius } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Linking,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BASE_URL = "https://the-task-app.vercel.app";

type OnboardingPage = {
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    iconBg: string;
    title: string;
    subtitle: string;
    bullets: string[];
    /** Which interactive slot to render below the bullets */
    interactive?: "notifications" | "calendar";
};

const makePages = (C: typeof Colors.light): OnboardingPage[] => [
    {
        icon: "checkbox-outline",
        iconColor: C.accent,
        iconBg: C.accentLight,
        title: "Organize Your Tasks",
        subtitle: "All your tasks in one place",
        bullets: [
            "Create tasks with titles, notes, and due dates",
            "Organize into custom groups with colors",
            "Filter by status, sort by priority or date",
            "Swipe between groups with smooth cards",
        ],
    },
    {
        icon: "grid-outline",
        iconColor: "#ef4444",
        iconBg: "#fef2f2",
        title: "Eisenhower Matrix",
        subtitle: "Prioritize what matters most",
        bullets: [
            "Drag tasks into 4 quadrants: Do, Schedule, Delegate, Eliminate",
            "See urgent vs. important at a glance",
            "Visual priority indicators on every task",
            "Auto-urgent deadlines that shift tasks automatically",
        ],
    },
    {
        icon: "calendar-outline",
        iconColor: "#f59e0b",
        iconBg: "#fffbeb",
        title: "Calendar View",
        subtitle: "See your week and month ahead",
        bullets: [
            "Visual calendar with task dots on each day",
            "Tap any day to see tasks due",
            "Sync to Apple Calendar via iCal feed",
        ],
        interactive: "calendar",
    },
    {
        icon: "sparkles-outline",
        iconColor: "#8b5cf6",
        iconBg: "#f5f3ff",
        title: "AI-Powered Reminders",
        subtitle: "Type naturally, AI does the rest",
        bullets: [
            "\"Call the dentist Thursday at 2pm\"",
            "AI parses dates, times, and priorities",
            "Edit any field before creating",
            "Turn one sentence into multiple tasks",
        ],
    },
    {
        icon: "notifications-outline",
        iconColor: "#06b6d4",
        iconBg: "#ecfeff",
        title: "Smart Notifications",
        subtitle: "Never miss a deadline",
        bullets: [
            "Get reminders before tasks are due",
            "Daily summary each morning",
        ],
        interactive: "notifications",
    },
    {
        icon: "cloud-done-outline",
        iconColor: "#10b981",
        iconBg: "#ecfdf5",
        title: "Sync Across Devices",
        subtitle: "Sign in to never lose a task",
        bullets: [
            "Cloud sync keeps everything up to date",
            "Works offline — data saves locally",
            "Sign in to sync across phone and web",
            "Your data is always safe and private",
        ],
    },
];

type Props = {
    visible: boolean;
    onDone: () => void;
};

function makeStyles(C: typeof Colors.light) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: C.bg,
        },
        skipBtn: {
            position: "absolute",
            top: 60,
            right: 24,
            zIndex: 10,
            paddingHorizontal: 12,
            paddingVertical: 6,
        },
        skipText: {
            fontSize: FontSize.sm,
            fontWeight: "600",
            color: C.textTertiary,
        },
        // ── Page ──
        page: {
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 36,
            paddingBottom: 100,
        },
        iconCircle: {
            width: 100,
            height: 100,
            borderRadius: 50,
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 28,
        },
        pageTitle: {
            fontSize: 26,
            fontWeight: "800",
            color: C.textPrimary,
            textAlign: "center",
            letterSpacing: -0.5,
        },
        pageSubtitle: {
            fontSize: FontSize.md,
            color: C.textSecondary,
            textAlign: "center",
            marginTop: 6,
            marginBottom: 28,
        },
        bulletList: {
            alignSelf: "stretch",
            gap: 14,
        },
        bulletRow: {
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 10,
        },
        bulletDot: {
            width: 6,
            height: 6,
            borderRadius: 3,
            marginTop: 6,
        },
        bulletText: {
            flex: 1,
            fontSize: FontSize.sm,
            color: C.textSecondary,
            lineHeight: 18,
        },
        // ── Interactive action area ──
        actionArea: {
            alignSelf: "stretch",
            marginTop: 20,
            gap: 10,
        },
        actionBtn: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingVertical: 14,
            borderRadius: Radius.md,
        },
        actionBtnText: {
            color: "#fff",
            fontSize: FontSize.md,
            fontWeight: "700",
        },
        actionHint: {
            fontSize: FontSize.xs,
            color: C.textTertiary,
            textAlign: "center",
            lineHeight: 16,
        },
        successRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: "#ecfdf5",
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderRadius: Radius.md,
            borderWidth: 1,
            borderColor: "#a7f3d0",
        },
        successText: {
            flex: 1,
            fontSize: FontSize.xs,
            color: "#065f46",
            lineHeight: 16,
            fontWeight: "500",
        },
        // ── Bottom ──
        bottom: {
            paddingHorizontal: 36,
            paddingBottom: 50,
            gap: 24,
        },
        dotsRow: {
            flexDirection: "row",
            justifyContent: "center",
            gap: 10,
        },
        dot: {
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: C.textTertiary,
        },
        nextBtn: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            backgroundColor: C.accent,
            paddingVertical: 15,
            borderRadius: Radius.md,
        },
        nextBtnText: {
            color: "#fff",
            fontSize: FontSize.md,
            fontWeight: "700",
        },
        lastPageActions: {
            gap: 10,
        },
        signInBtn: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            backgroundColor: C.accent,
            paddingVertical: 15,
            borderRadius: Radius.md,
        },
        signInBtnText: {
            color: "#fff",
            fontSize: FontSize.md,
            fontWeight: "700",
        },
        continueBtn: {
            alignItems: "center",
            paddingVertical: 12,
        },
        continueBtnText: {
            fontSize: FontSize.sm,
            color: C.textTertiary,
            fontWeight: "500",
        },
    });
}

export function OnboardingScreen({ visible, onDone }: Props) {
    const C = useColors();
    const PAGES = useMemo(() => makePages(C), [C]);
    const [currentPage, setCurrentPage] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;
    const scrollRef = useRef<Animated.FlatList>(null);
    const router = useRouter();
    const isLastPage = currentPage === PAGES.length - 1;
    const styles = useMemo(() => makeStyles(C), [C]);

    // Notification setup state
    const [notifEnabled, setNotifEnabled] = useState(false);
    const [notifLoading, setNotifLoading] = useState(false);

    // Calendar feed state
    const { user } = useAuth();
    const [calLoading, setCalLoading] = useState(false);
    const [calDone, setCalDone] = useState(false);

    const goToPage = (index: number) => {
        scrollRef.current?.scrollToOffset({ offset: index * SCREEN_WIDTH, animated: true });
        setCurrentPage(index);
    };

    const handleNext = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (isLastPage) {
            onDone();
        } else {
            goToPage(currentPage + 1);
        }
    };

    const handleSignIn = () => {
        onDone();
        setTimeout(() => router.push("/(auth)/login"), 300);
    };

    const handleSkip = () => {
        onDone();
    };

    // ── Notification quick-setup ──────────────────────────────────────────

    const handleEnableNotifications = useCallback(async () => {
        setNotifLoading(true);
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            if (Platform.OS === "android") await setupNotificationChannel();
            const granted = await requestPermissions();
            if (!granted) {
                Alert.alert(
                    "Permission Required",
                    "Please enable notifications in your device Settings to receive reminders.",
                );
                setNotifLoading(false);
                return;
            }
            // Save enabled settings with sensible defaults
            const current = await loadSettings();
            const next = {
                ...current,
                enabled: true,
                reminderMinutesList: [15],
                allGroupsEnabled: true,
                dailySummaryEnabled: true,
                dailySummaryHour: 8,
                dailySummaryMinute: 0,
            };
            await saveSettings(next);
            setNotifEnabled(true);
        } catch {
            Alert.alert("Error", "Could not enable notifications.");
        }
        setNotifLoading(false);
    }, []);

    // ── Calendar feed quick-add ───────────────────────────────────────────

    const handleAddCalendar = useCallback(async () => {
        if (!user) {
            Alert.alert("Sign In Required", "You'll need to sign in first to use calendar sync. You can do this later from the Calendar tab.");
            return;
        }
        setCalLoading(true);
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const token = await getOrCreateCalendarToken(user.uid);
            const feedUrl = `${BASE_URL}/api/ical/${token}`;
            const webcalUrl = feedUrl.replace(/^https?:\/\//, "webcal://");
            const supported = await Linking.canOpenURL(webcalUrl);
            if (supported) {
                await Linking.openURL(webcalUrl);
            } else {
                await Linking.openURL(feedUrl);
            }
            setCalDone(true);
        } catch {
            Alert.alert("Error", "Could not generate calendar feed.");
        }
        setCalLoading(false);
    }, [user]);

    // ── Render helpers ────────────────────────────────────────────────────

    const renderNotificationActions = () => (
        <View style={styles.actionArea}>
            {notifEnabled ? (
                <View style={styles.successRow}>
                    <Ionicons name="checkmark-circle" size={22} color="#10b981" />
                    <Text style={styles.successText}>
                        Notifications enabled! 15-min reminders + daily summary at 8 AM.
                    </Text>
                </View>
            ) : (
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#06b6d4" }]}
                    onPress={handleEnableNotifications}
                    activeOpacity={0.85}
                    disabled={notifLoading}
                >
                    {notifLoading ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <>
                            <Ionicons name="notifications" size={18} color="#fff" />
                            <Text style={styles.actionBtnText}>Enable Reminders</Text>
                        </>
                    )}
                </TouchableOpacity>
            )}
            {!notifEnabled && (
                <Text style={styles.actionHint}>
                    You can customize timing and groups later in Settings
                </Text>
            )}
        </View>
    );

    const renderCalendarActions = () => (
        <View style={styles.actionArea}>
            {calDone ? (
                <View style={styles.successRow}>
                    <Ionicons name="checkmark-circle" size={22} color="#10b981" />
                    <Text style={styles.successText}>
                        Calendar feed opened! Check your Calendar app to confirm.
                    </Text>
                </View>
            ) : (
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#f59e0b" }]}
                    onPress={handleAddCalendar}
                    activeOpacity={0.85}
                    disabled={calLoading}
                >
                    {calLoading ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <>
                            <Ionicons name="calendar" size={18} color="#fff" />
                            <Text style={styles.actionBtnText}>Add All Tasks to Calendar</Text>
                        </>
                    )}
                </TouchableOpacity>
            )}
            <Text style={styles.actionHint}>
                {calDone
                    ? "You can add per-group feeds later from the Calendar tab"
                    : "You can always do this later from the Calendar tab"}
            </Text>
        </View>
    );

    const renderPage = ({ item, index }: { item: OnboardingPage; index: number }) => (
        <View style={[styles.page, { width: SCREEN_WIDTH }]}>
            {/* Icon */}
            <View style={[styles.iconCircle, { backgroundColor: item.iconBg }]}>
                <Ionicons name={item.icon} size={48} color={item.iconColor} />
            </View>

            {/* Title */}
            <Text style={styles.pageTitle}>{item.title}</Text>
            <Text style={styles.pageSubtitle}>{item.subtitle}</Text>

            {/* Bullets */}
            <View style={styles.bulletList}>
                {item.bullets.map((b, i) => (
                    <View key={i} style={styles.bulletRow}>
                        <View style={[styles.bulletDot, { backgroundColor: item.iconColor }]} />
                        <Text style={styles.bulletText}>{b}</Text>
                    </View>
                ))}
            </View>

            {/* Interactive actions */}
            {item.interactive === "notifications" && renderNotificationActions()}
            {item.interactive === "calendar" && renderCalendarActions()}
        </View>
    );

    return (
        <Modal visible={visible} animationType="fade" presentationStyle="fullScreen">
            <View style={styles.container}>
                {/* Skip button — top right */}
                <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
                    <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>

                {/* Pages */}
                <Animated.FlatList
                    ref={scrollRef}
                    data={PAGES}
                    renderItem={renderPage}
                    keyExtractor={(_, i) => String(i)}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    bounces={false}
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                        { useNativeDriver: false }
                    )}
                    onMomentumScrollEnd={(e) => {
                        const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                        setCurrentPage(idx);
                    }}
                    scrollEventThrottle={16}
                />

                {/* Bottom section */}
                <View style={styles.bottom}>
                    {/* Dots */}
                    <View style={styles.dotsRow}>
                        {PAGES.map((_, i) => {
                            const opacity = scrollX.interpolate({
                                inputRange: [(i - 1) * SCREEN_WIDTH, i * SCREEN_WIDTH, (i + 1) * SCREEN_WIDTH],
                                outputRange: [0.25, 1, 0.25],
                                extrapolate: "clamp",
                            });
                            const scale = scrollX.interpolate({
                                inputRange: [(i - 1) * SCREEN_WIDTH, i * SCREEN_WIDTH, (i + 1) * SCREEN_WIDTH],
                                outputRange: [1, 1.4, 1],
                                extrapolate: "clamp",
                            });
                            return (
                                <TouchableOpacity key={i} onPress={() => goToPage(i)} activeOpacity={0.7}>
                                    <Animated.View
                                        style={[
                                            styles.dot,
                                            { opacity, transform: [{ scale }] },
                                            i === currentPage && { backgroundColor: C.accent },
                                        ]}
                                    />
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* CTA buttons */}
                    {isLastPage ? (
                        <View style={styles.lastPageActions}>
                            <TouchableOpacity style={styles.signInBtn} onPress={handleSignIn} activeOpacity={0.85}>
                                <Ionicons name="log-in-outline" size={18} color="#fff" />
                                <Text style={styles.signInBtnText}>Sign In</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.continueBtn} onPress={handleSkip} activeOpacity={0.7}>
                                <Text style={styles.continueBtnText}>Continue without account</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
                            <Text style={styles.nextBtnText}>Next</Text>
                            <Ionicons name="arrow-forward" size={18} color="#fff" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Modal>
    );
}
