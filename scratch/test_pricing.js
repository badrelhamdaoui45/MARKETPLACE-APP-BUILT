import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Manually parse .env file
const envContent = readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        env[key] = value;
    }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function main() {
    console.log("Checking pricing_plans...");
    const { data, error } = await supabase
        .from('pricing_plans')
        .select('*');

    if (error) {
        console.error("Error querying pricing_plans:", error);
    } else {
        console.log("pricing_plans exists! Count:", data.length);
        console.log(data);
    }

    console.log("Checking profiles table plan_id column...");
    const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('id, email, plan_id, role')
        .limit(5);

    if (pError) {
        console.error("Error querying profiles table:", pError);
    } else {
        console.log("Profiles check:", profiles);
    }
}

main().catch(console.error);
