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

        // For test-connection, allow without strict auth (for admin testing)
        if (action !== 'test-connection') {
            if (!authHeader) {
                return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            }

            const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
            const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

            console.log(`[Auth Debug] URL: ${supabaseUrl.substring(0, 10)}..., Key: ${supabaseAnonKey.substring(0, 5)}...`);
            console.log(`[Auth Debug] Auth Header: ${authHeader ? authHeader.substring(0, 20) + '...' : 'MISSING'}`);

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
                    tokenStart: token ? token.substring(0, 5) : 'NONE',
                    userFound: !!user,
                    authError: authError ? authError.message : 'No error object',
                };
                console.error("Auth Fail:", JSON.stringify(debugInfo));
                return new Response(JSON.stringify({
                    error: `Unauthorized: ${authError?.message || 'Session missing'}`,
                    debug: debugInfo
                }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            }
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

        if (action === 'test-connection') {
            const response = await fetch(OPENROUTER_URL, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${openRouterKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://marketplace-app-built.vercel.app",
                    "X-Title": "Bib Detection App"
                },
                body: JSON.stringify({
                    model: MODEL,
                    messages: [{ role: "user", content: "Say 'Connection Successful via OpenRouter'" }]
                })
            })

            const data = await response.json()
            if (!response.ok) {
                console.error("OpenRouter Error:", data)
                throw new Error(data.error?.message || `OpenRouter Error: ${response.status}`)
            }

            const message = data.choices?.[0]?.message?.content || "No response content"
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

            console.log(`[OpenRouter Batch] processing ${imageUrls.length} images...`)

            // Prepare multimodal content for OpenRouter (OpenAI format)
            const content = []
            content.push({
                type: "text",
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
                const bibMapping = JSON.parse(text)
                return new Response(JSON.stringify({ results: bibMapping }), {
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
