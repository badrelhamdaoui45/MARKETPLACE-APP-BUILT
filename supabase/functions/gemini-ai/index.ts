import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { encode } from "https://deno.land/std@0.168.0/encoding/base64.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { action, payload } = await req.json()

        // Authentication is handled at the gateway level via verify_jwt: true
        // We can still extract the user if needed, but for now we'll just proceed
        // to ensure the function is accessible to authenticated users.

        const geminiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('OPENROUTER_API_KEY')

        if (!geminiKey) {
            return new Response(
                JSON.stringify({ error: 'GEMINI_API_KEY is not set' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            )
        }

        // Helper to query Gemini with retries and fallback models
        const callGeminiWithRetryAndFallback = async (parts: any[], apiKey: string) => {
            const models = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-3.5-flash"];
            let lastError: any = null;

            for (const model of models) {
                const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
                const maxRetries = 3;
                
                for (let attempt = 0; attempt < maxRetries; attempt++) {
                    try {
                        console.log(`[Gemini Request] Model: ${model}, Attempt: ${attempt + 1}/${maxRetries}`);
                        const response = await fetch(url, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                contents: [{ role: "user", parts }]
                            })
                        });

                        const data = await response.json();
                        
                        if (response.ok) {
                            return data;
                        }

                        console.warn(`[Gemini Warning] Model ${model} returned non-ok status: ${response.status}. Error body:`, JSON.stringify(data));
                        
                        const errorMsg = data.error?.message || "";
                        const isDemandError = errorMsg.toLowerCase().includes("demand") || 
                                              errorMsg.toLowerCase().includes("overloaded") ||
                                              errorMsg.toLowerCase().includes("limit") ||
                                              errorMsg.toLowerCase().includes("resource") ||
                                              response.status === 429 || 
                                              response.status === 503;

                        if (isDemandError && attempt < maxRetries - 1) {
                            const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
                            console.log(`[Gemini Retry] High demand or rate limit. Retrying in ${delay.toFixed(0)}ms...`);
                            await new Promise(r => setTimeout(r, delay));
                            continue;
                        }

                        throw new Error(errorMsg || `Gemini Error: ${response.status}`);
                    } catch (err) {
                        lastError = err;
                        console.error(`[Gemini Error] Model ${model} attempt ${attempt + 1} failed:`, err.message);
                        if (attempt < maxRetries - 1) {
                            const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
                            await new Promise(r => setTimeout(r, delay));
                        }
                    }
                }
            }

            throw lastError || new Error("Gemini API call failed all models and retries");
        };

        // Helper function to fetch and convert image to base64
        const urlToBase64 = async (url: string) => {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
            const buffer = await response.arrayBuffer();
            const mimeType = response.headers.get('content-type') || 'image/jpeg';
            const data = encode(new Uint8Array(buffer));
            return { mimeType, data };
        };

        if (action === 'test-connection') {
            const data = await callGeminiWithRetryAndFallback(
                [{ text: "Say 'Connection Successful via Gemini API'" }],
                geminiKey
            );

            const message = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response content"
            return new Response(
                JSON.stringify({ success: true, message: message.trim() }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (action === 'detect-bibs') {
            const { imageUrls } = payload
            if (!imageUrls || !Array.isArray(imageUrls)) {
                return new Response(
                    JSON.stringify({ error: 'imageUrls array is required' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }

            console.log(`[Gemini Batch] processing ${imageUrls.length} images...`)

            const parts = []
            parts.push({
                text: `Identify all athlete bib numbers (race numbers) visible in these images. 
                Follow these strict rules:
                1. Return a JSON object where keys are the 0-indexed position of the image in the provided list.
                2. For each key, the value should be an array of strings (the bib numbers found).
                3. If no numbers are found, return an empty array [].
                4. Do not include any other text or markers.
                5. Return valid JSON only.
                
                Example output format:
                {
                  "0": ["123", "456"],
                  "1": [],
                  "2": ["789"]
                }`
            })

            // Fetch all images in parallel for speed
            const imageResults = await Promise.all(imageUrls.map((url: string) => urlToBase64(url)));
            for (const imgResult of imageResults) {
                parts.push({
                    inline_data: {
                        mime_type: imgResult.mimeType,
                        data: imgResult.data
                    }
                });
            }

            const data = await callGeminiWithRetryAndFallback(parts, geminiKey);

            let text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "{}"

            // Handle optional markdown wrapping in AI response
            if (text.startsWith('```json')) {
                text = text.replace(/^```json/, '').replace(/```$/, '').trim()
            } else if (text.startsWith('```')) {
                text = text.replace(/^```/, '').replace(/```$/, '').trim()
            }

            try {
                const bibMapping = JSON.parse(text)
                return new Response(JSON.stringify({ results: bibMapping }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                })
            } catch (err) {
                console.error("Failed to parse AI JSON output:", text)
                throw new Error("AI returned invalid JSON format")
            }
        }

        if (action === 'list-models') {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${geminiKey}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" }
            })
            const data = await response.json()
            return new Response(JSON.stringify({ results: data }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        if (action === 'detect-runners') {
            const { imageUrl } = payload
            if (!imageUrl) {
                return new Response(
                    JSON.stringify({ error: 'imageUrl is required' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }

            console.log(`[Gemini Runner Detection] processing image: ${imageUrl.substring(0, 50)}...`)

            const parts = []
            parts.push({
                text: "Analyze this image of runners. Detect all visible runners. For each runner, find their face and their bib number. Return the bounding box of their face as [ymin, xmin, ymax, xmax] where each value is an integer between 0 and 1000 representing the relative position. If a bib number is not clearly visible, use 'Unknown'. Ensure you associate the correct bib number with the correct face."
            })

            const { mimeType, data: base64Data } = await urlToBase64(imageUrl);
            parts.push({
                inline_data: {
                    mime_type: mimeType,
                    data: base64Data
                }
            })

            const data = await callGeminiWithRetryAndFallback(parts, geminiKey);

            let text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "[]"

            if (text.startsWith('```json')) {
                text = text.replace(/^```json/, '').replace(/```$/, '').trim()
            } else if (text.startsWith('```')) {
                text = text.replace(/^```/, '').replace(/```$/, '').trim()
            }

            try {
                const results = JSON.parse(text)
                return new Response(JSON.stringify({ results }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                })
            } catch (err) {
                console.error("Failed to parse AI JSON output:", text)
                throw new Error("AI returned invalid JSON format")
            }
        }

        return new Response(
            JSON.stringify({ error: 'Invalid action' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )

    } catch (error) {
        console.error('Gemini Edge Function Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
