import { useState, useCallback, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Pressable,
    Platform,
    Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useColors, useTheme } from "@/hooks/useTheme";
import { Colors, Spacing, Radius, FontSize, Shadows } from "@/lib/theme";
import { triggerOnboarding } from "@/app/_layout";
import { CalendarFeedSheet } from "@/components/CalendarFeedSheet";
import { NotificationSettingsSheet } from "@/components/NotificationSettingsSheet";

type Props = {
    title: string;
};

function makeStyles(C: typeof Colors.light) {
    return StyleSheet.create({
        header: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: Spacing.xl,
            paddingTop: Platform.OS === "ios" ? 62 : 48,
            paddingBottom: Spacing.lg,
            backgroundColor: C.bgCard,
        },
        accentLine: {
            height: 2.5,
            backgroundColor: C.accent,
            opacity: 0.12,
        },
        headerTitle: {
            fontSize: FontSize.title,
            fontWeight: "800",
            color: C.textPrimary,
            letterSpacing: -0.5,
        },
        profileBtn: {
            position: "relative",
        },
        profileCircle: {
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: C.bg,
            borderWidth: 1,
            borderColor: C.borderLight,
            justifyContent: "center",
            alignItems: "center",
        },
        profileCircleActive: {
            backgroundColor: C.accent,
            borderColor: C.accent,
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
            borderColor: C.bgCard,
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
            backgroundColor: C.bgCard,
            borderRadius: Radius.xl,
            borderWidth: 1,
            borderColor: C.borderLight,
            ...Shadows.xl,
            padding: Spacing.sm,
            zIndex: 31,
        },
        divider: {
            height: 1,
            backgroundColor: C.borderLight,
            marginVertical: Spacing.xs,
            marginHorizontal: Spacing.sm,
        },
        email: {
            fontSize: FontSize.xs,
            color: C.textTertiary,
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
            backgroundColor: C.bg,
            justifyContent: "center",
            alignItems: "center",
        },
        menuBtnText: {
            fontSize: FontSize.md,
            fontWeight: "500",
            color: C.textPrimary,
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
            color: C.textSecondary,
            flex: 1,
        },
        signInBtn: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: Spacing.sm,
            backgroundColor: C.accent,
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
}

export default function ScreenHeader({ title }: Props) {
    const C = useColors();
    const { isDark } = useTheme();
    const { user, logOut, deleteAccount } = useAuth();
    const router = useRouter();
    const [menuOpen, setMenuOpen] = useState(false);
    const [calFeedOpen, setCalFeedOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const close = useCallback(() => setMenuOpen(false), []);

    const handleDeleteAccount = useCallback(() => {
        Alert.alert(
            "Delete Account",
            "This will permanently delete your account and all your data. This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setDeleting(true);
                        try {
                            await deleteAccount();
                            close();
                        } catch (err: any) {
                            const msg = err?.code === "auth/requires-recent-login"
                                ? "For security, please sign out and sign back in, then try again."
                                : err?.message || "Failed to delete account.";
                            Alert.alert("Error", msg);
                        } finally {
                            setDeleting(false);
                        }
                    },
                },
            ]
        );
    }, [deleteAccount, close]);

    const styles = useMemo(() => makeStyles(C), [C]);

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
                            color={user ? "#fff" : C.textTertiary}
                        />
                    </View>
                    {!user && (
                        <View style={styles.alertBadge}>
                            <Text style={styles.alertBadgeText}>!</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Subtle accent line under header */}
            <View style={styles.accentLine} />

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
                                <Ionicons name="stats-chart-outline" size={16} color={C.textSecondary} />
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
                                    <Ionicons name="calendar-outline" size={16} color={C.textSecondary} />
                                </View>
                                <Text style={styles.menuBtnText}>Calendar Feed</Text>
                            </TouchableOpacity>
                        )}

                        {/* Appearance */}
                        <TouchableOpacity
                            style={styles.menuBtn}
                            onPress={() => { close(); router.push("/(tabs)/settings"); }}
                            activeOpacity={0.7}
                        >
                            <View style={styles.menuIconWrap}>
                                <Ionicons name={isDark ? "moon" : "sunny-outline"} size={16} color={C.textSecondary} />
                            </View>
                            <Text style={styles.menuBtnText}>Appearance</Text>
                        </TouchableOpacity>

                        {/* Notification Settings */}
                        <TouchableOpacity
                            style={styles.menuBtn}
                            onPress={() => { close(); setNotifOpen(true); }}
                            activeOpacity={0.7}
                        >
                            <View style={styles.menuIconWrap}>
                                <Ionicons name="notifications-outline" size={16} color={C.textSecondary} />
                            </View>
                            <Text style={styles.menuBtnText}>Notifications</Text>
                        </TouchableOpacity>

                        {/* Onboarding */}
                        <TouchableOpacity
                            style={styles.menuBtn}
                            onPress={() => { close(); triggerOnboarding(); }}
                            activeOpacity={0.7}
                        >
                            <View style={styles.menuIconWrap}>
                                <Ionicons name="help-circle-outline" size={16} color={C.textSecondary} />
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
                                        <Ionicons name="log-out-outline" size={16} color={C.danger} />
                                    </View>
                                    <Text style={[styles.menuBtnText, { color: C.danger }]}>Sign Out</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.menuBtn}
                                    onPress={handleDeleteAccount}
                                    disabled={deleting}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.menuIconWrap, { backgroundColor: "rgba(239,68,68,0.08)" }]}>
                                        <Ionicons name="trash-outline" size={16} color={C.danger} />
                                    </View>
                                    <Text style={[styles.menuBtnText, { color: C.danger }]}>
                                        {deleting ? "Deleting…" : "Delete Account"}
                                    </Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <View style={styles.message}>
                                    <Ionicons name="cloud-offline-outline" size={16} color={C.textTertiary} />
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
