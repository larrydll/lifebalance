import { supabase } from '../lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

export interface AuthUser {
    id: string;
    email: string | null;
}

// Sign up with email and password
export const signUp = async (email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        return { user: null, error: error.message };
    }

    return {
        user: data.user ? { id: data.user.id, email: data.user.email ?? null } : null,
        error: null
    };
};

// Sign in with email and password
export const signIn = async (email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return { user: null, error: error.message };
    }

    return {
        user: data.user ? { id: data.user.id, email: data.user.email ?? null } : null,
        error: null
    };
};

// Sign out
export const signOut = async (): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signOut();
    return { error: error?.message ?? null };
};

// Get current user
export const getCurrentUser = async (): Promise<AuthUser | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    return { id: user.id, email: user.email ?? null };
};

// Get current session
export const getSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
};

// Subscribe to auth state changes
export const onAuthStateChange = (callback: (user: AuthUser | null) => void) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
            callback({ id: session.user.id, email: session.user.email ?? null });
        } else {
            callback(null);
        }
    });

    return () => subscription.unsubscribe();
};
