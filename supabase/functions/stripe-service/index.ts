import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.18.0?target=deno"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { action, payload } = await req.json()
        console.log(`Stripe Edge Function - Action: ${action}`)

        // Create a service role client for secure backend operations
        const serviceClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                    detectSessionInUrl: false
                }
            }
        )

        // --- AUTHENTICATION & AUTHORIZATION ---
        const authHeader = req.headers.get('Authorization')

        console.log(`Action: ${action}, Auth Header present: ${!!authHeader}`)

        // Skip auth for ping action (admin testing)
        if (action === 'ping') {
            return new Response(
                JSON.stringify({
                    message: 'pong',
                    timestamp: new Date().toISOString(),
                    status: 'Stripe backend is reachable'
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const isPublicAction = ['create-checkout-session', 'get-download-urls'].includes(action)

        if (!authHeader && !isPublicAction) {
            return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // Get user from JWT
        let user: any = null;
        if (authHeader) {
            const token = authHeader.replace(/^Bearer\s+/i, "")
            console.log(`Token received: ${token.substring(0, 15)}...`)

            // Try identifying with service client
            const { data: { user: authUser }, error: authError } = await serviceClient.auth.getUser(token)

            if (authError || !authUser) {
                console.error('Auth User Check Failed:', JSON.stringify(authError));

                // Public-facing actions
                const isPublicAction = ['create-checkout-session', 'get-download-urls'].includes(action)
                if (!isPublicAction) {
                    return new Response(JSON.stringify({
                        error: `AUTH FAIL: ${authError?.message || 'No user found'}`,
                        code: 401,
                        debug: {
                            action,
                            hasToken: !!token,
                            tokenStart: token?.substring(0, 10)
                        }
                    }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
                }
            } else {
                console.log(`Authenticated as: ${authUser.email}`)
                user = authUser;
            }
        }

        // For connected account actions, verify ownership
        const isPhotographerAction = ['create-account-link', 'get-account-status', 'create-login-link', 'get-account-balance', 'create-payout', 'get-payout-history'].includes(action)

        if (isPhotographerAction && user) {
            const { accountId } = payload
            if (!accountId) throw new Error('accountId is required for this action')

            const { data: privData } = await serviceClient
                .from('photographer_private_data')
                .select('stripe_account_id')
                .eq('id', user.id)
                .single()

            const { data: profile } = await serviceClient
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            if (!privData || (privData.stripe_account_id !== accountId && profile?.role !== 'admin')) {
                return new Response(JSON.stringify({ error: 'Forbidden: You do not own this Stripe account' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            }
        }
        // --- END AUTH ---

        const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')

        if (!stripeSecretKey) {
            console.error('Missing STRIPE_SECRET_KEY')
            return new Response(
                JSON.stringify({ error: 'STRIPE_SECRET_KEY is not set in Supabase Secrets' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            )
        }

        const stripe = new Stripe(stripeSecretKey, {
            apiVersion: '2022-11-15',
            httpClient: Stripe.createFetchHttpClient(),
        })

        let result

        switch (action) {
            case 'create-connected-account': {
                const { userId } = payload
                result = await stripe.accounts.create({
                    type: 'express',
                    capabilities: {
                        card_payments: { requested: true },
                        transfers: { requested: true },
                    },
                    metadata: { user_id: userId },
                })
                break
            }

            case 'create-account-link': {
                const { accountId, refreshUrl, returnUrl } = payload
                result = await stripe.accountLinks.create({
                    account: accountId,
                    refresh_url: refreshUrl,
                    return_url: returnUrl,
                    type: 'account_onboarding',
                })
                break
            }

            case 'create-checkout-session': {
                const {
                    albumId,
                    price,
                    photographerId, // This is now the photographer's internal Supabase USER ID
                    commissionAmount,
                    successUrl,
                    cancelUrl,
                    customerEmail,
                    uiMode
                } = payload

                const { data: photographer, error: pError } = await serviceClient
                    .from('photographer_private_data')
                    .select('stripe_account_id')
                    .eq('id', photographerId)
                    .single()

                if (pError || !photographer?.stripe_account_id) {
                    throw new Error('Photographer has no linked Stripe account')
                }

                console.log(`Creating session for Photographer Stripe ID: ${photographer.stripe_account_id}`);

                const sessionParams: any = {
                    mode: 'payment',
                    line_items: [{
                        price_data: {
                            currency: 'usd',
                            product_data: { name: 'Photo Album Access' },
                            unit_amount: Math.round(price * 100),
                        },
                        quantity: 1,
                    }],
                    payment_intent_data: {
                        transfer_data: { destination: photographer.stripe_account_id },
                    },
                    metadata: { album_id: albumId }
                }

                if (commissionAmount > 0) {
                    sessionParams.payment_intent_data.application_fee_amount = Math.round(commissionAmount * 100);
                }

                if (uiMode === 'embedded') {
                    sessionParams.ui_mode = 'embedded'
                    sessionParams.return_url = successUrl
                } else {
                    sessionParams.success_url = successUrl
                    sessionParams.cancel_url = cancelUrl
                }

                if (customerEmail) {
                    sessionParams.customer_email = customerEmail
                }

                console.log('Stripe Session Params:', JSON.stringify(sessionParams, null, 2))

                result = await stripe.checkout.sessions.create(sessionParams)
                break
            }

            case 'get-account-status': {
                result = await stripe.accounts.retrieve(payload.accountId)
                break
            }

            case 'create-login-link': {
                result = await stripe.accounts.createLoginLink(payload.accountId)
                break
            }

            case 'get-account-balance': {
                result = await stripe.balance.retrieve({
                    stripeAccount: payload.accountId,
                })
                break
            }

            case 'create-payout': {
                result = await stripe.payouts.create({
                    amount: Math.round(payload.amount * 100),
                    currency: payload.currency || 'usd',
                }, {
                    stripeAccount: payload.accountId,
                })
                break
            }

            case 'get-bank-details': {
                const { photographerId } = payload
                const { data: details, error: dError } = await serviceClient
                    .from('photographer_private_data')
                    .select('bank_details, bank_transfer_enabled, bank_name, account_holder, bank_code, account_number, rib, bank_accounts')
                    .eq('id', photographerId)
                    .single()

                if (dError || !details) throw new Error('Bank details not found for this photographer')
                result = details
                break
            }

            case 'get-download-urls': {
                const { albumId, sessionId } = payload
                let unlockedIds: string[] = []

                // 1. Verify Purchase
                let query = serviceClient
                    .from('transactions')
                    .select('unlocked_photo_ids, buyer_id, stripe_payment_intent_id')
                    .eq('album_id', albumId)
                    .eq('status', 'paid')

                if (user) {
                    query = query.eq('buyer_id', user.id)
                } else if (sessionId) {
                    query = query.eq('stripe_payment_intent_id', sessionId)
                } else {
                    throw new Error('Unauthorized: Authentication required')
                }

                const { data: transactions, error: txError } = await query
                if (txError || !transactions || transactions.length === 0) {
                    throw new Error('No valid purchase found for this album')
                }

                // Merge unlocked IDs
                transactions.forEach((tx: any) => {
                    if (tx.unlocked_photo_ids) {
                        unlockedIds = [...new Set([...unlockedIds, ...tx.unlocked_photo_ids])]
                    }
                })

                // 2. Fetch Photos and Generate Signed URLs
                let photoQuery = serviceClient.from('photos').select('id, original_url, watermarked_url, title').eq('album_id', albumId)
                if (unlockedIds.length > 0) {
                    photoQuery = photoQuery.in('id', unlockedIds)
                }

                const { data: photos, error: pError } = await photoQuery
                if (pError || !photos) throw new Error('Error fetching photos')

                const photosWithUrls = await Promise.all(photos.map(async (photo: any) => {
                    const { data, error } = await serviceClient.storage
                        .from('original-photos')
                        .createSignedUrl(photo.original_url, 3600)

                    return {
                        id: photo.id,
                        title: photo.title,
                        watermarked_url: photo.watermarked_url,
                        signedUrl: data?.signedUrl || null,
                        error: error ? error.message : null
                    }
                }))

                result = { photos: photosWithUrls }
                break
            }

            default:
                throw new Error(`Invalid action: ${action}`)
        }

        return new Response(
            JSON.stringify(result),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Stripe Edge Function Error:', error)
        return new Response(
            JSON.stringify({ error: (error as any)?.message || String(error) }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
