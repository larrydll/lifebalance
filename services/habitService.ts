import { supabase, DbHabit, DbHabitCompletion } from '../lib/supabaseClient';
import { DailyHabit } from '../types';

// Save habits derived from action plan
export const saveHabits = async (habits: DailyHabit[]): Promise<{ success: boolean; error: string | null }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: 'User not authenticated' };
    }

    // Delete existing habits for this user
    await supabase
        .from('habits')
        .delete()
        .eq('user_id', user.id);

    // Insert new habits
    const habitData = habits.map(h => ({
        user_id: user.id,
        title: h.title,
        subtitle: h.subtitle,
        icon: h.icon,
        category: h.category,
        color_class: h.colorClass,
    }));

    const { error } = await supabase
        .from('habits')
        .insert(habitData);

    if (error) {
        console.error('Error saving habits:', error);
        return { success: false, error: error.message };
    }

    return { success: true, error: null };
};

// Load user's habits with today's completion status
export const loadHabits = async (): Promise<{ habits: DailyHabit[]; error: string | null }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { habits: [], error: 'User not authenticated' };
    }

    // Get habits
    const { data: habitsData, error: habitsError } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id);

    if (habitsError) {
        console.error('Error loading habits:', habitsError);
        return { habits: [], error: habitsError.message };
    }

    if (!habitsData || habitsData.length === 0) {
        return { habits: [], error: null };
    }

    // Get today's completions
    const today = new Date().toISOString().split('T')[0];
    const { data: completionsData } = await supabase
        .from('habit_completions')
        .select('habit_id')
        .eq('user_id', user.id)
        .eq('completed_at', today);

    const completedHabitIds = new Set((completionsData || []).map((c: { habit_id: string }) => c.habit_id));

    // Map to DailyHabit format
    const habits: DailyHabit[] = habitsData.map((h: DbHabit) => ({
        id: h.id,
        title: h.title,
        subtitle: h.subtitle || '',
        icon: h.icon || 'bolt',
        completed: completedHabitIds.has(h.id),
        category: h.category,
        colorClass: h.color_class || 'bg-primary/10 text-primary',
    }));

    return { habits, error: null };
};

// Toggle habit completion for today
export const toggleHabitCompletion = async (habitId: string): Promise<{ completed: boolean; error: string | null }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { completed: false, error: 'User not authenticated' };
    }

    const today = new Date().toISOString().split('T')[0];

    // Check if completion exists
    const { data: existing } = await supabase
        .from('habit_completions')
        .select('id')
        .eq('habit_id', habitId)
        .eq('completed_at', today)
        .single();

    if (existing) {
        // Remove completion
        const { error } = await supabase
            .from('habit_completions')
            .delete()
            .eq('id', existing.id);

        if (error) {
            console.error('Error removing completion:', error);
            return { completed: true, error: error.message };
        }
        return { completed: false, error: null };
    } else {
        // Add completion
        const { error } = await supabase
            .from('habit_completions')
            .insert({
                habit_id: habitId,
                user_id: user.id,
                completed_at: today,
            });

        if (error) {
            console.error('Error adding completion:', error);
            return { completed: false, error: error.message };
        }
        return { completed: true, error: null };
    }
};

// Get habit completions for a date range
export const getHabitCompletions = async (
    startDate: string,
    endDate: string
): Promise<{ completions: DbHabitCompletion[]; error: string | null }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { completions: [], error: 'User not authenticated' };
    }

    const { data, error } = await supabase
        .from('habit_completions')
        .select('*')
        .eq('user_id', user.id)
        .gte('completed_at', startDate)
        .lte('completed_at', endDate);

    if (error) {
        console.error('Error loading completions:', error);
        return { completions: [], error: error.message };
    }

    return { completions: data || [], error: null };
};

// Calculate user's current streak
export const calculateStreak = async (): Promise<{ streak: number; error: string | null }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { streak: 0, error: 'User not authenticated' };
    }

    // Get completions for the last 90 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);

    const { data, error } = await supabase
        .from('habit_completions')
        .select('completed_at')
        .eq('user_id', user.id)
        .gte('completed_at', startDate.toISOString().split('T')[0])
        .order('completed_at', { ascending: false });

    if (error) {
        console.error('Error calculating streak:', error);
        return { streak: 0, error: error.message };
    }

    if (!data || data.length === 0) {
        return { streak: 0, error: null };
    }

    // Get unique dates with completions
    const completedDates = [...new Set(data.map((c: { completed_at: string }) => c.completed_at))];

    // Calculate streak
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < completedDates.length; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        const checkDateStr = checkDate.toISOString().split('T')[0];

        if (completedDates.includes(checkDateStr)) {
            streak++;
        } else if (i > 0) {
            // Break streak if not today and missing
            break;
        }
    }

    // Update profile streak
    await supabase
        .from('profiles')
        .update({ streak_days: streak })
        .eq('id', user.id);

    return { streak, error: null };
};
