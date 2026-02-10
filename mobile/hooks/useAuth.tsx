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

type AuthCtx = {
    user: User | null;
    loading: boolean;
    signInEmail: (email: string, password: string) => Promise<void>;
    signUpEmail: (email: string, password: string) => Promise<void>;
    logOut: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx>({
    user: null,
    loading: true,
    signInEmail: async () => { },
    signUpEmail: async () => { },
    logOut: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        return onAuthStateChanged(auth, (u) => {
            setUser(u);
            setLoading(false);
        });
    }, []);

    const signInEmail = async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password);
    };

    const signUpEmail = async (email: string, password: string) => {
        await createUserWithEmailAndPassword(auth, email, password);
    };

    const logOut = async () => {
        await signOut(auth);
    };

    return (
        <AuthContext.Provider value={{ user, loading, signInEmail, signUpEmail, logOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
