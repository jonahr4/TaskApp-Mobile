import { useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Pressable,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { Colors, Spacing, Radius, FontSize, Shadows } from "@/lib/theme";
import { triggerOnboarding } from "@/app/_layout";
import { CalendarFeedSheet } from "@/components/CalendarFeedSheet";
import { NotificationSettingsSheet } from "@/components/NotificationSettingsSheet";

type Props = {
    title: string;
};

export default function ScreenHeader({ title }: Props) {
    const { user, logOut } = useAuth();
    const router = useRouter();
    const [menuOpen, setMenuOpen] = useState(false);
    const [calFeedOpen, setCalFeedOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);

    const close = useCallback(() => setMenuOpen(false), []);

    return (
        <>
            {/* Header bar */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{title}</Text>
                <TouchableOpacity
                    onPress={() => setMenuOpen(!menuOpen)}
                    style={styles.profileBtn}
                >
                    <View style={[
                        styles.profileCircle,
                        user && styles.profileCircleActive,
                    ]}>
                        <Ionicons
                            name={user ? "person" : "person-outline"}
                            size={16}
                            color={user ? "#fff" : Colors.light.textTertiary}
                        />
                    </View>
                    {!user && (
                        <View style={styles.alertBadge}>
                            <Text style={styles.alertBadgeText}>!</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Account dropdown */}
            {menuOpen && (
                <>
                    <Pressable style={styles.backdrop} onPress={close} />
                    <View style={styles.dropdown}>
                        {/* Stats */}
                        <TouchableOpacity
                            style={styles.menuBtn}
                            onPress={() => { close(); router.push("/(tabs)/stats"); }}
                            activeOpacity={0.7}
                        >
                            <View style={styles.menuIconWrap}>
                                <Ionicons name="stats-chart-outline" size={16} color={Colors.light.textSecondary} />
                            </View>
                            <Text style={styles.menuBtnText}>View Stats</Text>
                        </TouchableOpacity>

                        {/* Calendar Feed */}
                        {user && (
                            <TouchableOpacity
                                style={styles.menuBtn}
                                onPress={() => { close(); setCalFeedOpen(true); }}
                                activeOpacity={0.7}
                            >
                                <View style={styles.menuIconWrap}>
                                    <Ionicons name="calendar-outline" size={16} color={Colors.light.textSecondary} />
                                </View>
                                <Text style={styles.menuBtnText}>Calendar Feed</Text>
                            </TouchableOpacity>
                        )}

                        {/* Notification Settings */}
                        <TouchableOpacity
                            style={styles.menuBtn}
                            onPress={() => { close(); setNotifOpen(true); }}
                            activeOpacity={0.7}
                        >
                            <View style={styles.menuIconWrap}>
                                <Ionicons name="notifications-outline" size={16} color={Colors.light.textSecondary} />
                            </View>
                            <Text style={styles.menuBtnText}>Settings</Text>
                        </TouchableOpacity>

                        {/* Onboarding */}
                        <TouchableOpacity
                            style={styles.menuBtn}
                            onPress={() => { close(); triggerOnboarding(); }}
                            activeOpacity={0.7}
                        >
                            <View style={styles.menuIconWrap}>
                                <Ionicons name="help-circle-outline" size={16} color={Colors.light.textSecondary} />
                            </View>
                            <Text style={styles.menuBtnText}>Learn More</Text>
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        {user ? (
                            <>
                                <Text style={styles.email} numberOfLines={1}>
                                    {user.email}
                                </Text>
                                <TouchableOpacity
                                    style={styles.menuBtn}
                                    onPress={() => { close(); logOut(); }}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.menuIconWrap, { backgroundColor: "rgba(239,68,68,0.08)" }]}>
                                        <Ionicons name="log-out-outline" size={16} color={Colors.light.danger} />
                                    </View>
                                    <Text style={[styles.menuBtnText, { color: Colors.light.danger }]}>Sign Out</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <View style={styles.message}>
                                    <Ionicons name="cloud-offline-outline" size={16} color={Colors.light.textTertiary} />
                                    <Text style={styles.messageText}>
                                        Sign in to sync across devices
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.signInBtn}
                                    onPress={() => { close(); router.push("/(auth)/login"); }}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="log-in-outline" size={16} color="#fff" />
                                    <Text style={styles.signInText}>Sign In</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </>
            )}

            {/* Sheets */}
            <CalendarFeedSheet visible={calFeedOpen} onClose={() => setCalFeedOpen(false)} />
            <NotificationSettingsSheet visible={notifOpen} onClose={() => setNotifOpen(false)} />
        </>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: Spacing.xl,
        paddingTop: Platform.OS === "ios" ? 62 : 48,
        paddingBottom: Spacing.lg,
        backgroundColor: Colors.light.bgCard,
        ...Shadows.sm,
    },
    headerTitle: {
        fontSize: FontSize.title,
        fontWeight: "800",
        color: Colors.light.textPrimary,
        letterSpacing: -0.5,
    },
    profileBtn: {
        position: "relative",
    },
    profileCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: Colors.light.bg,
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
        justifyContent: "center",
        alignItems: "center",
    },
    profileCircleActive: {
        backgroundColor: Colors.light.accent,
        borderColor: Colors.light.accent,
    },
    alertBadge: {
        position: "absolute",
        top: -2,
        right: -2,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: "#f59e0b",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: Colors.light.bgCard,
    },
    alertBadgeText: {
        fontSize: 10,
        fontWeight: "800",
        color: "#fff",
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 30,
    },
    dropdown: {
        position: "absolute",
        top: Platform.OS === "ios" ? 108 : 96,
        right: Spacing.lg,
        width: 248,
        backgroundColor: Colors.light.bgCard,
        borderRadius: Radius.xl,
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
        ...Shadows.xl,
        padding: Spacing.sm,
        zIndex: 31,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.light.borderLight,
        marginVertical: Spacing.xs,
        marginHorizontal: Spacing.sm,
    },
    email: {
        fontSize: FontSize.xs,
        color: Colors.light.textTertiary,
        marginBottom: Spacing.xs,
        paddingHorizontal: Spacing.md,
        marginTop: Spacing.xs,
    },
    menuBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        paddingVertical: 10,
        paddingHorizontal: Spacing.sm,
        borderRadius: Radius.md,
    },
    menuIconWrap: {
        width: 30,
        height: 30,
        borderRadius: Radius.sm,
        backgroundColor: Colors.light.bg,
        justifyContent: "center",
        alignItems: "center",
    },
    menuBtnText: {
        fontSize: FontSize.md,
        fontWeight: "500",
        color: Colors.light.textPrimary,
    },
    message: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        paddingHorizontal: Spacing.md,
        marginBottom: Spacing.md,
    },
    messageText: {
        fontSize: FontSize.sm,
        color: Colors.light.textSecondary,
        flex: 1,
    },
    signInBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: Spacing.sm,
        backgroundColor: Colors.light.accent,
        paddingVertical: 12,
        borderRadius: Radius.md,
        marginHorizontal: Spacing.sm,
        marginBottom: Spacing.xs,
    },
    signInText: {
        fontSize: FontSize.md,
        fontWeight: "600",
        color: "#fff",
    },
});
