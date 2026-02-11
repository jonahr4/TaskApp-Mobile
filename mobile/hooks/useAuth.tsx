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
    signOut,
    type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useSync, type SyncScenario } from "@/hooks/useSync";

type AuthCtx = {
    user: User | null;
    loading: boolean;
    signInEmail: (email: string, password: string) => Promise<SyncScenario>;
    signUpEmail: (email: string, password: string) => Promise<SyncScenario>;
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
