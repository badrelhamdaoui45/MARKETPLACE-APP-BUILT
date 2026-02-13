
import { supabase } from './lib/supabase';
import { pingStripe } from './lib/stripe/service';

export const debugStripeConnection = async () => {
    console.group("🔍 STRIPE CONNECTION DEBUGGER");

    try {
        // 1. Check Session
        console.log("1. Checking Supabase Session...");
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
            console.error("❌ Session Error:", sessionError);
            return;
        }

        if (!session) {
            console.warn("⚠️ No active session found. User is not logged in.");
        } else {
            console.log("✅ Session found for user:", session.user.email);
            console.log("🔑 Access Token (first 20 chars):", session.access_token.substring(0, 20) + "...");
            console.log("⏳ Token Expires At:", new Date(session.expires_at * 1000).toLocaleString());
        }

        // 2. Test Ping
        console.log("\n2. Testing Stripe Edge Function Connectivity (Ping)...");
        try {
            const pong = await pingStripe();
            console.log("✅ Ping Successful! Response:", pong);
            if (pong.user) {
                console.log(`👤 Backend identified you as: ${pong.user.email} (ID: ${pong.user.id})`);
            } else {
                console.warn("⚠️ Backend identified you as Anonymous.");
            }
        } catch (pingError) {
            console.error("❌ Ping Failed:", pingError);
            if (pingError.message && pingError.message.includes("Unauthorized")) {
                console.error("👉 This indicates the Edge Function rejected the token.");
            }
        }

        console.log("\n✅ Debugging Complete.");

    } catch (error) {
        console.error("❌ Unexpected Debug Error:", error);
    } finally {
        console.groupEnd();
    }
};

// Expose to window for easy access in console
window.debugStripeConnection = debugStripeConnection;
console.log("🛠️ debugStripeConnection() is now available in the console.");
