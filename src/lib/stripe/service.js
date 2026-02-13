import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '../supabase';

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

export const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

/**
 * INVOKE SECURE BACKEND: Create Stripe Express Account
 */
export const createConnectedAccount = async (userId) => {
    try {
        const { data, error } = await invokeHelper('stripe-service', {
            body: {
                action: 'create-connected-account',
                payload: { userId }
            }
        });

        if (error) throw error;

        // Save account ID to profile
        await supabase.from('profiles').update({ stripe_account_id: data.id }).eq('id', userId);

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

        if (error) throw error;
        return data.url;
    } catch (error) {
        console.error('Error creating account link:', error);
        throw error;
    }
};

/**
 * INVOKE SECURE BACKEND: Create Checkout Session
 */
export const createCheckoutSession = async (albumId, price, photographerId, commissionAmount, photoIds = [], cancelUrl = null, customerEmail = null, uiMode = 'hosted') => {
    try {
        const photosParam = (photoIds && photoIds.length > 0) ? `&photos=${encodeURIComponent(JSON.stringify(photoIds))}` : '';
        const successUrl = `${window.location.origin}/cart?success=true&session_id={CHECKOUT_SESSION_ID}&album_id=${albumId}&amount=${price}&photographer_id=${photographerId}${photosParam}`;

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
                    uiMode
                }
            }
        });

        if (error) {
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
        }
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

        if (error) {
            console.error('Stripe Invoke Error:', error);

            let message = error.message;
            if (error?.context?.json) {
                try {
                    const body = await error.context.json();
                    message = body.error || body.message || JSON.stringify(body);
                } catch (e) {
                    message = error.message || JSON.stringify(error);
                }
            }
            throw new Error(message);
        }
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

        if (error) throw error;
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

        if (error) throw error;
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

        if (error) throw error;
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

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching payout history:', error);
        throw error;
    }
};

/**
 * INVOKE SECURE BACKEND: Ping (Connectivity Test)
 */
export const pingStripe = async () => {
    try {
        const { data, error: invokeError } = await invokeHelper('stripe-service', {
            body: { action: 'ping', payload: {} }
        });

        if (invokeError) {
            console.error('Stripe Ping Invoke Error Details:', invokeError);
            let message = invokeError.message;
            try {
                const body = await invokeError.context?.json();
                if (body) {
                    console.error('Stripe Ping Error Body:', body);
                    if (body.error) message = body.error;
                    if (body.debug) console.log('Backend Debug Info:', body.debug);
                }
            } catch (e) { /* ignore */ }
            throw new Error(message);
        }
        return data;
    } catch (error) {
        console.error('Stripe Ping Error:', error);
        throw error;
    }
};
