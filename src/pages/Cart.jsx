import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import CheckoutModal from '../components/CheckoutModal';
import Modal from '../components/ui/Modal';
import { supabase } from '../lib/supabase';
import { calculateCommission } from '../config/platform';
import { ShoppingCart, Trash2, CreditCard, CheckCircle, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

const Cart = () => {
    const { cartItems, removeFromCart, clearCart, calculateTotal } = useCart();
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [purchasing, setPurchasing] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [processedSessionId, setProcessedSessionId] = useState(null);

    // Lightbox State
    const [selectedPhotoForView, setSelectedPhotoForView] = useState(null);

    // Checkout Modal State
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [activeGroup, setActiveGroup] = useState(null); // The album group being purchased
    const [activeAlbumId, setActiveAlbumId] = useState(null);

    // Success Modal State
    const [showSuccess, setShowSuccess] = useState(false);

    // Ref to prevent double processing
    const processedRef = React.useRef(false);

    const successParam = searchParams.get('success');
    const sessionIdParam = searchParams.get('session_id');

    useEffect(() => {
        let isMounted = true;

        const handleTransactionRecording = async () => {
            // Only run if success=true and we have a session ID
            if (successParam !== 'true' || !sessionIdParam) return;

            // Wait for auth to settle
            if (authLoading) return;

            // Prevent double-firing within the same mount
            if (processedRef.current) return;
            processedRef.current = true;

            const albumId = searchParams.get('album_id');
            const photographerId = searchParams.get('photographer_id');
            const amountStr = searchParams.get('amount');
            const photosParam = searchParams.get('photos');

            try {
                // 1. Idempotency Check: Don't insert if we already have this transaction
                const { data: existing } = await supabase
                    .from('transactions')
                    .select('id')
                    .eq('stripe_payment_intent_id', sessionIdParam)
                    .maybeSingle();

                if (existing) {
                    console.log("Transaction already exists. Skipping insert.");
                } else {
                    // 2. Prepare Data
                    const amount = parseFloat(amountStr);
                    let photoIds = null;
                    if (photosParam) {
                        try {
                            photoIds = JSON.parse(decodeURIComponent(photosParam));
                        } catch (e) {
                            console.error("Error parsing photo IDs:", e);
                        }
                    }

                    // 3. Insert Transaction
                    const { error } = await supabase.from('transactions').insert({
                        buyer_id: user?.id || null, // Can be null (guest)
                        photographer_id: photographerId,
                        album_id: albumId,
                        amount: amount,
                        commission_amount: calculateCommission(amount),
                        stripe_payment_intent_id: sessionIdParam,
                        status: 'paid',
                        unlocked_photo_ids: photoIds
                    });

                    if (error) {
                        console.error("Failed to record transaction:", error);
                        alert("Database Error: " + error.message + ". Please contact support with Session ID: " + sessionIdParam);
                    } else {
                        console.log("Transaction recorded successfully via Cart return.");
                    }
                }
            } catch (err) {
                console.error("Error processing return:", err);
                alert("Unexpected Error during recording: " + err.message);
            } finally {
                if (isMounted) {
                    setProcessedSessionId(sessionIdParam);
                    setShowSuccess(true);
                    clearCart();

                    // 4. Clean URL (Critical to stop loops)
                    setSearchParams(prev => {
                        const newParams = new URLSearchParams(prev);
                        ['success', 'session_id', 'album_id', 'amount', 'photographer_id', 'photos']
                            .forEach(key => newParams.delete(key));
                        return newParams;
                    }, { replace: true });
                }
            }
        };

        handleTransactionRecording();

        return () => { isMounted = false; };
    }, [successParam, sessionIdParam, authLoading, clearCart, setSearchParams]);

    // Auto-redirect after success
    useEffect(() => {
        if (showSuccess) {
            const timer = setTimeout(() => {
                const url = processedSessionId ? `/my-purchases?session_id=${processedSessionId}` : '/my-purchases';
                navigate(url);
            }, 3000); // 3 seconds delay
            return () => clearTimeout(timer);
        }
    }, [showSuccess, processedSessionId, navigate]);


    // Group items by album for better UI and pricing logic
    const groupedItems = cartItems.reduce((acc, item) => {
        if (!acc[item.album_id]) {
            acc[item.album_id] = {
                album_title: item.album_title,
                photographer_id: item.photographer_id,
                photographer_name: item.photographer_name,
                pricing_package: item.pricing_package,
                album_price: item.album_price,
                items: []
            };
        }
        acc[item.album_id].items.push(item);
        return acc;
    }, {});

    const initiateCheckout = (albumId, group) => {
        setActiveAlbumId(albumId);
        setActiveGroup(group);
        setIsCheckoutOpen(true);
    };

    const handleConfirmCheckout = async (checkoutData) => {
        setPurchasing(true);
        try {
            const group = activeGroup;
            const albumId = activeAlbumId;

            // 1. Get Photographer Stripe ID
            const { data: photographer, error } = await supabase
                .from('profiles')
                .select('stripe_account_id')
                .eq('id', group.photographer_id)
                .single();

            if (error || !photographer.stripe_account_id) {
                alert("This photographer has not set up payments yet.");
                setPurchasing(false);
                setIsCheckoutOpen(false);
                return;
            }

            // Calculate price for THIS group
            let groupPrice = 0;
            const count = group.items.length;
            if (group.pricing_package && group.pricing_package.tiers) {
                const tiers = [...group.pricing_package.tiers].sort((a, b) => b.quantity - a.quantity);
                const activeTier = tiers.find(tier => count >= tier.quantity);
                const unitPrice = activeTier ? activeTier.price : (tiers[tiers.length - 1]?.price || 0);
                groupPrice = count * unitPrice;
            } else {
                groupPrice = group.album_price;
            }



            // 2. Create Session (Mode: Embedded)
            const { createCheckoutSession } = await import('../lib/stripe/service');
            const commission = calculateCommission(groupPrice);
            const photoIdsArray = group.items.map(i => i.id);

            // Use the passed email from modal, or user's email as fallback
            const customerEmail = checkoutData.email || user?.email;

            const session = await createCheckoutSession(
                albumId,
                groupPrice,
                photographer.stripe_account_id,
                commission,
                photoIdsArray,
                null,
                customerEmail,
                'embedded',
                group.photographer_id // <--- Correct Supabase UUID
            );

            setPurchasing(false);

            if (session.client_secret) {
                return session.client_secret;
            } else {
                throw new Error("No client secret received.");
            }
        } catch (error) {
            console.error(error);
            alert('Payment failed: ' + error.message);
            setPurchasing(false);
            setIsCheckoutOpen(false);
        }
    };

    const styles = (
        <style>{`
            .cart-container {
                max-width: 1400px;
                margin: 0 auto;
                padding: 3rem 4rem;
                min-height: calc(100vh - 80px);
                width: 100%;
            }

            .cart-title {
                font-size: clamp(2rem, 5vw, 3rem);
                font-weight: 800;
                margin-bottom: 3rem;
                letter-spacing: -0.02em;
            }

            .cart-grid {
                display: grid;
                grid-template-columns: 1fr 380px;
                gap: 4rem;
                align-items: start;
            }

            .cart-album-group {
                background: white;
                border: 1px solid var(--border-light);
                border-radius: 16px;
                overflow: hidden;
                margin-bottom: 2rem;
            }

            .album-group-header {
                padding: 1.5rem;
                background: var(--bg-secondary);
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid var(--border-light);
            }

            .album-group-header h3 {
                margin: 0;
                font-size: 1.1rem;
            }

            .photographer-tag {
                font-size: 0.85rem;
                color: var(--text-secondary);
            }

            .group-count {
                font-weight: 700;
                color: var(--primary-blue);
                font-size: 0.9rem;
                background: white;
                padding: 0.4rem 0.8rem;
                border-radius: 99px;
                border: 1px solid var(--border-light);
            }

            .album-package-info {
                padding: 1rem 1.5rem;
                background: #f8fafc;
                border-bottom: 1px solid var(--border-light);
            }

            .pkg-detail-header {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin-bottom: 0.25rem;
            }

            .pkg-detail-name {
                font-size: 0.9rem;
                font-weight: 700;
                color: var(--text-primary);
            }

            .pkg-detail-type {
                font-size: 0.65rem;
                font-weight: 800;
                text-transform: uppercase;
                padding: 0.15rem 0.4rem;
                border-radius: 4px;
            }

            .pkg-detail-type.digital {
                color: #0369a1;
                background: #e0f2fe;
            }

            .pkg-detail-type.physical {
                color: #92400e;
                background: #fef3c7;
            }

            .pkg-detail-desc {
                font-size: 0.8rem;
                color: var(--text-secondary);
                line-height: 1.4;
            }

            .cart-items-list {
                padding: 1rem;
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }

            .cart-item-card {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 0.75rem;
                border-radius: 10px;
                transition: background 0.2s ease;
            }

            .cart-item-card:hover {
                background: var(--bg-secondary);
            }

            .item-preview {
                width: 80px;
                height: 60px;
                border-radius: 6px;
                overflow: hidden;
                flex-shrink: 0;
                cursor: pointer; /* Added cursor pointer */
                transition: transform 0.2s ease;
            }
            
            .item-preview:hover {
                transform: scale(1.05); /* Added slight zoom hint */
            }

            .item-preview img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            .remove-item-btn {
                margin-left: auto;
                background: none;
                border: none;
                color: var(--text-tertiary);
                cursor: pointer;
                padding: 0.5rem;
                transition: color 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .remove-item-btn:hover {
                color: var(--danger-red);
            }

            .album-group-footer {
                padding: 1rem 1.5rem;
                background: var(--bg-primary);
                border-top: 1px solid var(--border-light);
                text-align: right;
            }

            .group-checkout-btn {
                width: auto;
                font-size: 0.9rem !important;
                display: inline-flex;
                align-items: center;
            }

            .cart-summary-card {
                background: white;
                padding: 2rem;
                border-radius: 20px;
                border: 1px solid var(--border-light);
                position: sticky;
                top: 110px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.05);
            }

            .cart-summary-card h3 {
                margin-bottom: 1.5rem;
                font-size: 1.25rem;
            }

            .summary-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 1rem;
                color: var(--text-secondary);
                font-weight: 500;
            }

            .summary-row.total {
                margin-top: 1.5rem;
                padding-top: 1.5rem;
                border-top: 2px solid var(--border-light);
                color: var(--text-primary);
                font-size: 1.2rem;
                font-weight: 800;
            }

            .summary-note {
                font-size: 0.75rem;
                color: var(--text-tertiary);
                margin: 1.5rem 0;
                line-height: 1.4;
            }

            .clear-cart-btn {
                width: 100%;
                color: var(--text-secondary) !important;
                font-size: 0.85rem !important;
            }

            .clear-cart-btn:hover {
                background: #F5A623 !important;
                border-color: #F5A623 !important;
                color: white !important;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(245, 166, 35, 0.3) !important;
            }

            .cart-empty-state {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: calc(100vh - 200px);
                text-align: center;
                padding: 2rem;
                width: 100%;
            }

            .empty-icon {
                color: var(--text-tertiary);
                margin-bottom: 2rem;
                opacity: 0.2;
            }

            .cart-empty-state h2 {
                font-size: 2rem;
                margin-bottom: 1rem;
            }

            .cart-empty-state p {
                color: var(--text-secondary);
                margin: 0 auto 2rem auto;
                max-width: 400px;
                line-height: 1.6;
            }

            .cart-empty-state {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: calc(100vh - 200px);
                text-align: center;
                padding: 2rem;
            }

            /* --- LIGHTBOX CSS --- */
            .custom-lightbox-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.95);
                backdrop-filter: blur(20px);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 2rem;
                animation: lightboxIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            }

            @keyframes lightboxIn {
                from { opacity: 0; backdrop-filter: blur(0px); }
                to { opacity: 1; backdrop-filter: blur(20px); }
            }

            .lightbox-container {
                position: relative;
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }

            .lightbox-close-icon {
                position: fixed;
                top: 2rem;
                right: 2rem;
                background: rgba(255, 255, 255, 0.15);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: white;
                width: 56px;
                height: 56px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s;
                z-index: 10001;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            }

            .lightbox-close-icon:hover {
                background: rgba(255, 255, 255, 0.25);
                transform: scale(1.05);
            }

            .lightbox-main-view {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100%;
                padding-bottom: 20px;
            }

            .lightbox-image-main {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
                border-radius: 8px;
                box-shadow: 0 30px 100px rgba(0,0,0,0.7);
                animation: imageZoom 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            }

            @keyframes imageZoom {
                from { opacity: 0; transform: scale(0.92); }
                to { opacity: 1; transform: scale(1); }
            }
            /* ------------------- */


            @media (max-width: 900px) {
                .cart-container {
                    padding: 2rem 1rem; /* Reduced horizontal padding */
                }

                .cart-grid {
                    grid-template-columns: 1fr;
                    gap: 2rem;
                }

                .cart-summary-column {
                    order: -1;
                }

                .cart-summary-card {
                    position: static;
                    margin-bottom: 2rem;
                    padding: 1.5rem; /* Slightly reduced padding */
                }
            }

            @media (max-width: 600px) {
                .cart-title {
                    font-size: 1.75rem; /* Smaller title */
                    margin-bottom: 2rem;
                    text-align: center;
                }

                .album-group-header {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 0.5rem;
                }
                
                .group-count {
                    align-self: flex-start;
                    font-size: 0.8rem;
                }

                .item-preview {
                    width: 70px;
                    height: 50px;
                }

                .cart-empty-state h2 {
                    font-size: 1.5rem;
                }

                .cart-empty-state p {
                    font-size: 0.9rem;
                    padding: 0 1rem;
                }

                /* Full width buttons for easier tapping */
                .group-checkout-btn {
                    width: 100% !important; 
                    justify-content: center;
                    padding: 1rem !important; /* Larger touch target */
                }
                
                .remove-item-btn {
                    padding: 0.75rem; /* Larger touch target */
                }
                
                .cart-items-list {
                    padding: 0.75rem;
                }

                .lightbox-close-icon {
                    top: 1.5rem;
                    right: 1.5rem;
                    width: 44px;
                    height: 44px;
                }
            }
        `}</style>
    );

    if (cartItems.length === 0) {
        return (
            <div className="cart-container">
                {styles}
                <div className="cart-empty-state">
                    <div className="empty-icon"><ShoppingCart size={80} strokeWidth={1} /></div>
                    <h2>Your cart is empty</h2>
                    <p>Browse our albums and select your favorite photos.</p>
                    <Link to="/albums">
                        <Button variant="primary">Explore Albums</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="cart-container">
            <h1 className="cart-title">My Cart</h1>

            <div className="cart-grid">
                <div className="cart-items-column">
                    {Object.entries(groupedItems).map(([albumId, group]) => (
                        <div key={albumId} className="cart-album-group">
                            <div className="album-group-header">
                                <div>
                                    <h3>{group.album_title}</h3>
                                    <span className="photographer-tag">by {group.photographer_name}</span>
                                </div>
                                <div className="group-count">
                                    {group.items.length} photo{group.items.length > 1 ? 's' : ''}
                                </div>
                            </div>

                            {group.pricing_package && (
                                <div className="album-package-info">
                                    <div className="pkg-detail-header">
                                        <span className="pkg-detail-name">{group.pricing_package.name}</span>
                                        <span className={`pkg-detail-type ${group.pricing_package.package_type}`}>
                                            {group.pricing_package.package_type}
                                        </span>
                                    </div>
                                    {group.pricing_package.description && (
                                        <p className="pkg-detail-desc">{group.pricing_package.description}</p>
                                    )}
                                </div>
                            )}

                            <div className="cart-items-list">
                                {group.items.map(item => (
                                    <div key={item.id} className="cart-item-card">
                                        <div className="item-preview" onClick={() => setSelectedPhotoForView(item)}>
                                            <img src={item.watermarked_url} alt={item.title} />
                                        </div>
                                        <button
                                            className="remove-item-btn"
                                            onClick={() => {
                                                setItemToDelete(item.id);
                                                setIsDeleteModalOpen(true);
                                            }}
                                            title="Remove"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="album-group-footer">
                                <Button
                                    className="group-checkout-btn action-btn"
                                    onClick={() => initiateCheckout(albumId, group)}
                                    disabled={purchasing}
                                >
                                    <CreditCard size={16} style={{ marginRight: '8px' }} />
                                    {purchasing ? 'Processing...' : `Buy these ${group.items.length} photos`}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="cart-summary-column">
                    <div className="cart-summary-card">
                        <h3>Summary</h3>
                        <div className="summary-row">
                            <span>Total photos</span>
                            <span>{cartItems.length}</span>
                        </div>
                        <div className="summary-row total">
                            <span>Estimated Total</span>
                            <span>${calculateTotal()}</span>
                        </div>
                        <p className="summary-note">
                            * Final price is calculated per album based on volume discounts.
                        </p>
                        <Button
                            className="clear-cart-btn action-btn"
                            onClick={clearCart}
                        >
                            Clear Cart
                        </Button>
                    </div>
                </div>
            </div >

            {styles}

            < Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={() => {
                    if (itemToDelete) {
                        removeFromCart(itemToDelete);
                        setItemToDelete(null);
                        setIsDeleteModalOpen(false);
                    }
                }}
                title="Remove Photo"
                message="Are you sure you want to remove this photo from your cart?"
                confirmText="Remove"
                cancelText="Keep"
                variant="danger"
            />

            <CheckoutModal
                isOpen={isCheckoutOpen}
                onClose={() => setIsCheckoutOpen(false)}
                onConfirm={handleConfirmCheckout}
                totalAmount={(function () {
                    // Calculate total for just this group
                    if (!activeGroup) return 0;
                    const count = activeGroup.items.length;
                    if (activeGroup.pricing_package && activeGroup.pricing_package.tiers) {
                        const tiers = [...activeGroup.pricing_package.tiers].sort((a, b) => b.quantity - a.quantity);
                        const activeTier = tiers.find(tier => count >= tier.quantity);
                        const unitPrice = activeTier ? activeTier.price : (tiers[tiers.length - 1]?.price || 0);
                        return (count * unitPrice).toFixed(2);
                    }
                    return activeGroup.album_price.toFixed(2);
                })()}
                isLoading={purchasing}
            />

            <Modal
                isOpen={showSuccess}
                onClose={() => setShowSuccess(false)}
                title="Payment Successful!"
                message={
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#10b981', marginBottom: '1rem' }}>
                            <CheckCircle size={48} />
                        </div>
                        <p>Thank you for your purchase. Your photos have been unlocked and are ready for download.</p>
                        <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#6b7280' }}>
                            Redirecting to My Purchases in a few seconds...
                        </p>
                    </div>
                }
                confirmText="View My Photos"
                onConfirm={() => {
                    const url = processedSessionId ? `/my-purchases?session_id=${processedSessionId}` : '/my-purchases';
                    navigate(url);
                }}
                showCancel={false}
            />

            {/* Photo View Modal in Cart */}
            {selectedPhotoForView && (
                <div className="custom-lightbox-overlay" onClick={() => setSelectedPhotoForView(null)}>
                    <div className="lightbox-container" onClick={e => e.stopPropagation()}>
                        <button
                            className="lightbox-close-icon"
                            onClick={() => setSelectedPhotoForView(null)}
                            title="Close"
                        >
                            <X size={32} />
                        </button>

                        <div className="lightbox-main-view">
                            <img
                                src={selectedPhotoForView.watermarked_url}
                                alt={selectedPhotoForView.title}
                                className="lightbox-image-main"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default Cart;
