
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '../supabase';

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const STRIPE_SECRET_KEY = import.meta.env.VITE_STRIPE_SECRET_KEY;

export const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

/**
 * SIMULATED BACKEND FUNCTION: Create Stripe Express Account
 * In production, this MUST run on the server/edge function to protect the secret key.
 */
export const createConnectedAccount = async (userId) => {
    try {
        const response = await fetch('https://api.stripe.com/v1/accounts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                'type': 'express',
                'capabilities[card_payments][requested]': 'true',
                'capabilities[transfers][requested]': 'true',
                'metadata[user_id]': userId,
            }),
        });

        const account = await response.json();
        if (account.error) throw new Error(account.error.message);

        // Save account ID to profile
        await supabase.from('profiles').update({ stripe_account_id: account.id }).eq('id', userId);

        return account;
    } catch (error) {
        console.error('Error creating linked account:', error);
        throw error;
    }
};

/**
 * SIMULATED BACKEND FUNCTION: Create Account Link (for onboarding flow)
 */
export const createAccountLink = async (accountId) => {
    try {
        const response = await fetch('https://api.stripe.com/v1/account_links', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                'account': accountId,
                'refresh_url': `${window.location.origin}/photographer/dashboard`,
                'return_url': `${window.location.origin}/photographer/dashboard?onboarding=complete`,
                'type': 'account_onboarding',
            }),
        });

        const link = await response.json();
        if (link.error) throw new Error(link.error.message);

        return link.url;
    } catch (error) {
        console.error('Error creating account link:', error);
        throw error;
    }
};

/**
 * SIMULATED BACKEND FUNCTION: Create Checkout Session
 * In production, this MUST run on the server/edge function.
 */
export const createCheckoutSession = async (albumId, price, photographerStripeId, commissionAmount, photoIds = [], cancelUrl = null, customerEmail = null, uiMode = 'hosted', photographerProfileId = null) => {
    try {
        // ...
        const photosParam = (photoIds && photoIds.length > 0) ? `&photos=${encodeURIComponent(JSON.stringify(photoIds))}` : '';

        // Modified for embedded flow return - INCLUDE METADATA
        // IMPORTANT: We pass the Supabase photographerProfileId and explicitly include the Stripe Session ID template
        const pId = photographerProfileId || photographerStripeId;
        const successUrl = `${window.location.origin}/cart?success=true&session_id={CHECKOUT_SESSION_ID}&album_id=${albumId}&amount=${price}&photographer_id=${pId}${photosParam}`;

        const sessionParams = {
            'mode': 'payment',
            'line_items[0][price_data][currency]': 'usd',
            'line_items[0][price_data][product_data][name]': 'Photo Album Access',
            'line_items[0][price_data][unit_amount]': Math.round(price * 100),
            'line_items[0][quantity]': '1',
            'payment_intent_data[application_fee_amount]': Math.round(commissionAmount * 100),
            'payment_intent_data[transfer_data][destination]': photographerStripeId,
        };

        if (uiMode === 'embedded') {
            sessionParams['ui_mode'] = 'embedded';
            sessionParams['return_url'] = successUrl;
        } else {
            sessionParams['success_url'] = successUrl;
            sessionParams['cancel_url'] = cancelUrl || `${window.location.origin}/cart`;
        }

        if (customerEmail) {
            sessionParams['customer_email'] = customerEmail;
        }

        // Simulate Stripe API call
        const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(sessionParams),
        });

        const session = await response.json();
        if (session.error) throw new Error(session.error.message);

        return session;
    } catch (error) {
        console.error('Error creating checkout session:', error);
        throw error;
    }
};

/**
 * SIMULATED BACKEND FUNCTION: Get Account Status
 */
export const getAccountStatus = async (accountId) => {
    try {
        const response = await fetch(`https://api.stripe.com/v1/accounts/${accountId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
            },
        });

        const account = await response.json();
        if (account.error) throw new Error(account.error.message);

        return account;
    } catch (error) {
        console.error('Error fetching account status:', error);
        throw error;
    }
};

/**
 * SIMULATED BACKEND FUNCTION: Create Login Link (for Express Dashboard)
 */
export const createLoginLink = async (accountId) => {
    try {
        const response = await fetch(`https://api.stripe.com/v1/accounts/${accountId}/login_links`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
            },
        });

        const link = await response.json();
        if (link.error) throw new Error(link.error.message);

        return link.url;
    } catch (error) {
        console.error('Error creating login link:', error);
        throw error;
    }
};

/**
 * SIMULATED BACKEND FUNCTION: Get Account Balance
 * Retrieves the available and pending balance for a connected account
 */
export const getAccountBalance = async (accountId) => {
    try {
        const response = await fetch(`https://api.stripe.com/v1/balance`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
                'Stripe-Account': accountId,
            },
        });

        const balance = await response.json();
        if (balance.error) throw new Error(balance.error.message);

        return balance;
    } catch (error) {
        console.error('Error fetching account balance:', error);
        throw error;
    }
};

/**
 * SIMULATED BACKEND FUNCTION: Create Payout
 * Creates a payout to transfer funds to the photographer's bank account
 */
export const createPayout = async (accountId, amount, currency = 'usd') => {
    try {
        const response = await fetch('https://api.stripe.com/v1/payouts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
                'Stripe-Account': accountId,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                'amount': Math.round(amount * 100), // Convert to cents
                'currency': currency,
            }),
        });

        const payout = await response.json();
        if (payout.error) throw new Error(payout.error.message);

        return payout;
    } catch (error) {
        console.error('Error creating payout:', error);
        throw error;
    }
};

/**
 * SIMULATED BACKEND FUNCTION: Get Payout History
 * Retrieves the payout history for a connected account
 */
export const getPayoutHistory = async (accountId, limit = 10) => {
    try {
        const response = await fetch(`https://api.stripe.com/v1/payouts?limit=${limit}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
                'Stripe-Account': accountId,
            },
        });

        const payouts = await response.json();
        if (payouts.error) throw new Error(payouts.error.message);

        return payouts.data;
    } catch (error) {
        console.error('Error fetching payout history:', error);
        throw error;
    }
};
