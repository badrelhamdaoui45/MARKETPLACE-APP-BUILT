import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { calculateCommission } from '../config/platform';
import { ShoppingCart, Trash2, CreditCard } from 'lucide-react';

const Cart = () => {
    const { cartItems, removeFromCart, clearCart, calculateTotal } = useCart();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [purchasing, setPurchasing] = useState(false);

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

    const handleCheckout = async (albumId, group) => {
        setPurchasing(true);
        try {
            // 1. Get Photographer Stripe ID
            const { data: photographer, error } = await supabase
                .from('profiles')
                .select('stripe_account_id')
                .eq('id', group.photographer_id)
                .single();

            if (error || !photographer.stripe_account_id) {
                alert("This photographer has not set up payments yet.");
                setPurchasing(false);
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

            // 2. Create Session
            const { createCheckoutSession } = await import('../lib/stripe/service');
            const commission = calculateCommission(groupPrice);
            const photoIdsArray = group.items.map(i => i.id);

            const session = await createCheckoutSession(
                albumId,
                groupPrice,
                photographer.stripe_account_id,
                commission,
                photoIdsArray,
                `${window.location.origin}/cart`,
                user?.email
            );

            if (session.url) {
                window.location.href = session.url;
            } else {
                throw new Error("Error redirecting to payment.");
            }
        } catch (error) {
            console.error(error);
            alert('Payment failed: ' + error.message);
            setPurchasing(false);
        }
    };

    const styles = (
        <style>{`
            .cart-container {
                max-width: 1100px;
                margin: 0 auto;
                padding: 3rem 1.5rem;
                min-height: calc(100vh - 80px);
            }

            .cart-title {
                font-size: 2.5rem;
                font-weight: 800;
                margin-bottom: 2.5rem;
                letter-spacing: -0.02em;
            }

            .cart-grid {
                display: grid;
                grid-template-columns: 1fr 340px;
                gap: 2.5rem;
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

            @media (max-width: 900px) {
                .cart-grid {
                    grid-template-columns: 1fr;
                }

                .cart-summary-column {
                    order: -1;
                }

                .cart-summary-card {
                    position: static;
                    margin-bottom: 2rem;
                }
            }

            @media (max-width: 600px) {
                .cart-title {
                    font-size: 2rem;
                }

                .item-preview {
                    width: 60px;
                    height: 45px;
                }

                .cart-empty-state h2 {
                    font-size: 1.5rem;
                }

                .cart-empty-state p {
                    font-size: 0.9rem;
                    padding: 0 1rem;
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

                            <div className="cart-items-list">
                                {group.items.map(item => (
                                    <div key={item.id} className="cart-item-card">
                                        <div className="item-preview">
                                            <img src={item.watermarked_url} alt={item.title} />
                                        </div>
                                        <button
                                            className="remove-item-btn"
                                            onClick={() => removeFromCart(item.id)}
                                            title="Remove"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="album-group-footer">
                                <Button
                                    variant="outline"
                                    className="group-checkout-btn"
                                    onClick={() => handleCheckout(albumId, group)}
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
                            className="clear-cart-btn"
                            variant="ghost"
                            onClick={clearCart}
                        >
                            Clear Cart
                        </Button>
                    </div>
                </div>
            </div>

            {styles}
        </div>
    );
};

export default Cart;
