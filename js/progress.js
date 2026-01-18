// progress.js
// Supabase configuration
const SUPABASE_URL = 'https://txhfmfjdfkqwhprsvflf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4aGZtZmpkZmtxd2hwcnN2ZmxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzOTg1MDcsImV4cCI6MjA3MTk3NDUwN30.REFYNpqF7CXsh0muFWaWnSwg4cso9eCk4E0yq1BnB2A';

let supabase;

/**
 * Initialize Supabase client
 */
export function initSupabase() {
    if (typeof window.supabase === 'undefined') {
        console.error('Supabase client not loaded. Please include the Supabase CDN script.');
        return false;
    }
    
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return true;
}

/**
 * Mark an article as read/done
 * @param {string} articleId - The article ID to mark
 * @returns {Promise<boolean>} - Success status
 */
export async function markArticleAsRead(articleId) {
    if (!supabase) {
        console.error('Supabase not initialized');
        return false;
    }

    try {
        const { data, error } = await supabase
            .from('article_progress')
            .upsert({
                article_id: articleId,
                is_read: true,
                read_at: new Date().toISOString()
            }, {
                onConflict: 'article_id'
            });

        if (error) throw error;
        
        console.log(`Article ${articleId} marked as read`);
        return true;
    } catch (error) {
        console.error('Error marking article as read:', error);
        return false;
    }
}

/**
 * Toggle article read status
 * @param {string} articleId - The article ID to toggle
 * @returns {Promise<boolean>} - New read status
 */
export async function toggleArticleRead(articleId) {
    if (!supabase) {
        console.error('Supabase not initialized');
        return false;
    }

    try {
        // First, check current status
        const { data: existing, error: fetchError } = await supabase
            .from('article_progress')
            .select('is_read')
            .eq('article_id', articleId)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
            throw fetchError;
        }

        const newStatus = existing ? !existing.is_read : true;

        // Update or insert
        const { error: upsertError } = await supabase
            .from('article_progress')
            .upsert({
                article_id: articleId,
                is_read: newStatus,
                read_at: newStatus ? new Date().toISOString() : null
            }, {
                onConflict: 'article_id'
            });

        if (upsertError) throw upsertError;
        
        console.log(`Article ${articleId} toggled to ${newStatus ? 'read' : 'unread'}`);
        return newStatus;
    } catch (error) {
        console.error('Error toggling article status:', error);
        return false;
    }
}

/**
 * Check if an article is marked as read
 * @param {string} articleId - The article ID to check
 * @returns {Promise<boolean>} - Read status
 */
export async function isArticleRead(articleId) {
    if (!supabase) {
        console.error('Supabase not initialized');
        return false;
    }

    try {
        const { data, error } = await supabase
            .from('article_progress')
            .select('is_read')
            .eq('article_id', articleId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        
        return data?.is_read || false;
    } catch (error) {
        console.error('Error checking article status:', error);
        return false;
    }
}

/**
 * Get all read article IDs
 * @returns {Promise<string[]>} - Array of read article IDs
 */
export async function getReadArticles() {
    if (!supabase) {
        console.error('Supabase not initialized');
        return [];
    }

    try {
        const { data, error } = await supabase
            .from('article_progress')
            .select('article_id')
            .eq('is_read', true);

        if (error) throw error;
        
        return data.map(item => item.article_id);
    } catch (error) {
        console.error('Error fetching read articles:', error);
        return [];
    }
}

/**
 * Find the index of the first unread article
 * @param {Array} mediaLinks - Array of media objects with 'id' property
 * @returns {Promise<number>} - Index of first unread article, or 0 if all read
 */
export async function findFirstUnreadIndex(mediaLinks) {
    if (!supabase) {
        console.error('Supabase not initialized');
        return 0;
    }

    try {
        const readArticles = await getReadArticles();
        const readSet = new Set(readArticles);
        
        // Find first article not in the read set
        for (let i = 0; i < mediaLinks.length; i++) {
            if (!readSet.has(mediaLinks[i].id)) {
                return i;
            }
        }
        
        // All articles read, return 0
        return 0;
    } catch (error) {
        console.error('Error finding first unread:', error);
        return 0;
    }
}