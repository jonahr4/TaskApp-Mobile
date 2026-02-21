import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithCredential,
    GoogleAuthProvider,
    signOut,
    type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useSync, type SyncScenario } from "@/hooks/useSync";
import Constants, { ExecutionEnvironment } from "expo-constants";

// Google Sign-In only works in native builds, not Expo Go
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let _GoogleSignin: any = null;
function getGoogleSignin(): typeof import("@react-native-google-signin/google-signin").GoogleSignin {
    if (isExpoGo) {
        throw new Error("Google Sign-In is not available in Expo Go. Use a native EAS build.");
    }
    if (!_GoogleSignin) {
        _GoogleSignin = require("@react-native-google-signin/google-signin").GoogleSignin;
    }
    return _GoogleSignin;
}

type AuthCtx = {
    user: User | null;
    loading: boolean;
    signInEmail: (email: string, password: string) => Promise<SyncScenario>;
    signUpEmail: (email: string, password: string) => Promise<SyncScenario>;
    signInGoogle: () => Promise<SyncScenario>;
    logOut: () => Promise<void>;
    // Sync state
    syncScenario: SyncScenario | null;
    syncing: boolean;
    syncLocalTasks: any[];
    confirmMerge: (selectedIds?: string[]) => Promise<void>;
    discardLocal: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx>({
    user: null,
    loading: true,
    signInEmail: async () => "none",
    signUpEmail: async () => "none",
    signInGoogle: async () => "none",
    logOut: async () => { },
    syncScenario: null,
    syncing: false,
    syncLocalTasks: [],
    confirmMerge: async () => { },
    discardLocal: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const sync = useSync();

    useEffect(() => {
        // Configure Google Sign-In (skip in Expo Go)
        if (!isExpoGo) {
            try {
                const GS = getGoogleSignin();
                GS.configure({
                    iosClientId: "484524163355-276q8p8ahq8tnmsloocpkok8tps7hrio.apps.googleusercontent.com",
                    webClientId: "484524163355-qeuj19glrkke8c9rbn9kcegbgmrb8lqt.apps.googleusercontent.com",
                });
            } catch {
                // silently skip if module unavailable
            }
        }

        return onAuthStateChanged(auth, (u) => {
            setUser(u);
            setLoading(false);
        });
    }, []);

    const signInEmail = async (email: string, password: string): Promise<SyncScenario> => {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const scenario = await sync.onSignIn(cred.user);
        return scenario;
    };

    const signUpEmail = async (email: string, password: string): Promise<SyncScenario> => {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const scenario = await sync.onSignIn(cred.user);
        return scenario;
    };

    const signInGoogle = async (): Promise<SyncScenario> => {
        const GS = getGoogleSignin();
        await GS.hasPlayServices();
        const signInResult = await GS.signIn();
        const idToken = signInResult?.data?.idToken;
        if (!idToken) throw new Error("No ID token from Google Sign-In");
        const credential = GoogleAuthProvider.credential(idToken);
        const cred = await signInWithCredential(auth, credential);
        const scenario = await sync.onSignIn(cred.user);
        return scenario;
    };

    const logOut = async () => {
        await signOut(auth);
    };

    const confirmMerge = async (selectedIds?: string[]) => {
        if (user) {
            await sync.confirmMerge(user, selectedIds);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                signInEmail,
                signUpEmail,
                signInGoogle,
                logOut,
                syncScenario: sync.scenario,
                syncing: sync.syncing,
                syncLocalTasks: sync.localTasks,
                confirmMerge,
                discardLocal: sync.discardLocal,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
