import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Button from '../components/ui/Button';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { calculateCommission } from '../config/platform';
import { ShoppingBag, Camera, Download, Check, Landmark, Copy, Upload, MessageSquare, Image as ImageIcon, Loader } from 'lucide-react';
import Toast from '../components/ui/Toast';
import { getBankLogoUrl } from '../utils/banks';
import { formatPrice } from '../utils/currencies';

const BankDetails = ({ photogId }) => {
    const { t } = useLanguage();
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [selectedBankIndex, setSelectedBankIndex] = useState(0);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const { data, error } = await supabase.functions.invoke('stripe-service', {
                    body: {
                        action: 'get-bank-details',
                        payload: { photographerId: photogId }
                    }
                });
                if (error) throw error;
                setDetails(data);
            } catch (err) {
                console.error("Error fetching bank details:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [photogId]);

    const handleCopy = (text, field) => {
        navigator.clipboard.writeText(text);
        setCopied(field);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) return <div className="mini-loader">{t('pub_loading') || 'Loading bank info...'}</div>;
    if (!details) return null;

    return (
        <div className="pending-bank-details">
            <p className="details-intro">{t('runner_transfer_details') || 'Please make the transfer to the following details:'}</p>
            {details.bank_accounts && details.bank_accounts.length > 0 ? (
                <div className="bank-accounts-selection">
                    <div className="bank-accounts-dropdown-container" style={{ marginBottom: '1.5rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>{t('checkout_choose_bank') || 'Choose Bank to Transfer To'}</label>
                        <div className="custom-bank-select" style={{ position: 'relative' }}>
                            <select 
                                value={selectedBankIndex} 
                                onChange={(e) => setSelectedBankIndex(Number(e.target.value))}
                                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', appearance: 'none', background: '#fff', fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', cursor: 'pointer' }}
                            >
                                {details.bank_accounts.map((acc, idx) => (
                                    <option key={idx} value={idx}>{acc.bank_name || `Bank Option ${idx + 1}`}</option>
                                ))}
                            </select>
                            <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                                {details.bank_accounts[selectedBankIndex]?.logo_url ? (
                                    <img src={details.bank_accounts[selectedBankIndex].logo_url} alt="Bank Logo" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                                ) : (
                                    getBankLogoUrl(details.bank_accounts[selectedBankIndex]?.bank_name) ? (
                                        <img src={getBankLogoUrl(details.bank_accounts[selectedBankIndex].bank_name)} alt="Bank Logo" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                                    ) : (
                                        <Landmark size={18} color="#64748b" />
                                    )
                                )}
                            </div>
                            <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1.5L6 6.5L11 1.5" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                        </div>
                    </div>

                    {(() => {
                        const account = details.bank_accounts[selectedBankIndex];
                        if (!account) return null;
                        return (
                            <div className="bank-details-mini-grid">
                                {account.bank_name && (
                                    <div className="mini-detail">
                                        <label>{t('bank_name') || 'Banque'}</label>
                                        <div className="copyable-row">
                                            <span>{account.bank_name}</span>
                                            <button className="mini-copy-icon" onClick={() => handleCopy(account.bank_name, 'bn')}>
                                                {copied === 'bn' ? <Check size={12} /> : <Copy size={12} />}
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {account.account_holder && (
                                    <div className="mini-detail">
                                        <label>{t('account_holder') || 'Titulaire'}</label>
                                        <div className="copyable-row">
                                            <span>{account.account_holder}</span>
                                            <button className="mini-copy-icon" onClick={() => handleCopy(account.account_holder, 'ah')}>
                                                {copied === 'ah' ? <Check size={12} /> : <Copy size={12} />}
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {account.bank_code && (
                                    <div className="mini-detail">
                                        <label>{t('bank_code') || 'Code'}</label>
                                        <div className="copyable-row">
                                            <span>{account.bank_code}</span>
                                            <button className="mini-copy-icon" onClick={() => handleCopy(account.bank_code, 'bc')}>
                                                {copied === 'bc' ? <Check size={12} /> : <Copy size={12} />}
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {account.account_number && (
                                    <div className="mini-detail">
                                        <label>{t('account_number') || 'N° Compte'}</label>
                                        <div className="copyable-row">
                                            <span>{account.account_number}</span>
                                            <button className="mini-copy-icon" onClick={() => handleCopy(account.account_number, 'an')}>
                                                {copied === 'an' ? <Check size={12} /> : <Copy size={12} />}
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {account.rib && (
                                    <div className="mini-detail full">
                                        <label>{t('bank_rib') || 'RIB / IBAN'}</label>
                                        <div className="copyable-row">
                                            <span>{account.rib}</span>
                                            <button className="mini-copy-icon" onClick={() => handleCopy(account.rib, 'rib')}>
                                                {copied === 'rib' ? <Check size={12} /> : <Copy size={12} />}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            ) : (
                <div className="bank-details-mini-grid">
                    {details.bank_name && (
                        <div className="mini-detail">
                            <label>{t('bank_name') || 'Banque'}</label>
                            <div className="copyable-row">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {getBankLogoUrl(details.bank_name) && (
                                        <img 
                                            src={getBankLogoUrl(details.bank_name)} 
                                            alt={details.bank_name} 
                                            style={{ width: '16px', height: '16px', objectFit: 'contain' }}
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                    )}
                                    <span>{details.bank_name}</span>
                                </div>
                                <button className="mini-copy-icon" onClick={() => handleCopy(details.bank_name, 'bn')}>
                                    {copied === 'bn' ? <Check size={12} /> : <Copy size={12} />}
                                </button>
                            </div>
                        </div>
                    )}
                    {details.account_holder && (
                        <div className="mini-detail">
                            <label>{t('account_holder') || 'Titulaire'}</label>
                            <div className="copyable-row">
                                <span>{details.account_holder}</span>
                                <button className="mini-copy-icon" onClick={() => handleCopy(details.account_holder, 'ah')}>
                                    {copied === 'ah' ? <Check size={12} /> : <Copy size={12} />}
                                </button>
                            </div>
                        </div>
                    )}
                    {details.bank_code && (
                        <div className="mini-detail">
                            <label>{t('bank_code') || 'Code Banque'}</label>
                            <div className="copyable-row">
                                <span>{details.bank_code}</span>
                                <button className="mini-copy-icon" onClick={() => handleCopy(details.bank_code, 'bc')}>
                                    {copied === 'bc' ? <Check size={12} /> : <Copy size={12} />}
                                </button>
                            </div>
                        </div>
                    )}
                    {details.account_number && (
                        <div className="mini-detail">
                            <label>{t('account_number') || 'N° Compte'}</label>
                            <div className="copyable-row">
                                <span>{details.account_number}</span>
                                <button className="mini-copy-icon" onClick={() => handleCopy(details.account_number, 'an')}>
                                    {copied === 'an' ? <Check size={12} /> : <Copy size={12} />}
                                </button>
                            </div>
                        </div>
                    )}
                    {details.rib && (
                        <div className="mini-detail full">
                            <label>{t('bank_rib') || 'IBAN / RIB'}</label>
                            <div className="copyable-row">
                                <span>{details.rib}</span>
                                <button className="mini-copy-icon" onClick={() => handleCopy(details.rib, 'rib')}>
                                    {copied === 'rib' ? <Check size={12} /> : <Copy size={12} />}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            {details.bank_details && (
                <div className="mini-detail full" style={{ marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                    <label>Instructions Générales</label>
                    <div className="copyable-row">
                        <pre style={{ fontSize: '0.75rem', margin: 0, fontFamily: 'inherit', whiteSpace: 'pre-wrap' }}>{details.bank_details}</pre>
                        <button className="mini-copy-icon" onClick={() => handleCopy(details.bank_details, 'desc')}>
                            {copied === 'desc' ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                    </div>
                </div>
            )}
            <style>{`.mini-loader { font-size: 0.8rem; color: #94a3b8; padding: 1rem; text-align: center; }`}</style>
        </div>
    );
};

const RunnerProfile = () => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const [toast, setToast] = useState(null);
    const [copiedOrder, setCopiedOrder] = useState(null);

    // Ref to prevent double insertion on React Strict Mode
    const processedRef = useRef(false);

    useEffect(() => {
        const initialize = async () => {
            setLoading(true);
            try {
                const sessionId = searchParams.get('session_id');
                const txId = searchParams.get('tx_id');

                let userPurchases = [];
                let guestPurchases = [];
                let txIdPurchases = [];

                // Fetch by User ID if logged in
                if (user) {
                    userPurchases = await fetchPurchases(user.id);
                }

                // Fetch by Session ID if present (regardless of auth)
                if (sessionId) {
                    guestPurchases = await fetchGuestPurchase(sessionId);
                }

                // Fetch by Transaction ID if present (manual flow)
                if (txId) {
                    txIdPurchases = await fetchPurchaseByTxId(txId);
                }

                // Merge and remove duplicates by transaction ID
                const allPurchases = [...userPurchases, ...guestPurchases, ...txIdPurchases];
                const uniquePurchases = Array.from(new Map(allPurchases.map(p => [p.id, p])).values());

                // Enrich unique purchases with photos if manual_pending
                const enrichedPurchases = await Promise.all(uniquePurchases.map(async (tx) => {
                    if (tx.status === 'manual_pending' && tx.unlocked_photo_ids?.length > 0) {
                        try {
                            const { data: photos } = await supabase
                                .from('photos')
                                .select('watermarked_url')
                                .in('id', tx.unlocked_photo_ids)
                                .limit(4); // Just show a few as preview
                            return { ...tx, photoPreviews: photos || [] };
                        } catch (e) {
                            console.error("Error fetching photo previews:", e);
                            return tx;
                        }
                    }
                    return tx;
                }));

                // Sort by date
                enrichedPurchases.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

                setPurchases(enrichedPurchases);
            } catch (err) {
                console.error("Initialization error:", err);
            } finally {
                setLoading(false);
            }
        };

        initialize();
    }, [user, searchParams]);

    const fetchPurchaseByTxId = async (txId) => {
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
                .eq('id', txId);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching purchase by txId:', error);
            return [];
        }
    };


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


    const copyToClipboard = (text, label, orderId = null) => {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            setToast({ message: `${label} copied!`, type: 'success' });
            if (orderId) {
                setCopiedOrder(orderId);
                setTimeout(() => setCopiedOrder(null), 2000);
            }
        }).catch(err => {
            console.error('Failed to copy: ', err);
            setToast({ message: 'Erreur lors de la copie.', type: 'error' });
        });
    };

    const [uploading, setUploading] = useState(null);

    const handleUploadProof = async (transactionId, file) => {
        if (!file) return;
        setUploading(transactionId);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${transactionId}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('payment-proofs')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('payment-proofs')
                .getPublicUrl(filePath);

            const { error: updateError } = await supabase
                .from('transactions')
                .update({ payment_proof_url: publicUrl })
                .eq('id', transactionId);

            if (updateError) throw updateError;

            // Update local state
            setPurchases(prev => prev.map(p =>
                p.id === transactionId ? { ...p, payment_proof_url: publicUrl } : p
            ));

            setToast({ message: 'Payment proof sent successfully!', type: 'success' });

        } catch (error) {
            console.error("Error uploading proof:", error);
            setToast({ message: 'Erreur lors de l\'envoi de la preuve.', type: 'error' });
        } finally {
            setUploading(null);
        }
    };

    return (
        <div className="purchases-container">
            <header className="purchases-header">
                <h1 className="purchases-title">{t('runner_my_purchases')}</h1>
                <p className="purchases-subtitle">{t('cart_browse_desc') || "Manage and download your professional photography collections."}</p>
            </header>

            {loading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>{t('pub_loading') || 'Loading...'}</p>
                </div>
            ) : purchases.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon"><ShoppingBag size={64} strokeWidth={1} /></div>
                    <h3 className="empty-title">{t('runner_no_purchases')}</h3>
                    <p className="empty-text">{t('cart_browse_desc')}</p>
                    <Button onClick={() => navigate('/albums')} className="mt-4">{t('runner_browse_albums')}</Button>
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
                                        <p className="photographer-name">{t('pub_by')} {tx.albums?.profiles?.full_name}</p>
                                        <div className="purchase-meta">
                                            <span className="purchase-date">{new Date(tx.created_at).toLocaleDateString()}</span>
                                            <span className="meta-divider">•</span>
                                            <span className="purchase-amount">{formatPrice(tx.amount, tx.currency)}</span>
                                        </div>
                                        <div className="order-number-display">
                                            <span className="order-label">{t('runner_order_number')}:</span>
                                            <span className="order-value">{tx.order_number || 'N/A'}</span>
                                            {tx.order_number && (
                                                <button 
                                                    className="order-copy-btn"
                                                    onClick={() => copyToClipboard(tx.order_number, 'Order number', tx.id)}
                                                    title="Copy Order Number"
                                                >
                                                    {copiedOrder === tx.id ? <Check size={14} /> : <Copy size={14} />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="purchase-actions">
                                    <Button
                                        className="download-btn"
                                        disabled={tx.status === 'manual_pending'}
                                        onClick={() => {
                                            const url = `/my-purchases/${tx.album_id}${!user ? `?session_id=${tx.stripe_payment_intent_id}` : ''}`;
                                            navigate(url);
                                        }}
                                    >
                                        <Download size={16} />
                                        {tx.status === 'manual_pending' ? t('db_pending_approval') : t('runner_download_all')}
                                    </Button>
                                </div>
                            </div>

                            {tx.status === 'manual_pending' && (
                                <div className="pending-preview-section">
                                    <div className="pending-header">
                                        <p className="pending-message">
                                            {t('runner_waiting_payment') || '⌛ Waiting for photographer to check payment status. Your photos will be revealed once confirmed.'}
                                        </p>
                                    </div>
                                    {tx.albums?.profiles && tx.status === 'manual_pending' && (
                                        <BankDetails photogId={tx.albums.photographer_id} />
                                    )}

                                    {tx.photographer_message && (
                                        <div className="photographer-message-bubble">
                                            <div className="message-header">
                                                <MessageSquare size={14} />
                                                <span>{t('runner_photographer_message') || 'Message du photographe :'}</span>
                                            </div>
                                            <p>{tx.photographer_message}</p>
                                        </div>
                                    )}

                                    <div className="proof-upload-section">
                                        {tx.payment_proof_url ? (
                                            <div className="proof-uploaded">
                                                <div className="proof-indicator">
                                                    <Check size={14} className="check-icon" />
                                                    <span>{t('runner_proof_sent') || 'Payment proof sent'}</span>
                                                </div>
                                                <a href={tx.payment_proof_url} target="_blank" rel="noopener noreferrer" className="view-proof-link">
                                                    <ImageIcon size={14} />
                                                    {t('runner_view_proof') || 'Voir mon justificatif'}
                                                </a>
                                            </div>
                                        ) : (
                                            <div className="upload-box">
                                                <label className="upload-label">
                                                    {uploading === tx.id ? (
                                                        <Loader className="spinner" size={20} />
                                                    ) : (
                                                        <Upload size={20} />
                                                    )}
                                                    <span>{uploading === tx.id ? t('db_sending') : (t('runner_send_proof') || 'Envoyer une preuve de paiement')}</span>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => handleUploadProof(tx.id, e.target.files[0])}
                                                        disabled={uploading === tx.id}
                                                        hidden
                                                    />
                                                </label>
                                            </div>
                                        )}
                                    </div>

                                    {tx.photoPreviews?.length > 0 && (
                                        <div className="photo-previews-grid">
                                            {tx.photoPreviews.map((p, idx) => (
                                                <div key={idx} className="preview-item">
                                                    <img src={p.watermarked_url} alt="preview" />
                                                    <div className="watermark-overlay">PREVIEW</div>
                                                </div>
                                            ))}
                                            {tx.unlocked_photo_ids?.length > 4 && (
                                                <div className="preview-more">
                                                    +{tx.unlocked_photo_ids.length - 4} photos
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="purchase-footer">
                                <div className={`status-badge ${tx.status}`}>
                                    {tx.status === 'manual_pending' ? (
                                        <>
                                            <Landmark size={14} style={{ marginRight: '4px' }} />
                                            Virement en attente de validation par le photographe
                                        </>
                                    ) : (
                                        <>
                                            <Check size={14} style={{ marginRight: '4px' }} />
                                            Lifetime Access Unlocked
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )
            }

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

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

                .order-number-display {
                    margin-top: 0.5rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: #f8fafc;
                    padding: 4px 8px;
                    border-radius: 6px;
                    width: fit-content;
                    border: 1px solid #e2e8f0;
                }

                .order-label {
                    font-size: 0.65rem;
                    font-weight: 800;
                    color: #94a3b8;
                    letter-spacing: 0.05em;
                }

                .order-value {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #475569;
                    font-family: monospace;
                }

                .order-copy-btn {
                    background: none;
                    border: none;
                    color: #94a3b8;
                    cursor: pointer;
                    display: flex;
                    padding: 2px;
                    transition: all 0.2s;
                }

                .order-copy-btn:hover {
                    color: var(--primary-blue);
                    transform: scale(1.1);
                }

                .purchase-footer {
                    padding: var(--spacing-sm) var(--spacing-lg);
                    background: var(--bg-secondary);
                    border-top: 1px solid var(--border-light);
                }

                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #15803d;
                    padding: 0.25rem 0.75rem;
                    background: #dcfce7;
                    border-radius: 99px;
                }

                .status-badge.manual_pending {
                    background: #fff7ed;
                    color: #9a3412;
                    border: 1px solid #ffedd5;
                }

                .pending-preview-section {
                    padding: var(--spacing-lg);
                    background: #fffcf9;
                    border-top: 1px solid #ffedd5;
                }

                .pending-header {
                    margin-bottom: var(--spacing-md);
                }

                .pending-message {
                    font-size: 0.9rem;
                    color: #9a3412;
                    background: #fff7ed;
                    padding: 0.75rem 1rem;
                    border-radius: var(--radius-lg);
                    display: inline-block;
                }

                .photo-previews-grid {
                    display: flex;
                    gap: var(--spacing-sm);
                    margin-top: var(--spacing-sm);
                }

                .preview-item {
                    position: relative;
                    width: 60px;
                    height: 60px;
                    border-radius: var(--radius-md);
                    overflow: hidden;
                    border: 1px solid #e2e8f0;
                }

                .preview-item img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    filter: blur(0.5px);
                }

                .watermark-overlay {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.5rem;
                    font-weight: 900;
                    color: rgba(255,255,255,0.8);
                    background: rgba(0,0,0,0.2);
                    text-transform: uppercase;
                    pointer-events: none;
                }

                .preview-more {
                    width: 60px;
                    height: 60px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.8rem;
                    font-weight: 700;
                    color: #64748b;
                    background: #f1f5f9;
                    border-radius: var(--radius-md);
                }
                .pending-bank-details {
                    margin-top: 1rem;
                    padding: 1rem;
                    background: white;
                    border-radius: 12px;
                    border: 1px solid #fed7aa;
                }
                .bank-details-mini-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 0.75rem;
                }
                .mini-detail label {
                    font-size: 0.65rem;
                    font-weight: 800;
                    color: #94a3b8;
                    text-transform: uppercase;
                }
                .mini-detail span {
                    font-size: 0.85rem;
                    font-weight: 700;
                    color: #1e293b;
                }
                .mini-copy-icon {
                    background: #f1f5f9;
                    border: none;
                    border-radius: 4px;
                    padding: 2px 4px;
                    cursor: pointer;
                    display: flex;
                    color: #64748b;
                }
                .mini-copy-icon:hover {
                    background: #e2e8f0;
                    color: #0f172a;
                }

                .photographer-message-bubble {
                    margin-top: 1rem;
                    background: #eff6ff;
                    border: 1px solid #bfdbfe;
                    padding: 1rem;
                    border-radius: 12px;
                }

                .message-header {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.75rem;
                    font-weight: 800;
                    color: #1e40af;
                    margin-bottom: 0.5rem;
                    text-transform: uppercase;
                }

                .photographer-message-bubble p {
                    font-size: 0.9rem;
                    color: #1e3a8a;
                    margin: 0;
                    line-height: 1.5;
                }

                .proof-upload-section {
                    margin-top: 1rem;
                }

                .upload-box {
                    border: 2px dashed #e2e8f0;
                    border-radius: 12px;
                    padding: 1rem;
                    transition: all 0.2s;
                }

                .upload-box:hover {
                    border-color: var(--primary-blue);
                    background: #f8fafc;
                }

                .upload-label {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.5rem;
                    cursor: pointer;
                    color: #64748b;
                    font-size: 0.85rem;
                    font-weight: 600;
                }

                .upload-label:hover {
                    color: var(--primary-blue);
                }

                .proof-uploaded {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: #f0fdf4;
                    border: 1px solid #bbf7d0;
                    padding: 0.75rem 1rem;
                    border-radius: 12px;
                }

                .proof-indicator {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: #166534;
                    font-size: 0.85rem;
                    font-weight: 700;
                }

                .view-proof-link {
                    display: flex;
                    align-items: center;
                    gap: 0.4rem;
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: #166534;
                    text-decoration: none;
                    padding: 4px 8px;
                    background: white;
                    border-radius: 6px;
                    border: 1px solid #bbf7d0;
                }

                .download-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem 1.25rem !important;
                    border: 1.5px solid var(--primary-blue) !important;
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
        </div >
    );
};

export default RunnerProfile;
