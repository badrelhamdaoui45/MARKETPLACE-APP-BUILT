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

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // Action-specific authorization
        if (action === 'test-connection') {
            const { data: profile } = await supabaseClient.from('profiles').select('role').eq('id', user.id).single()
            if (profile?.role !== 'admin') {
                return new Response(JSON.stringify({ error: 'Forbidden: Admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            }
        }
        // --- END AUTH ---

        const apiKey = Deno.env.get('GEMINI_API_KEY')

        if (!apiKey) {
            return new Response(
                JSON.stringify({ error: 'GEMINI_API_KEY is not set' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            )
        }

        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" })

        if (action === 'test-connection') {
            const result = await model.generateContent("Say 'Connection Successful'")
            const responseText = result.response.text()
            return new Response(
                JSON.stringify({ success: true, message: responseText.trim() }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (action === 'detect-bibs') {
            const { imageUrl } = payload
            if (!imageUrl) {
                return new Response(
                    JSON.stringify({ error: 'imageUrl is required' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }

            const imageResponse = await fetch(imageUrl)
            const imageBuffer = await imageResponse.arrayBuffer()
            const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)))

            const prompt = `Identify all athlete bib numbers (race numbers) visible in this image. Return ONLY a comma-separated list of numbers found. If no numbers are found or it's unclear, return "none". Avoid any other text. Examples of good output: "123, 456" or "789" or "none".`

            const result = await model.generateContent([
                prompt,
                {
                    inlineData: {
                        data: base64Image,
                        mimeType: "image/jpeg"
                    }
                }
            ])

            const text = result.response.text().trim()
            if (text.toLowerCase() === "none") {
                return new Response(JSON.stringify({ bibs: [] }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                })
            }

            const bibs = text.split(',')
                .map(s => s.trim())
                .filter(s => s.length > 0 && !isNaN(s))

            return new Response(JSON.stringify({ bibs }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
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
