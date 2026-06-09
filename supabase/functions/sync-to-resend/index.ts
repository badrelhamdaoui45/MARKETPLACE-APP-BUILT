import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function createProperty(key: string, type: 'string' | 'number', apiKey: string) {
    try {
        const res = await fetch('https://api.resend.com/contact-properties', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'User-Agent': 'RunCaptures/1.0'
            },
            body: JSON.stringify({ key, type })
        });
        const data = await res.json();
        console.log(`Provisioning property '${key}': Status ${res.status}`, data);
    } catch (e) {
        console.error(`Failed to provision property '${key}':`, e);
    }
}

serve(async (req) => {
    // Handle CORS preflight
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

        // Action-specific authorization check: Only allow admins to run connectivity test
        if (action === 'test-connection') {
            if (!user) {
                return new Response(JSON.stringify({ error: 'Forbidden: Admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            }
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

        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

        if (!RESEND_API_KEY) {
            return new Response(
                JSON.stringify({ error: 'RESEND_API_KEY is not set in Supabase Secrets' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            )
        }

        if (action === 'test-connection') {
            // Validate connection to Resend by fetching domains list
            const response = await fetch('https://api.resend.com/domains', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${RESEND_API_KEY}`,
                    'User-Agent': 'RunCaptures/1.0'
                }
            })

            if (response.ok) {
                // Connection successful! Proactively attempt to provision contact properties ('role' and 'user_id')
                // so that contact creation maps metadata correctly.
                await createProperty('role', 'string', RESEND_API_KEY);
                await createProperty('user_id', 'string', RESEND_API_KEY);

                return new Response(
                    JSON.stringify({ success: true, message: 'Connection to Resend.com successful!' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            } else {
                const data = await response.json().catch(() => ({ message: 'Could not parse response' }));
                return new Response(
                    JSON.stringify({ success: false, message: data.message || `Failed to connect to Resend (HTTP ${response.status})` }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }
        }

        if (action === 'sync-contact') {
            const { email, firstName, lastName, userGroup, userId } = payload

            if (!email) {
                return new Response(JSON.stringify({ error: 'Email is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            }

            // Try creating contact with custom properties
            let response = await fetch('https://api.resend.com/contacts', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${RESEND_API_KEY}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'RunCaptures/1.0'
                },
                body: JSON.stringify({
                    email,
                    firstName,
                    lastName,
                    unsubscribed: false,
                    properties: {
                        role: userGroup,
                        user_id: userId
                    }
                })
            })

            // Fallback: If custom properties cause an error (e.g. they aren't pre-created in Resend dashboard or API keys lack permissions),
            // retry contact creation without properties to guarantee user signups/logins are never blocked.
            if (!response.ok) {
                const errText = await response.text()
                console.warn(`Resend contact creation with properties failed (HTTP ${response.status}): ${errText}. Retrying without properties...`)

                response = await fetch('https://api.resend.com/contacts', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${RESEND_API_KEY}`,
                        'Content-Type': 'application/json',
                        'User-Agent': 'RunCaptures/1.0'
                    },
                    body: JSON.stringify({
                        email,
                        firstName,
                        lastName,
                        unsubscribed: false
                    })
                })
            }

            const data = await response.json().catch(() => ({}));

            if (response.ok) {
                return new Response(
                    JSON.stringify({ success: true, data }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            } else {
                return new Response(
                    JSON.stringify({ success: false, error: data.message || `Failed to sync contact to Resend (HTTP ${response.status})` }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }
        }

        return new Response(
            JSON.stringify({ error: 'Invalid action' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )

    } catch (error) {
        console.error('Resend Edge Function Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
