import { supabase, DbActionPlan } from '../lib/supabaseClient';
import { ActionPlanItem } from '../types';

// Save generated action plan
export const savePlan = async (plan: ActionPlanItem[]): Promise<{ success: boolean; error: string | null }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: 'User not authenticated' };
    }

    // First delete existing plans for this user
    await supabase
        .from('action_plans')
        .delete()
        .eq('user_id', user.id);

    // Insert new plans
    const plans = plan.map(p => ({
        user_id: user.id,
        category: p.category,
        title: p.title,
        priority: p.priority,
        gap: p.gap,
        status: p.status,
        tasks: p.tasks,
        image_url: p.imageUrl,
    }));

    const { error } = await supabase
        .from('action_plans')
        .insert(plans);

    if (error) {
        console.error('Error saving plan:', error);
        return { success: false, error: error.message };
    }

    return { success: true, error: null };
};

// Load user's current action plan
export const loadPlan = async (): Promise<{ plan: ActionPlanItem[]; error: string | null }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { plan: [], error: 'User not authenticated' };
    }

    const { data, error } = await supabase
        .from('action_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('priority', { ascending: true });

    if (error) {
        console.error('Error loading plan:', error);
        return { plan: [], error: error.message };
    }

    if (!data || data.length === 0) {
        return { plan: [], error: null };
    }

    // Map database records to ActionPlanItem format
    const planItems: ActionPlanItem[] = data.map((p: DbActionPlan) => ({
        id: p.id,
        category: p.category,
        title: p.title,
        priority: p.priority,
        gap: p.gap,
        status: p.status as 'critical' | 'steady' | 'moderate',
        tasks: p.tasks,
        imageUrl: p.image_url || '',
    }));

    return { plan: planItems, error: null };
};

// Update plan item status
export const updatePlanStatus = async (
    planId: string,
    status: 'critical' | 'steady' | 'moderate'
): Promise<{ success: boolean; error: string | null }> => {
    const { error } = await supabase
        .from('action_plans')
        .update({ status })
        .eq('id', planId);

    if (error) {
        console.error('Error updating plan status:', error);
        return { success: false, error: error.message };
    }

    return { success: true, error: null };
};
