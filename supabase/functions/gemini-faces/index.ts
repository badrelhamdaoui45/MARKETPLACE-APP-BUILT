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

        // --- AUTHENTICATION ---
        const authHeader = req.headers.get('Authorization')

        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

        const supabaseClient = createClient(
            supabaseUrl,
            supabaseAnonKey,
            {
                auth: {
                    persistSession: false,
                    detectSessionInUrl: false,
                    autoRefreshToken: false
                }
            }
        )

        // Extract token and pass explicitly to getUser
        const token = authHeader.replace(/^Bearer\s+/i, "");
        const { data, error: authError } = await supabaseClient.auth.getUser(token)
        const user = data?.user;

        if (authError || !user) {
            const debugInfo = {
                authHeaderStart: authHeader ? authHeader.substring(0, 10) : 'MISSING',
                tokenExtracted: !!token,
                userFound: !!user,
                authError: authError ? authError.message : 'No error object',
            };
            console.error("Auth Fail:", JSON.stringify(debugInfo));
            return new Response(JSON.stringify({
                error: `Unauthorized: ${authError?.message || 'Session missing'}`,
                debug: debugInfo
            }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        // --- END AUTH ---

        const geminiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('OPENROUTER_API_KEY')

        if (!geminiKey) {
            return new Response(
                JSON.stringify({ error: 'GEMINI_API_KEY is not set' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            )
        }

        const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${geminiKey}`
        const MODEL = "gemini-2.5-flash"

        // Helper function to fetch and convert image to base64
        const urlToBase64 = async (url: string) => {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
            const buffer = await response.arrayBuffer();
            const mimeType = response.headers.get('content-type') || 'image/jpeg';
            const data = encode(new Uint8Array(buffer));
            return { mimeType, data };
        };

        if (action === 'detect-faces') {
            const { imageUrls } = payload
            if (!imageUrls || !Array.isArray(imageUrls)) {
                return new Response(
                    JSON.stringify({ error: 'imageUrls array is required' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }

            console.log(`[Gemini Batch] Processing faces in ${imageUrls.length} images...`)

            const parts = []
            parts.push({
                text: `Analyze these images to detect, identify, and group every runner.
                
                YOUR GOAL: Create a single entry per person, grouping all their appearances across the batch.
                
                CLUSTERING LOGIC:
                1. PRIMARY IDENTIFIER: Bib Numbers (Race Numbers). If two people have the same bib number, they are the SAME PERSON. Group them together regardless of facial variation.
                2. SECONDARY IDENTIFIER: Facial Features. Use facial recognition to group people when bibs are hidden, blurry, or missing.
                3. TRANSITIVE GROUPING: If Person A in Image 1 (Bib 101) looks exactly like Person B in Image 2 (no bib), and Person B looks like Person C in Image 3 (Bib 101), they are all Person 101.
                
                STRICT RULES:
                - NO DUPLICATES: One person = One JSON key. Do not create "Person 1" and "Person 2" for the same individual.
                - BOXES: Provide accurate face bounding boxes [ymin, xmin, ymax, xmax] (normalized 0-1000).
                - BIB ASSIGNMENT: If you find a bib for a person in ANY image of the group, assign that bib number to the "bib" field for the entire group.
                
                Output JSON format:
                {
                  "Person 1": {
                    "bib": "123" (or null),
                    "appearances": [
                      { "image_index": 0, "box_2d": [ymin, xmin, ymax, xmax] },
                      { "image_index": 2, "box_2d": [ymin, xmin, ymax, xmax] }
                    ]
                  }
                }
                
                CRITICAL: Scan ALL images thoroughly. Return ONLY valid JSON.`
            })

            for (const url of imageUrls) {
                const { mimeType, data } = await urlToBase64(url);
                parts.push({
                    inline_data: {
                        mime_type: mimeType,
                        data: data
                    }
                })
            }

            const response = await fetch(GEMINI_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: [{ role: "user", parts }]
                })
            })

            const data = await response.json()
            if (!response.ok) {
                console.error("Gemini API Error:", data)
                throw new Error(data.error?.message || `Gemini Error: ${response.status}`)
            }

            let text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "{}"

            // Handle optional markdown wrapping in AI response
            if (text.startsWith('```json')) {
                text = text.replace(/^```json/, '').replace(/```$/, '').trim()
            } else if (text.startsWith('```')) {
                text = text.replace(/^```/, '').replace(/```$/, '').trim()
            }

            try {
                const faceMapping = JSON.parse(text)
                return new Response(JSON.stringify({ results: faceMapping }), {
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
