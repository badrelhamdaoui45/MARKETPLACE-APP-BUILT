import { supabase } from "./supabase";
import { createClient } from '@supabase/supabase-js';

/**
 * Detects bib numbers in multiple images using a single call to the Edge Function.
 */
export const detectBibsBatch = async (imageUrls) => {
    try {
        if (!imageUrls || imageUrls.length === 0) return {};

        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !session.access_token) {
            console.error("No active session found");
            return {};
        }

        console.log(`[detectBibsBatch] Calling Gemini for batch of ${imageUrls.length} images...`);

        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-ai`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                action: 'detect-bibs',
                payload: { imageUrls }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Gemini Detection Error Body:", data);
            throw new Error(data.error || `HTTP ${response.status}`);
        }

        return data.results || {};
    } catch (error) {
        console.error("Error in Gemini Batch Detection:", error);
        throw error;
    }
};

/**
 * Detects bib numbers in an image using a secure Supabase Edge Function.
 * @deprecated Use detectBibsBatch for better quota management.
 */
export const detectBibs = async (imageUrl) => {
    const results = await detectBibsBatch([imageUrl]);
    return results["0"] || [];
};

/**
 * Tests the Gemini API connection via a secure Supabase Edge Function.
 * No authentication required for test-connection action.
 * Uses direct fetch to ensure no JWT is attached by the Supabase SDK.
 */
export const testGeminiAPI = async () => {
    try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-ai`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
            },
            body: JSON.stringify({
                action: 'test-connection',
                payload: {}
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `HTTP ${response.status}`);
        }

        return { success: true, message: data.message };
    } catch (error) {
        console.error("Gemini Test Error:", error);
        return {
            success: false,
            message: error.message || "Failed to connect to Gemini via Edge Function"
        };
    }
};

/**
 * Detects and groups faces in multiple images using a single call to the Edge Function.
 */
export const detectFacesBatch = async (imageUrls) => {
    try {
        if (!imageUrls || imageUrls.length === 0) return {};

        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !session.access_token) {
            console.error("No active session found");
            return {};
        }

        console.log(`[detectFacesBatch] Calling Gemini Faces for batch of ${imageUrls.length} images...`);

        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-faces`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                action: 'detect-faces',
                payload: { imageUrls }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Gemini Face Detection Error Body:", data);
            throw new Error(data.error || `HTTP ${response.status}`);
        }

        return data.results || {};
    } catch (error) {
        console.error("Error in Gemini Batch Face Detection:", error);
        throw error;
    }
};
