
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
export const createCheckoutSession = async (albumId, price, photographerStripeId, commissionAmount, photoIds = [], cancelUrl = null, customerEmail = null) => {
    try {
        // In a real implementation, this would call your backend API
        // For now, we're using a mock session that redirects to success page

        console.log("Creating checkout session with photoIds:", photoIds);

        // Build success URL with all parameters
        const params = new URLSearchParams({
            session_id: 'cs_test_' + Math.random().toString(36).substr(2, 9),
            album_id: albumId,
            amount: price.toString(),
            photographer_id: photographerStripeId
        });

        // Add photo IDs if they exist
        if (photoIds && photoIds.length > 0) {
            params.append('photos', JSON.stringify(photoIds));
        }

        const successUrl = `${window.location.origin}/my-purchases?${params.toString()}`;

        console.log("Redirect URL:", successUrl);

        const sessionParams = {
            'mode': 'payment',
            'success_url': successUrl,
            'cancel_url': cancelUrl || `${window.location.origin}/cart`,
            'line_items[0][price_data][currency]': 'usd',
            'line_items[0][price_data][product_data][name]': 'Photo Album Access',
            'line_items[0][price_data][unit_amount]': Math.round(price * 100),
            'line_items[0][quantity]': '1',
            'payment_intent_data[application_fee_amount]': Math.round(commissionAmount * 100),
            'payment_intent_data[transfer_data][destination]': photographerStripeId,
        };

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
