import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser, getCurrentUser, onAuthStateChange, signIn, signUp, signOut } from '../services/authService';

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: string | null }>;
    signUp: (email: string, password: string) => Promise<{ error: string | null }>;
    signOut: () => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check current user on mount
        getCurrentUser().then((currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });

        // Subscribe to auth state changes
        const unsubscribe = onAuthStateChange((authUser) => {
            setUser(authUser);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const handleSignIn = async (email: string, password: string) => {
        const result = await signIn(email, password);
        if (result.user) {
            setUser(result.user);
        }
        return { error: result.error };
    };

    const handleSignUp = async (email: string, password: string) => {
        const result = await signUp(email, password);
        if (result.user) {
            setUser(result.user);
        }
        return { error: result.error };
    };

    const handleSignOut = async () => {
        const result = await signOut();
        if (!result.error) {
            setUser(null);
        }
        return result;
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            signIn: handleSignIn,
            signUp: handleSignUp,
            signOut: handleSignOut,
        }}>
            {children}
        </AuthContext.Provider>
    );
};
