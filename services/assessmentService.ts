import { supabase, DbAssessment } from '../lib/supabaseClient';
import { Dimension } from '../types';
import { DIMENSIONS_INITIAL } from '../constants';

// Save or update user's dimension assessment
export const saveAssessment = async (dimensions: Dimension[]): Promise<{ success: boolean; error: string | null }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: 'User not authenticated' };
    }

    const assessments = dimensions.map(d => ({
        user_id: user.id,
        dimension_id: d.id,
        dimension_name: d.name,
        current_score: d.currentScore,
        target_score: d.targetScore,
    }));

    // Upsert (insert or update) assessments
    const { error } = await supabase
        .from('assessments')
        .upsert(assessments, {
            onConflict: 'user_id,dimension_id',
            ignoreDuplicates: false
        });

    if (error) {
        console.error('Error saving assessment:', error);
        return { success: false, error: error.message };
    }

    return { success: true, error: null };
};

// Load user's assessment
export const loadAssessment = async (): Promise<{ dimensions: Dimension[] | null; error: string | null }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { dimensions: null, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('user_id', user.id);

    if (error) {
        console.error('Error loading assessment:', error);
        return { dimensions: null, error: error.message };
    }

    if (!data || data.length === 0) {
        // Return initial dimensions if no saved data
        return { dimensions: DIMENSIONS_INITIAL, error: null };
    }

    // Map database records back to Dimension format
    const savedDimensions: Dimension[] = DIMENSIONS_INITIAL.map(initial => {
        const saved = data.find((d: DbAssessment) => d.dimension_id === initial.id);
        if (saved) {
            return {
                ...initial,
                currentScore: saved.current_score,
                targetScore: saved.target_score,
            };
        }
        return initial;
    });

    return { dimensions: savedDimensions, error: null };
};

// Get assessment history for trend analysis
export const getAssessmentHistory = async (): Promise<{ history: DbAssessment[]; error: string | null }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { history: [], error: 'User not authenticated' };
    }

    const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('user_id', user.id)
        .order('assessed_at', { ascending: false });

    if (error) {
        console.error('Error loading assessment history:', error);
        return { history: [], error: error.message };
    }

    return { history: data || [], error: null };
};
