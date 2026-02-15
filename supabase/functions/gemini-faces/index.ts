import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0"
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

        const openRouterKey = Deno.env.get('OPENROUTER_API_KEY') || Deno.env.get('GEMINI_API_KEY')

        if (!openRouterKey) {
            return new Response(
                JSON.stringify({ error: 'Neither OPENROUTER_API_KEY nor GEMINI_API_KEY is set' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            )
        }

        const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
        const MODEL = "google/gemini-2.0-flash-001" // High performance multimodal model

        if (action === 'detect-faces') {
            const { imageUrls } = payload
            if (!imageUrls || !Array.isArray(imageUrls)) {
                return new Response(
                    JSON.stringify({ error: 'imageUrls array is required' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }

            console.log(`[OpenRouter Batch] Processing faces in ${imageUrls.length} images...`)

            // Prepare multimodal content for OpenRouter (OpenAI format)
            const content = []
            content.push({
                type: "text",
                text: `Analyze these images to find and group faces of the same person.
                YOUR PRIMARY GOAL IS TO GROUP FACES OF THE SAME INDIVIDUAL ACROSS MULTIPLE IMAGES.
                
                Follow these strict rules:
                1. Detect all faces in all provided images.
                2. AGGRESSIVELY CLUSTER FACES: Compare every face with every other face. If two faces belong to the same person, they MUST be grouped under the same "Person X" key.
                3. Look for bib numbers (race numbers) on chests/shirts to help confirm identity, but rely primarily on facial features.
                4. For each unique person identified, list EVERY separate image they appear in.
                
                Output JSON format:
                {
                  "Person 1": {
                    "bib": "123" (or null),
                    "appearances": [
                      { "image_index": 0, "box_2d": [ymin, xmin, ymax, xmax] (normalized 0-1000) },
                      { "image_index": 3, "box_2d": [ymin, xmin, ymax, xmax] }
                    ]
                  }
                }
                
                CRITICAL: 
                - Do not create separate "Person" entries for the same individual. Group them!
                - Scan ALL images.
                - Return ONLY the valid JSON object.`
            })

            for (const url of imageUrls) {
                content.push({
                    type: "image_url",
                    image_url: {
                        url: url
                    }
                })
            }

            const response = await fetch(OPENROUTER_URL, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${openRouterKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: MODEL,
                    messages: [{ role: "user", content }],
                })
            })

            const data = await response.json()
            if (!response.ok) {
                console.error("OpenRouter API Error:", data)
                throw new Error(data.error?.message || `OpenRouter Error: ${response.status}`)
            }

            let text = data.choices?.[0]?.message?.content?.trim() || "{}"

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
        console.error('OpenRouter Edge Function Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
