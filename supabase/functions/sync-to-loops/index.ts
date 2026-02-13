import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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
        const internalSecret = req.headers.get('X-Internal-Secret')
        const SERVICE_SECRET = Deno.env.get('INTERNAL_SYNC_SECRET')

        let isAuthorized = false
        let user = null

        if (internalSecret && SERVICE_SECRET && internalSecret === SERVICE_SECRET) {
            isAuthorized = true
        } else if (authHeader) {
            const supabaseClient = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_ANON_KEY') ?? '',
                { global: { headers: { Authorization: authHeader } } }
            )

            const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser()
            if (!authError && authUser) {
                user = authUser
                isAuthorized = true
            }
        }

        if (!isAuthorized) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // Action-specific authorization
        if (action === 'test-connection') {
            if (!user) {
                return new Response(JSON.stringify({ error: 'Forbidden: Admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            }
            // Re-fetch profile to check role
            const supabaseClient = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            )
            const { data: profile } = await supabaseClient.from('profiles').select('role').eq('id', user.id).single()
            if (profile?.role !== 'admin') {
                return new Response(JSON.stringify({ error: 'Forbidden: Admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            }
        }
        // --- END AUTH ---

        const LOOPS_API_KEY = Deno.env.get('LOOPS_API_KEY')

        if (!LOOPS_API_KEY) {
            return new Response(
                JSON.stringify({ error: 'LOOPS_API_KEY is not set' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            )
        }

        if (action === 'test-connection') {
            // Simple validation call to Loops.so
            const response = await fetch('https://app.loops.so/api/v1/api-key', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${LOOPS_API_KEY}`
                }
            })

            const data = await response.json()

            if (response.ok && data.success) {
                return new Response(
                    JSON.stringify({ success: true, message: 'Connection to Loops.so successful!' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            } else {
                return new Response(
                    JSON.stringify({ success: false, message: data.message || 'Failed to connect to Loops.so' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }
        }

        if (action === 'sync-contact') {
            const { email, firstName, lastName, userGroup, userId } = payload

            if (!email) {
                return new Response(JSON.stringify({ error: 'Email is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            }

            const response = await fetch('https://app.loops.so/api/v1/contacts/create', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${LOOPS_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    firstName,
                    lastName,
                    userGroup,
                    userId,
                    source: 'Run Captures'
                })
            })

            const data = await response.json()

            if (response.ok) {
                return new Response(
                    JSON.stringify({ success: true, data }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            } else {
                return new Response(
                    JSON.stringify({ success: false, error: data.message || 'Failed to sync to Loops.so' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }
        }

        return new Response(
            JSON.stringify({ error: 'Invalid action' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )

    } catch (error) {
        console.error('Loops Edge Function Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
