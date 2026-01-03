import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

    // Use Portal to render directly to body, bypassing any app container stacking contexts
    return createPortal(
        <div
            className={`floating-cart-badge ${isPulsing ? 'pulse' : ''}`}
            onClick={() => navigate('/cart')}
            title="View Cart"
            role="button"
            aria-label={`View Cart (${count} items)`}
        >
            <div className="cart-icon-wrapper">
                <ShoppingCart size={24} />
                {count > 0 && (
                    <span className="cart-count-badge">{count}</span>
                )}
            </div>
        </div>,
        document.body
    );
};

export default FloatingCart;
