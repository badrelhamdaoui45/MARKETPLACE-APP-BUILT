import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { calculateCommission } from '../config/platform';
import { ShoppingBag, Camera, Download, Check } from 'lucide-react';

const BuyerProfile = () => {
    const { user } = useAuth();
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    // Ref to prevent double insertion on React Strict Mode
    const processedRef = useRef(false);

    useEffect(() => {
        const sessionId = searchParams.get('session_id');

        const initialize = async () => {
            setLoading(true);
            try {
                let userPurchases = [];
                let guestPurchases = [];

                // Fetch by User ID if logged in
                if (user) {
                    userPurchases = await fetchPurchases(user.id);
                }

                // Fetch by Session ID if present (regardless of auth)
                if (sessionId) {
                    guestPurchases = await fetchGuestPurchase(sessionId);
                }

                // Merge and remove duplicates by transaction ID
                const allPurchases = [...userPurchases, ...guestPurchases];
                const uniquePurchases = Array.from(new Map(allPurchases.map(p => [p.id, p])).values());

                // Sort by date
                uniquePurchases.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

                setPurchases(uniquePurchases);
            } catch (err) {
                console.error("Initialization error:", err);
            } finally {
                setLoading(false);
            }
        };

        initialize();
    }, [user, searchParams]);

    const fetchGuestPurchase = async (sessionId) => {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select(`
                    *,
                    albums:album_id (
                        *,
                        profiles:photographer_id(full_name)
                    )
                `)
                .eq('stripe_payment_intent_id', sessionId);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching guest purchase:', error);
            return [];
        }
    };

    const fetchPurchases = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select(`
                  *,
                  albums:album_id (
                    *,
                    profiles:photographer_id(full_name)
                  )
                `)
                .eq('buyer_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching purchases:', error);
            return [];
        }
    };


    return (
        <div className="purchases-container">
            <header className="purchases-header">
                <h1 className="purchases-title">My Purchases</h1>
                <p className="purchases-subtitle">Manage and download your professional photography collections.</p>
            </header>

            {loading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading...</p>
                </div>
            ) : purchases.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon"><ShoppingBag size={64} strokeWidth={1} /></div>
                    <h3 className="empty-title">No purchases yet</h3>
                    <p className="empty-text">Browse the albums to find amazing photography collections.</p>
                    <Button onClick={() => navigate('/albums')} className="mt-4">Explore Albums</Button>
                </div>
            ) : (
                <div className="purchases-list">
                    {purchases.map((tx) => (
                        <div key={tx.id} className="purchase-card">
                            <div className="purchase-card-main">
                                <div className="purchase-info">
                                    <div className="album-preview-mini">
                                        {tx.albums?.cover_image_url ? (
                                            <img src={tx.albums.cover_image_url} alt="" />
                                        ) : (
                                            <div className="no-preview"><Camera size={24} /></div>
                                        )}
                                    </div>
                                    <div className="text-content">
                                        <h3 className="album-title">{tx.albums?.title}</h3>
                                        <p className="photographer-name">by {tx.albums?.profiles?.full_name}</p>
                                        <div className="purchase-meta">
                                            <span className="purchase-date">{new Date(tx.created_at).toLocaleDateString()}</span>
                                            <span className="meta-divider">•</span>
                                            <span className="purchase-amount">${tx.amount}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="purchase-actions">
                                    <Button
                                        className="download-btn"
                                        onClick={() => {
                                            const url = `/my-purchases/${tx.album_id}${!user ? `?session_id=${tx.stripe_payment_intent_id}` : ''}`;
                                            navigate(url);
                                        }}
                                    >
                                        <Download size={16} />
                                        DOWNLOAD FILES
                                    </Button>
                                </div>
                            </div>
                            <div className="purchase-footer">
                                <div className="status-badge">
                                    <Check size={14} style={{ marginRight: '4px' }} />
                                    Lifetime Access Unlocked
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <style>{`
                .purchases-container {
                    padding: var(--spacing-xl);
                    max-width: 1000px;
                    margin: 0 auto;
                }

                .purchases-header {
                    margin-bottom: var(--spacing-2xl);
                }

                .purchases-title {
                    font-size: var(--font-size-3xl);
                    font-weight: 800;
                    margin-bottom: var(--spacing-xs);
                }

                .purchases-subtitle {
                    color: var(--text-secondary);
                    font-size: var(--font-size-md);
                }

                .purchases-list {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-lg);
                }

                .purchase-card {
                    background: var(--bg-primary);
                    border: 1px solid var(--border-light);
                    border-radius: var(--radius-xl);
                    overflow: hidden;
                    box-shadow: var(--shadow-sm);
                    transition: all var(--transition-base);
                }

                .purchase-card:hover {
                    box-shadow: var(--shadow-md);
                    border-color: var(--primary-blue-light);
                }

                .purchase-card-main {
                    padding: var(--spacing-lg);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: var(--spacing-xl);
                }

                .purchase-info {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-lg);
                    flex: 1;
                }

                .album-preview-mini {
                    width: 80px;
                    height: 80px;
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    background: var(--bg-tertiary);
                    flex-shrink: 0;
                }

                .album-preview-mini img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .no-preview {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-tertiary);
                }

                .album-title {
                    font-size: var(--font-size-lg);
                    font-weight: 700;
                    margin-bottom: 2px;
                }

                .photographer-name {
                    font-size: var(--font-size-sm);
                    color: var(--text-secondary);
                    margin-bottom: var(--spacing-xs);
                }

                .purchase-meta {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-sm);
                    font-size: var(--font-size-xs);
                    color: var(--text-tertiary);
                    font-weight: 500;
                }

                .meta-divider {
                    opacity: 0.5;
                }

                .purchase-amount {
                    color: var(--primary-blue);
                    font-weight: 700;
                }

                .purchase-footer {
                    padding: var(--spacing-sm) var(--spacing-lg);
                    background: var(--bg-secondary);
                    border-top: 1px solid var(--border-light);
                }

                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: var(--spacing-xs);
                    font-size: var(--font-size-xs);
                    font-weight: 600;
                    color: var(--success-green);
                }

                .download-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem 1.25rem !important;
                    border: 2px solid var(--primary-blue) !important;
                    color: var(--primary-blue) !important;
                    background: white !important;
                    border-radius: var(--radius-md) !important;
                    font-weight: 700 !important;
                    font-size: 0.85rem !important;
                    transition: all 0.2s ease !important;
                    text-transform: uppercase;
                    cursor: pointer;
                }

                .download-btn:hover {
                    background: var(--bg-hover) !important;
                    color: var(--primary-blue-dark) !important;
                    border-color: var(--primary-blue-dark) !important;
                }

                .empty-state {
                    text-align: center;
                    padding: 6rem var(--spacing-xl);
                    background: var(--bg-tertiary);
                    border-radius: var(--radius-2xl);
                }

                .empty-icon {
                    color: var(--text-tertiary);
                    margin-bottom: var(--spacing-md);
                    display: flex;
                    justify-content: center;
                }

                .empty-title {
                    font-size: var(--font-size-xl);
                    font-weight: 700;
                    margin-bottom: var(--spacing-xs);
                }

                .loading-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 4rem;
                }

                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 3px solid var(--border-light);
                    border-top-color: var(--primary-blue);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                @media (max-width: 640px) {
                    .purchases-container {
                        padding: var(--spacing-md);
                    }
                    .purchase-card-main {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: var(--spacing-lg);
                    }
                    .purchase-actions {
                        width: 100%;
                    }
                    .download-btn {
                        width: 100%;
                    }
                    .album-preview-mini {
                        width: 60px;
                        height: 60px;
                    }
                }
            `}</style>
        </div>
    );
};

export default BuyerProfile;
