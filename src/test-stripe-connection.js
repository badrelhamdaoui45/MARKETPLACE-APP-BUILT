
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

        // 2. Test Ping (Unauthenticated)
        try {
            console.log("\n2. Testing Public Reachability (No JWT)...");
            const rawResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-service`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'ping', payload: {} })
            });
            const pongData = await rawResponse.json();

            if (rawResponse.status === 401 && pongData.message === "Missing authorization header") {
                console.error("❌ Public Reachability FAILED: Supabase Gateway is blocking unauthenticated requests.");
                console.error("👉 FIX: Deploy with 'supabase functions deploy stripe-service --no-verify-jwt'");
            } else {
                console.log("📡 Public Reachability Result:", pongData);
            }
        } catch (e) {
            console.error("📡 Public Reachability Request Failed:", e);
        }

        // 3. Test Ping (Authenticated)
        console.log("\n3. Testing Authenticated Connection (With JWT)...");
        try {
            const pong = await pingStripe();
            console.log("✅ Authenticated Ping Successful! Response:", pong);
            if (pong.user) {
                console.log(`👤 Backend identified you as: ${pong.user.email} (ID: ${pong.user.id})`);
            } else {
                console.warn("⚠️ Backend identified you as Anonymous (but request reached the code).");
            }
        } catch (pingError) {
            console.error("❌ Authenticated Ping Failed:", pingError);
            if (pingError.message && (pingError.message.includes("Invalid JWT") || pingError.message.includes("401"))) {
                console.error("👉 This indicates a JWT Secret or Project mismatch.");
                console.error("💡 Action: Sign out and Sign back in, OR check if .env URL matches the project you deployed to.");
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
