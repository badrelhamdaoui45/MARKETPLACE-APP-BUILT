import { supabase } from "./supabase";

/**
 * Detects bib numbers in an image using a secure Supabase Edge Function.
 * This ensures the Gemini API key is never exposed to the client.
 */
export const detectBibs = async (imageUrl) => {
    try {
        if (!imageUrl) return [];

        const { data, error } = await supabase.functions.invoke('gemini-ai', {
            body: {
                action: 'detect-bibs',
                payload: { imageUrl }
            }
        });

        if (error) throw error;
        return data.bibs || [];
    } catch (error) {
        console.error("Error in Gemini Bib Detection:", error);
        return [];
    }
};

/**
 * Tests the Gemini API connection via a secure Supabase Edge Function.
 */
export const testGeminiAPI = async () => {
    try {
        const { data, error } = await supabase.functions.invoke('gemini-ai', {
            body: {
                action: 'test-connection',
                payload: {}
            }
        });

        if (error) throw error;
        return { success: true, message: data.message };
    } catch (error) {
        console.error("Gemini Test Error:", error);

        let message = error.message || "Failed to connect to Gemini via Edge Function";
        if (error?.context?.json) {
            try {
                const body = await error.context.json();
                console.error("Gemini Error Body:", body);
                message = body.error || message;
            } catch (e) { /* ignore */ }
        }

        return { success: false, message };
    }
};
