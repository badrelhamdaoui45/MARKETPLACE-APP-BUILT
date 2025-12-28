
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createConnectedAccount, createAccountLink, getAccountStatus, createLoginLink } from '../../lib/stripe/service';
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
                            <strong style={{ color: '#d97706', display: 'block', fontSize: '1.1rem' }}>
                                {isUnderReview ? '🔄 Vérification en cours' : '⚠️ Action Requise'}
                            </strong>
                            <p style={{ fontSize: '0.9rem', color: '#b45309', marginTop: '0.25rem' }}>
                                {isUnderReview
                                    ? 'Stripe vérifie actuellement vos informations. Cela peut prendre quelques jours.'
                                    : 'Stripe a besoin d\'informations complémentaires pour activer vos paiements.'}
                            </p>
                        </div>
                        <Button onClick={handleConnect} disabled={loading} style={{ background: '#d97706', color: 'white' }}>
                            {loading ? 'Ouverture...' : (hasDueItems ? 'Compléter ma configuration' : 'Vérifier sur Stripe')}
                        </Button>
                    </div>

                    {hasDueItems && (
                        <div style={{ background: 'rgba(217, 119, 6, 0.1)', padding: '1rem', borderRadius: '6px', marginTop: '1rem' }}>
                            <p style={{ fontWeight: '600', color: '#d97706', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                                Éléments à fournir :
                            </p>
                            <ul style={{ paddingLeft: '1.2rem', margin: '0' }}>
                                {currentlyDue.map(req => (
                                    <li key={req} style={{ fontSize: '0.85rem', color: '#b45309', marginBottom: '0.25rem', textTransform: 'capitalize' }}>
                                        {req.replace(/\./g, ' ')}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div style={{ padding: '1.25rem', background: '#ecfdf5', borderRadius: 'var(--radius-md)', border: '1px solid #059669', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <strong style={{ color: '#047857', display: 'block', fontSize: '1.1rem' }}>✅ Compte Actif</strong>
                    <span style={{ fontSize: '0.9rem', color: '#065f46' }}>
                        Votre compte est vérifié et prêt à recevoir des paiements.
                    </span>
                </div>
                <Button
                    variant="outline"
                    onClick={handleViewDashboard}
                    disabled={loading}
                    style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', background: 'white' }}
                >
                    {loading ? 'Ouverture...' : 'Tableau de bord Stripe'}
                </Button>
            </div>
        );
    };

    if (loadingStatus) return <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>Vérification du statut Stripe...</div>;

    if (profile?.stripe_account_id) {
        return (
            <div style={{ marginBottom: '1.5rem' }}>
                {renderStatus()}
            </div>
        );
    }

    return (
        <div style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-primary)', marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Configuration des paiements</h3>
            <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                Pour recevoir les revenus de vos ventes, vous devez connecter un compte Stripe.
            </p>
            <Button onClick={handleConnect} disabled={loading} style={{ background: '#635bff' }}>
                {loading ? 'Redirection...' : 'Se connecter avec Stripe'}
            </Button>
        </div>
    );
};

export default ConnectStripe;
