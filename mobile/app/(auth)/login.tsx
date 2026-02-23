import { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { Colors, Spacing, Radius, FontSize, Shadows } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";

export default function LoginScreen() {
    const { signInEmail, signUpEmail, signInGoogle } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!email.trim() || !password.trim()) return;
        setError(null);
        setSubmitting(true);
        try {
            if (isSignUp) {
                await signUpEmail(email, password);
            } else {
                await signInEmail(email, password);
            }
            router.back();
        } catch (err: any) {
            const code = err?.code || "";
            if (code === "auth/user-not-found" || code === "auth/invalid-credential") {
                setError("Invalid email or password.");
            } else if (code === "auth/wrong-password") {
                setError("Invalid email or password.");
            } else if (code === "auth/email-already-in-use") {
                setError("An account with this email already exists.");
            } else if (code === "auth/weak-password") {
                setError("Password must be at least 6 characters.");
            } else if (code === "auth/invalid-email") {
                setError("Invalid email address.");
            } else {
                setError(err?.message || "Something went wrong.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setError(null);
        setSubmitting(true);
        try {
            await signInGoogle();
            router.back();
        } catch (err: any) {
            const msg = err?.message || "Google Sign-In failed.";
            // Don't show error for user cancellation
            if (!msg.includes("cancelled") && !msg.includes("canceled")) {
                setError(msg);
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            {/* Back Button */}
            <View style={styles.navBar}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="chevron-back" size={24} color={Colors.light.accent} />
                    <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {/* Logo & Branding */}
                <View style={styles.brandSection}>
                    <View style={styles.logoBox}>
                        <Ionicons name="checkbox" size={28} color="#fff" />
                    </View>
                    <Text style={styles.appName}>TaskApp</Text>
                    <Text style={styles.tagline}>
                        Your tasks, priorities, and schedule — in one place.
                    </Text>
                </View>

                {/* Feature Pills */}
                <View style={styles.featurePills}>
                    {[
                        { icon: "sparkles" as const, label: "AI Parsing" },
                        { icon: "grid" as const, label: "Matrix" },
                        { icon: "calendar" as const, label: "Calendar" },
                    ].map((f) => (
                        <View key={f.label} style={styles.pill}>
                            <Ionicons name={f.icon} size={12} color={Colors.light.accent} />
                            <Text style={styles.pillText}>{f.label}</Text>
                        </View>
                    ))}
                </View>

                {/* Auth Card */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>
                        {isSignUp ? "Create account" : "Sign in"}
                    </Text>
                    <Text style={styles.cardSubtitle}>
                        {isSignUp ? "Start organizing in seconds." : "Welcome back."}
                    </Text>

                    {/* Google Sign-In */}
                    <TouchableOpacity
                        style={styles.googleBtn}
                        activeOpacity={0.8}
                        onPress={handleGoogleSignIn}
                        disabled={submitting}
                        accessibilityLabel="Continue with Google"
                        accessibilityRole="button"
                    >
                        <Ionicons name="logo-google" size={18} color={Colors.light.textPrimary} />
                        <Text style={styles.googleBtnText}>Continue with Google</Text>
                    </TouchableOpacity>

                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <TextInput
                        style={styles.input}
                        placeholder="Email"
                        placeholderTextColor={Colors.light.textTertiary}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        accessibilityLabel="Email address"
                        textContentType="emailAddress"
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        placeholderTextColor={Colors.light.textTertiary}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        accessibilityLabel="Password"
                        textContentType="password"
                    />

                    {error && <Text style={styles.errorText}>{error}</Text>}

                    <TouchableOpacity
                        style={[styles.submitButton, submitting && styles.buttonDisabled]}
                        onPress={handleSubmit}
                        disabled={submitting}
                        activeOpacity={0.8}
                        accessibilityLabel={isSignUp ? "Create account" : "Sign in"}
                        accessibilityRole="button"
                    >
                        {submitting ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.submitText}>
                                {isSignUp ? "Create account" : "Sign in"}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => { setIsSignUp(!isSignUp); setError(null); }}
                        style={styles.toggleLink}
                    >
                        <Text style={styles.toggleText}>
                            {isSignUp ? "Already have an account? Sign in" : "No account? Create one"}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => Linking.openURL("https://the-task-app.vercel.app/privacy")}
                        style={styles.privacyLink}
                    >
                        <Text style={styles.privacyText}>Privacy Policy</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.bg,
    },
    navBar: {
        paddingTop: 56,
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.sm,
        backgroundColor: Colors.light.bg,
    },
    backBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 2,
    },
    backText: {
        fontSize: FontSize.md,
        color: Colors.light.accent,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: "center",
        padding: Spacing.xxl,
        paddingTop: 0,
    },
    brandSection: {
        alignItems: "center",
        marginBottom: Spacing.xxl,
    },
    logoBox: {
        width: 64,
        height: 64,
        borderRadius: Radius.lg,
        backgroundColor: Colors.light.accent,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: Spacing.lg,
        ...Shadows.md,
        shadowColor: Colors.light.accent,
        shadowOpacity: 0.3,
    },
    appName: {
        fontSize: 32,
        fontWeight: "800",
        color: Colors.light.textPrimary,
        letterSpacing: -0.5,
    },
    tagline: {
        fontSize: FontSize.md,
        color: Colors.light.textSecondary,
        textAlign: "center",
        marginTop: Spacing.sm,
        maxWidth: 280,
        lineHeight: 22,
    },
    featurePills: {
        flexDirection: "row",
        justifyContent: "center",
        gap: Spacing.sm,
        marginBottom: Spacing.xxxl,
    },
    pill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: Colors.light.accentLight,
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
        borderRadius: Radius.full,
    },
    pillText: {
        fontSize: FontSize.xs,
        color: Colors.light.accent,
        fontWeight: "600",
    },
    card: {
        backgroundColor: Colors.light.bgCard,
        borderRadius: Radius.xl,
        padding: Spacing.xxl,
        borderWidth: 0,
        ...Shadows.lg,
    },
    cardTitle: {
        fontSize: FontSize.xl,
        fontWeight: "700",
        color: Colors.light.textPrimary,
    },
    cardSubtitle: {
        fontSize: FontSize.sm,
        color: Colors.light.textTertiary,
        marginTop: 2,
        marginBottom: Spacing.lg,
    },
    googleBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: Spacing.sm,
        backgroundColor: Colors.light.bg,
        borderWidth: 1,
        borderColor: Colors.light.border,
        borderRadius: Radius.md,
        paddingVertical: 14,
    },
    googleBtnText: {
        fontSize: FontSize.md,
        fontWeight: "500",
        color: Colors.light.textPrimary,
    },
    divider: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: Spacing.lg,
        gap: Spacing.md,
    },
    dividerLine: {
        flex: 1,
        height: StyleSheet.hairlineWidth,
        backgroundColor: Colors.light.borderLight,
    },
    dividerText: {
        fontSize: FontSize.xs,
        color: Colors.light.textTertiary,
    },
    input: {
        backgroundColor: Colors.light.bg,
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: 14,
        fontSize: FontSize.md,
        color: Colors.light.textPrimary,
        marginBottom: Spacing.md,
    },
    errorText: {
        fontSize: FontSize.sm,
        color: Colors.light.danger,
        marginBottom: Spacing.sm,
    },
    submitButton: {
        backgroundColor: Colors.light.accent,
        paddingVertical: 16,
        borderRadius: Radius.md,
        alignItems: "center",
        marginTop: Spacing.md,
        ...Shadows.sm,
        shadowColor: Colors.light.accent,
        shadowOpacity: 0.25,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    submitText: {
        color: "#fff",
        fontSize: FontSize.md,
        fontWeight: "600",
    },
    toggleLink: {
        marginTop: Spacing.lg,
        alignItems: "center",
    },
    toggleText: {
        fontSize: FontSize.sm,
        color: Colors.light.textTertiary,
    },
    privacyLink: {
        marginTop: Spacing.lg,
        alignItems: "center",
    },
    privacyText: {
        fontSize: FontSize.xs,
        color: Colors.light.textTertiary,
        textDecorationLine: "underline",
    },
});
