
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createConnectedAccount, createAccountLink, getAccountStatus } from '../../lib/stripe/service';
import Button from '../ui/Button';

const ConnectStripe = () => {
    const { user, profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [accountStatus, setAccountStatus] = useState(null);
    const [loadingStatus, setLoadingStatus] = useState(false);

    useEffect(() => {
        if (profile?.stripe_account_id) {
            checkStatus();
        }
    }, [profile]);

    const checkStatus = async () => {
        setLoadingStatus(true);
        try {
            const account = await getAccountStatus(profile.stripe_account_id);
            setAccountStatus(account);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingStatus(false);
        }
    };

    const handleConnect = async () => {
        setLoading(true);
        try {
            let accountId = profile.stripe_account_id;

            if (!accountId) {
                const account = await createConnectedAccount(user.id);
                accountId = account.id;
            }

            const url = await createAccountLink(accountId);
            window.location.href = url;

        } catch (error) {
            alert('Error connecting Stripe: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Render Logic based on Status
    const renderStatus = () => {
        if (!accountStatus) return null;

        const { charges_enabled, payouts_enabled, requirements } = accountStatus;
        const isRestricted = !payouts_enabled || (requirements.currently_due && requirements.currently_due.length > 0);

        if (isRestricted) {
            return (
                <div style={{ padding: '1rem', background: '#fffbeb', borderRadius: 'var(--radius-md)', border: '1px solid #f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <strong style={{ color: '#d97706', display: 'block', marginBottom: '0.25rem' }}>⚠️ Action Required</strong>
                        <div style={{ fontSize: '0.85rem', color: '#b45309' }}>
                            <p>Stripe needs more information to enable payouts.</p>
                            {requirements.currently_due.length > 0 && (
                                <ul style={{ marginTop: '0.5rem', paddingLeft: '1.2rem', margin: '0.5rem 0' }}>
                                    {requirements.currently_due.map(req => (
                                        <li key={req} style={{ marginBottom: '0.2rem' }}>{req.replace(/\./g, ' ')}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                    <Button onClick={handleConnect} disabled={loading} style={{ background: '#d97706', color: 'white' }}>
                        {loading ? 'Opening...' : 'Complete Setup'}
                    </Button>
                </div>
            );
        }

        return (
            <div style={{ padding: '1rem', background: '#ecfdf5', borderRadius: 'var(--radius-md)', border: '1px solid #059669', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <strong style={{ color: '#047857', display: 'block' }}>✅ Active & Ready</strong>
                    <span style={{ fontSize: '0.85rem', color: '#065f46' }}>
                        Your account is fully verified and ready to accept payments.
                    </span>
                </div>
                <Button variant="outline" onClick={handleConnect} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', background: 'white' }}>
                    Dashboard
                </Button>
            </div>
        );
    };

    if (loadingStatus) return <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>Checking Stripe status...</div>;

    if (profile?.stripe_account_id) {
        return (
            <div style={{ marginBottom: '1.5rem' }}>
                {renderStatus()}
            </div>
        );
    }

    return (
        <div style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-primary)', marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Setup Payouts</h3>
            <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                To receive payments for your photo sales, you need to connect a Stripe account.
            </p>
            <Button onClick={handleConnect} disabled={loading} style={{ background: '#635bff' }}>
                {loading ? 'Redirecting...' : 'Connect with Stripe'}
            </Button>
        </div>
    );
};

export default ConnectStripe;
