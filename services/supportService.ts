import { supabase } from '../lib/supabaseClient';

// Submit a support request
export const submitSupportRequest = async (
    contact: string,
    message: string
): Promise<{ success: boolean; error: string | null }> => {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
        .from('support_requests')
        .insert({
            user_id: user?.id || null,
            contact,
            message,
        });

    if (error) {
        console.error('Error submitting support request:', error);
        return { success: false, error: error.message };
    }

    return { success: true, error: null };
};

// Get user's support request history
export const getSupportRequests = async (): Promise<{
    requests: Array<{ id: string; contact: string; message: string; created_at: string }>;
    error: string | null
}> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { requests: [], error: 'User not authenticated' };
    }

    const { data, error } = await supabase
        .from('support_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error loading support requests:', error);
        return { requests: [], error: error.message };
    }

    return { requests: data || [], error: null };
};
