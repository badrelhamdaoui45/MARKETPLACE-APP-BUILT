import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '../supabase';
import { createClient } from '@supabase/supabase-js';

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;


/**
 * Helper to invoke Edge Functions with explicit Auth Header
 */
const invokeHelper = async (functionName, options) => {
    // Force session refresh check
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
        console.error("invokeHelper Session Error:", sessionError);
    }

    const headers = options.headers || {};

    // Explicitly add the Authorization header from the current session
    if (session?.access_token) {
        console.log(`invokeHelper: Attaching token ${session.access_token.substring(0, 10)}...`);
        headers.Authorization = `Bearer ${session.access_token}`;
    } else {
        console.warn("invokeHelper: No active session found!");
    }

    return await supabase.functions.invoke(functionName, {
        ...options,
        headers
    });
};

/**
 * Handle Edge Function invoke errors by extracting the specific Stripe/Supabase error message
 */
const handleInvokeError = async (error) => {
    if (!error) return;
    console.error('Stripe Invoke Error:', error);
    let message = 'Unknown error occurred';
    if (error?.context?.json) {
        try {
            const body = await error.context.json();
            message = body.error || body.message || JSON.stringify(body);
        } catch (e) {
            message = error.message || JSON.stringify(error);
        }
    } else {
        message = error.message || error.error || JSON.stringify(error);
    }
    throw new Error(typeof message === 'object' ? JSON.stringify(message) : message);
};

export const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

/**
 * INVOKE SECURE BACKEND: Create Stripe Express Account
 */
export const createConnectedAccount = async (userId, country = null, phone = null) => {
    try {
        const { data, error } = await invokeHelper('stripe-service', {
            body: {
                action: 'create-connected-account',
                payload: { userId, country, phone }
            }
        });

        if (error) await handleInvokeError(error);

        // Save account ID to private data table
        await supabase.from('photographer_private_data').upsert({
            id: userId,
            stripe_account_id: data.id,
            updated_at: new Date().toISOString()
        });

        return data;
    } catch (error) {
        console.error('Error creating linked account:', error);
        throw error;
    }
};

/**
 * INVOKE SECURE BACKEND: Create Account Link
 */
export const createAccountLink = async (accountId) => {
    try {
        const { data, error } = await invokeHelper('stripe-service', {
            body: {
                action: 'create-account-link',
                payload: {
                    accountId,
                    refreshUrl: `${window.location.origin}/photographer/dashboard`,
                    returnUrl: `${window.location.origin}/photographer/dashboard?onboarding=complete`
                }
            }
        });

        if (error) await handleInvokeError(error);
        return data.url;
    } catch (error) {
        console.error('Error creating account link:', error);
        throw error;
    }
};

/**
 * INVOKE SECURE BACKEND: Create Checkout Session
 */
export const createCheckoutSession = async (albumId, price, photographerId, commissionAmount, photoIds = [], cancelUrl = null, customerEmail = null, uiMode = 'hosted', currency = 'usd') => {
    try {
        const photosParam = (photoIds && photoIds.length > 0) ? `&photos=${encodeURIComponent(JSON.stringify(photoIds))}` : '';
        const successUrl = `${window.location.origin}/cart?success=true&session_id={CHECKOUT_SESSION_ID}&album_id=${albumId}&amount=${price}&photographer_id=${photographerId}&currency=${currency}${photosParam}`;

        const { data, error } = await invokeHelper('stripe-service', {
            body: {
                action: 'create-checkout-session',
                payload: {
                    albumId,
                    price,
                    photographerId, // Now passing the USER ID, which the backend will use to lookup the Stripe ID
                    commissionAmount,
                    successUrl,
                    cancelUrl: cancelUrl || `${window.location.origin}/cart`,
                    customerEmail,
                    uiMode,
                    currency
                }
            }
        });

        if (error) await handleInvokeError(error);
        return data;
    } catch (error) {
        console.error('Error creating checkout session:', error);
        throw error;
    }
};

/**
 * INVOKE SECURE BACKEND: Get Account Status
 */
export const getAccountStatus = async (accountId) => {
    try {
        const { data, error } = await invokeHelper('stripe-service', {
            body: { action: 'get-account-status', payload: { accountId } }
        });

        if (error) await handleInvokeError(error);
        return data;
    } catch (error) {
        console.error('Error fetching account status:', error);
        throw error;
    }
};

/**
 * INVOKE SECURE BACKEND: Create Login Link
 */
export const createLoginLink = async (accountId) => {
    try {
        const { data, error } = await invokeHelper('stripe-service', {
            body: { action: 'create-login-link', payload: { accountId } }
        });

        if (error) await handleInvokeError(error);
        return data.url;
    } catch (error) {
        console.error('Error creating login link:', error);
        throw error;
    }
};

/**
 * INVOKE SECURE BACKEND: Get Account Balance
 */
export const getAccountBalance = async (accountId) => {
    try {
        const { data, error } = await invokeHelper('stripe-service', {
            body: { action: 'get-account-balance', payload: { accountId } }
        });

        if (error) await handleInvokeError(error);
        return data;
    } catch (error) {
        console.error('Error fetching account balance:', error);
        throw error;
    }
};

/**
 * INVOKE SECURE BACKEND: Create Payout
 */
export const createPayout = async (accountId, amount, currency = 'usd') => {
    try {
        const { data, error } = await invokeHelper('stripe-service', {
            body: { action: 'create-payout', payload: { accountId, amount, currency } }
        });

        if (error) await handleInvokeError(error);
        return data;
    } catch (error) {
        console.error('Error creating payout:', error);
        throw error;
    }
};

/**
 * INVOKE SECURE BACKEND: Get Payout History
 */
export const getPayoutHistory = async (accountId, limit = 10) => {
    try {
        const { data, error } = await invokeHelper('stripe-service', {
            body: { action: 'get-payout-history', payload: { accountId, limit } }
        });

        if (error) await handleInvokeError(error);
        return data;
    } catch (error) {
        console.error('Error fetching payout history:', error);
        throw error;
    }
};

export const pingStripe = async () => {
    try {
        const { data, error } = await invokeHelper('stripe-service', {
            body: { action: 'ping', payload: {} }
        });

        if (error) await handleInvokeError(error);
        return data;
    } catch (error) {
        console.error('Stripe Ping Error:', error);
        throw error;
    }
};

/**
 * INVOKE SECURE BACKEND: Create Subscription Plan Checkout Session
 */
export const createPlanCheckoutSession = async (planId, planName, price, photographerId, customerEmail = null) => {
    try {
        const successUrl = `${window.location.origin}/photographer/settings?success=true&session_id={CHECKOUT_SESSION_ID}&plan_id=${planId}`;
        const cancelUrl = `${window.location.origin}/photographer/settings?cancelled=true`;

        const { data, error } = await invokeHelper('stripe-service', {
            body: {
                action: 'create-plan-checkout-session',
                payload: {
                    planId,
                    planName,
                    price,
                    photographerId,
                    successUrl,
                    cancelUrl,
                    customerEmail
                }
            }
        });

        if (error) await handleInvokeError(error);
        return data;
    } catch (error) {
        console.error('Error creating plan checkout session:', error);
        throw error;
    }
};
