import React, { useState, useEffect } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const FloatingCart = () => {
    const { getItemCount } = useCart();
    const { profile } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isPulsing, setIsPulsing] = useState(false);
    const count = getItemCount();

    // Trigger pulse animation when count changes
    useEffect(() => {
        if (count > 0) {
            setIsPulsing(true);
            const timer = setTimeout(() => setIsPulsing(false), 1000);
            return () => clearTimeout(timer);
        }
    }, [count]);

    // Don't show for photographers or admins as they manage, don't buy (typically)
    // However, user asked for it to be visible. Let's show it unless we're on the cart page itself.
    if (location.pathname === '/cart') return null;

    // Also usually photographers/admins don't need this, but user request implies global visibility.
    // If you want stricter visibility (e.g. only for buyers), uncomment below:
    // if (profile?.role === 'photographer' || profile?.role === 'admin') return null;

    return (
        <div
            className={`floating-cart-badge ${isPulsing ? 'pulse' : ''}`}
            onClick={() => navigate('/cart')}
            title="View Cart"
        >
            <div className="cart-icon-wrapper">
                <ShoppingCart size={24} />
                {count > 0 && (
                    <span className="cart-count-badge">{count}</span>
                )}
            </div>

            <style>{`
                .floating-cart-badge {
                    position: fixed;
                    right: 24px;
                    top: 50%;
                    transform: translateY(-50%);
                    z-index: 9999;
                    background: #f97316; /* Vibrant Brand Orange */
                    color: white;
                    width: 56px;
                    height: 56px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    box-shadow: 0 10px 25px -5px rgba(249, 115, 22, 0.4), 
                                0 8px 10px -6px rgba(249, 115, 22, 0.4);
                    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    border: 2px solid rgba(255, 255, 255, 0.2);
                }

                .floating-cart-badge:hover {
                    transform: translateY(-50%) scale(1.1);
                    background: #ea580c;
                    box-shadow: 0 20px 25px -5px rgba(249, 115, 22, 0.5);
                }

                .cart-icon-wrapper {
                    position: relative;
                }

                .cart-count-badge {
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    background: #1e293b;
                    color: white;
                    font-size: 0.7rem;
                    font-weight: 800;
                    min-width: 20px;
                    height: 20px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0 4px;
                    border: 2px solid #f97316;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }

                .pulse {
                    animation: cart-pulse 1s ease-out;
                }

                @keyframes cart-pulse {
                    0% { transform: translateY(-50%) scale(1); }
                    50% { transform: translateY(-50%) scale(1.3); }
                    100% { transform: translateY(-50%) scale(1); }
                }

                @media (max-width: 768px) {
                    .floating-cart-badge {
                        right: 16px;
                        width: 48px;
                        height: 48px;
                    }
                    
                    /* Maybe move to bottom right on mobile if it blocks content */
                    /* Uncomment if bottom-right is preferred for mobile thumb reach */
                    /*
                    .floating-cart-badge {
                        top: auto;
                        bottom: 80px;
                        transform: none;
                    }
                    .floating-cart-badge:hover {
                        transform: scale(1.1);
                    }
                    */
                }
            `}</style>
        </div>
    );
};

export default FloatingCart;
