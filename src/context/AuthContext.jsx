
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                handlePendingOAuthData(session.user.id).then(() => fetchProfile(session.user.id));
            }
            else setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                handlePendingOAuthData(session.user.id).then(() => fetchProfile(session.user.id));
            }
            else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handlePendingOAuthData = async (userId) => {
        const pendingRole = localStorage.getItem('oauth_pending_role');
        const pendingCountry = localStorage.getItem('oauth_pending_country');

        if (pendingRole) {
            const updateData = { role: pendingRole };
            if (pendingCountry) updateData.country = pendingCountry;

            try {
                // Update public profile
                await supabase.from('profiles').update(updateData).eq('id', userId);
                
                // Update auth metadata
                await supabase.auth.updateUser({ data: updateData });
            } catch (err) {
                console.error('Error applying pending OAuth data:', err);
            } finally {
                // Clear the local storage
                localStorage.removeItem('oauth_pending_role');
                localStorage.removeItem('oauth_pending_country');
            }
        }
    };

    const fetchProfile = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select(`
                    *,
                    photographer_private_data(
                        stripe_account_id,
                        bank_details,
                        bank_transfer_enabled,
                        bank_name,
                        account_holder,
                        bank_code,
                        account_number,
                        rib,
                        bank_accounts
                    )
                `)
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error fetching profile:', error);
            } else {
                // Flatten private data into the main profile object for backward compatibility
                const flattenedData = { ...data };
                if (data.photographer_private_data) {
                    Object.assign(flattenedData, data.photographer_private_data);
                    delete flattenedData.photographer_private_data;
                }
                setProfile(flattenedData);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const signUp = async (email, password, fullName, role, metadata = {}) => {
        // Pass metadata so trigger handles profile creation
        console.log("Signing up with:", { email, fullName, role, metadata });
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    role: role,
                    ...metadata,
                },
            },
        });
        return { data, error };
    };

    const signUpWithPhone = async (phone, password, fullName, role, metadata = {}) => {
        console.log("Signing up phone with:", { phone, fullName, role, metadata });
        const { data, error } = await supabase.auth.signUp({
            phone,
            password,
            options: {
                data: {
                    full_name: fullName,
                    role: role,
                    ...metadata,
                },
            },
        });
        return { data, error };
    };

    const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password });
    
    const signInWithPhonePassword = (phone, password) => supabase.auth.signInWithPassword({ phone, password });
    
    const signInWithGoogle = () => {
        return supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
            }
        });
    };

    const signInWithPhone = async (phone, metadata = {}) => {
        return await supabase.auth.signInWithOtp({
            phone,
            options: {
                data: metadata
            }
        });
    };

    const signOut = () => supabase.auth.signOut();

    const refreshProfile = () => {
        if (user) fetchProfile(user.id);
    };

    const value = {
        user,
        profile,
        loading,
        signUp,
        signUpWithPhone,
        signIn,
        signInWithPhonePassword,
        signInWithGoogle,
        signInWithPhone,
        signOut,
        refreshProfile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
