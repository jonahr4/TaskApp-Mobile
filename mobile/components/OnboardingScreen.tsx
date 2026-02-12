import { useState, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Animated,
    Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Colors, Spacing, Radius, FontSize } from "@/lib/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type OnboardingPage = {
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    iconBg: string;
    title: string;
    subtitle: string;
    bullets: string[];
};

const PAGES: OnboardingPage[] = [
    {
        icon: "checkbox-outline",
        iconColor: Colors.light.accent,
        iconBg: Colors.light.accentLight,
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
            "Subscribe per-group for color-coded events",
        ],
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
            "Customizable reminder timing — 5 min to 1 day before",
            "Choose which groups send notifications",
            "Daily summary to start your morning",
            "Location-based reminders coming soon",
        ],
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

export function OnboardingScreen({ visible, onDone }: Props) {
    const [currentPage, setCurrentPage] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;
    const scrollRef = useRef<Animated.FlatList>(null);
    const router = useRouter();
    const isLastPage = currentPage === PAGES.length - 1;

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
                                            i === currentPage && { backgroundColor: Colors.light.accent },
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.bg,
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
        color: Colors.light.textTertiary,
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
        color: Colors.light.textPrimary,
        textAlign: "center",
        letterSpacing: -0.5,
    },
    pageSubtitle: {
        fontSize: FontSize.md,
        color: Colors.light.textSecondary,
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
        color: Colors.light.textSecondary,
        lineHeight: 18,
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
        backgroundColor: Colors.light.textTertiary,
    },
    nextBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: Colors.light.accent,
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
        backgroundColor: Colors.light.accent,
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
        color: Colors.light.textTertiary,
        fontWeight: "500",
    },
});
