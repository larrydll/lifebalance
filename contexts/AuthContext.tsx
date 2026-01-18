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
        let isMounted = true;

        // Timeout to prevent infinite loading if Supabase connection fails
        const timeout = setTimeout(() => {
            if (isMounted && loading) {
                console.warn('Auth check timed out, proceeding without user');
                setLoading(false);
            }
        }, 3000);

        // Check current user on mount
        getCurrentUser()
            .then((currentUser) => {
                if (isMounted) {
                    setUser(currentUser);
                    setLoading(false);
                }
            })
            .catch((error) => {
                console.error('Error getting current user:', error);
                if (isMounted) {
                    setLoading(false);
                }
            });

        // Subscribe to auth state changes
        const unsubscribe = onAuthStateChange((authUser) => {
            if (isMounted) {
                setUser(authUser);
                setLoading(false);
            }
        });

        return () => {
            isMounted = false;
            clearTimeout(timeout);
            unsubscribe();
        };
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
