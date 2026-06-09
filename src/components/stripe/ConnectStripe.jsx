import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createConnectedAccount, createAccountLink, getAccountStatus, createLoginLink } from '../../lib/stripe/service';
import Button from '../ui/Button';
import { RefreshCw, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { stripeCountries } from '../../utils/stripeCountries';
import { supabase } from '../../lib/supabase';
import SearchableCountrySelect from '../SearchableCountrySelect';
import SearchablePhonePrefixSelect from '../SearchablePhonePrefixSelect';

const ConnectStripe = () => {
    const { user, profile, refreshProfile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [accountStatus, setAccountStatus] = useState(null);
    const [loadingStatus, setLoadingStatus] = useState(false);
    const [error, setError] = useState(null);

    // Stripe onboarding prefill details
    const [selectedCountry, setSelectedCountry] = useState('US');
    const [selectedPhoneCountry, setSelectedPhoneCountry] = useState('US');
    const [phoneNumber, setPhoneNumber] = useState('');

    useEffect(() => {
        if (profile?.stripe_account_id) {
            checkStatus();
        }
    }, [profile]);

    useEffect(() => {
        if (profile?.country) {
            const matched = stripeCountries.find(c => c.name.toLowerCase() === profile.country.toLowerCase());
            if (matched) {
                setSelectedCountry(matched.code);
                setSelectedPhoneCountry(matched.code);
            }
        }
    }, [profile]);

    // Automatically default phone country prefix when payout country changes
    useEffect(() => {
        setSelectedPhoneCountry(selectedCountry);
    }, [selectedCountry]);

    const checkStatus = async () => {
        setLoadingStatus(true);
        setError(null);
        try {
            const account = await getAccountStatus(profile.stripe_account_id);
            if (account.error) throw new Error(account.error);
            setAccountStatus(account);
        } catch (error) {
            console.error('Stripe Status Check Error:', error);
            // Try to extract a more descriptive message if it exists in the body
            let msg = error.message;
            if (error.context && error.context.error) {
                msg = error.context.error;
            }
            setError(msg);
        } finally {
            setLoadingStatus(false);
        }
    };

    const handleConnect = async () => {
        setLoading(true);
        try {
            let accountId = profile.stripe_account_id;

            if (!accountId) {
                const account = await createConnectedAccount(user.id, selectedCountry);
                accountId = account.id;
            }

            const url = await createAccountLink(accountId);
            window.open(url, '_blank', 'noopener,noreferrer');

        } catch (error) {
            alert('Error connecting Stripe: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResetAccount = async () => {
        if (!window.confirm("Are you sure you want to disconnect this Stripe account and start payment setup over? This will let you choose a different payout country and phone number.")) {
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from('photographer_private_data')
                .update({ stripe_account_id: null })
                .eq('id', user.id);

            if (error) throw error;

            // Clear local states
            setAccountStatus(null);
            setError(null);

            // Refresh profile in context
            refreshProfile();

            alert("Stripe account successfully disconnected. You can now select your country and phone number to start over.");
        } catch (err) {
            alert("Error resetting Stripe account: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDashboard = async () => {
        setLoading(true);
        try {
            const url = await createLoginLink(profile.stripe_account_id);
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch (error) {
            alert('Error opening Stripe Dashboard: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Render Logic based on Status
    const renderStatus = () => {
        if (error) {
            return (
                <div style={{ padding: '1.25rem', background: '#fef2f2', borderRadius: 'var(--radius-md)', border: '1px solid #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <strong style={{ color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertTriangle size={18} /> Connection Error
                        </strong>
                        <p style={{ fontSize: '0.9rem', color: '#991b1b', marginTop: '0.25rem' }}>{error}</p>
                    </div>
                    <Button onClick={checkStatus} variant="outline" size="sm">Retry</Button>
                </div>
            );
        }

        if (!accountStatus) return null;

        const { charges_enabled, payouts_enabled, requirements } = accountStatus;

        // Requirements from Stripe
        const currentlyDue = requirements.currently_due || [];
        const pendingVerification = requirements.pending_verification || [];
        const eventuallyDue = requirements.eventually_due || [];

        const isFullyVerified = payouts_enabled && currentlyDue.length === 0;

        if (!isFullyVerified) {
            const hasDueItems = currentlyDue.length > 0;
            const isUnderReview = pendingVerification.length > 0 || (!hasDueItems && !payouts_enabled);

            return (
                <div style={{ padding: '1.5rem', background: '#fffbeb', borderRadius: 'var(--radius-md)', border: '1px solid #f59e0b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div>
                            <strong style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                                {isUnderReview ? <RefreshCw size={18} className="animate-spin" /> : <AlertTriangle size={18} />}
                                {isUnderReview ? 'Verification in progress' : 'Action Required'}
                            </strong>
                            <p style={{ fontSize: '0.9rem', color: '#b45309', marginTop: '0.25rem', paddingLeft: '26px' }}>
                                {isUnderReview
                                    ? 'Stripe is currently verifying your information. This may take a few days.'
                                    : 'Stripe needs additional information to enable payouts.'}
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <Button onClick={handleResetAccount} variant="outline" size="sm" style={{ color: '#ef4444', borderColor: '#fca5a5', background: 'white', fontWeight: '600' }}>
                                Reset Account
                            </Button>
                            <Button onClick={handleConnect} disabled={loading} style={{ background: '#d97706', color: 'white' }}>
                                {loading ? 'Opening...' : (hasDueItems ? 'Complete setup' : 'Check on Stripe')}
                            </Button>
                        </div>
                    </div>

                    {hasDueItems && (
                        <div style={{ background: 'rgba(217, 119, 6, 0.1)', padding: '1rem', borderRadius: '6px', marginTop: '1rem', marginLeft: '26px' }}>
                            <p style={{ fontWeight: '600', color: '#d97706', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                                Missing steps:
                            </p>
                            <p style={{ fontSize: '0.85rem', color: '#b45309', margin: '0' }}>
                                {[...new Set(currentlyDue.map(req => {
                                    if (req.startsWith('representative') || req.startsWith('person') || req.startsWith('individual')) return 'Identity Verification';
                                    if (req.startsWith('external_account') || req.startsWith('bank_account')) return 'Bank Account Details';
                                    if (req.startsWith('business_profile') || req.startsWith('business_type')) return 'Business Information';
                                    if (req.startsWith('tos_acceptance')) return 'Terms of Service Agreement';
                                    if (req.includes('statement_descriptor')) return 'Business Branding';
                                    return req.replace(/\./g, ' ');
                                }))].join(', ')}
                            </p>
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div style={{ padding: '1.25rem', background: '#ecfdf5', borderRadius: 'var(--radius-md)', border: '1px solid #059669', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <strong style={{ color: '#047857', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                        <CheckCircle size={18} /> Account Active
                    </strong>
                    <span style={{ fontSize: '0.9rem', color: '#065f46', display: 'block', paddingLeft: '26px' }}>
                        Your account is verified and ready to receive payments.
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <Button onClick={handleResetAccount} variant="outline" size="sm" style={{ color: '#ef4444', borderColor: '#fca5a5', background: 'white', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                        Reset Account
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleViewDashboard}
                        disabled={loading}
                        style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', background: 'white' }}
                    >
                        {loading ? 'Opening...' : 'Stripe Dashboard'} <ExternalLink size={14} style={{ marginLeft: '4px' }} />
                    </Button>
                </div>
            </div>
        );
    };

    if (loadingStatus) return <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>Checking Stripe status...</div>;

    if (!profile) return null;

    if (profile?.stripe_account_id) {
        return (
            <div style={{ marginBottom: '1.5rem' }}>
                {renderStatus()}
            </div>
        );
    }

    return (
        <div style={{ 
            padding: '2rem', 
            background: 'white', 
            borderRadius: '16px', 
            border: '1px solid #e2e8f0', 
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
            marginBottom: '1.5rem' 
        }}>
            <h3 style={{ marginBottom: '0.5rem', fontWeight: '700', fontSize: '1.25rem', color: '#1e293b' }}>Payment Setup</h3>
            <p style={{ marginBottom: '1.5rem', color: '#64748b', fontSize: '0.95rem', lineHeight: '1.5' }}>
                To receive payouts from your sales, connect a Stripe account. Select your payout country then click the button below to be redirected to Stripe onboarding.
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>
                    Payout Country
                </label>
                <SearchableCountrySelect value={selectedCountry} onChange={setSelectedCountry} />
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.375rem', display: 'block' }}>
                    Select the country where you'll receive your payouts.
                </span>
            </div>

            <Button onClick={handleConnect} disabled={loading} style={{ background: '#635bff', color: 'white', fontWeight: '600', padding: '0.75rem 1.5rem', borderRadius: '8px' }}>
                {loading ? 'Redirecting to Stripe...' : 'Connect with Stripe'}
            </Button>
        </div>
    );
};

export default ConnectStripe;
