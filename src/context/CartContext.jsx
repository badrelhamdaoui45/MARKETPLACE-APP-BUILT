
import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) throw new Error('useCart must be used within a CartProvider');
    return context;
};

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState(() => {
        const savedCart = localStorage.getItem('photomarket_cart');
        if (savedCart) {
            try {
                return JSON.parse(savedCart);
            } catch (error) {
                console.error('Failed to parse cart from localStorage:', error);
                return [];
            }
        }
        return [];
    });

    // Save cart to localStorage on change
    useEffect(() => {
        localStorage.setItem('photomarket_cart', JSON.stringify(cartItems));
    }, [cartItems]);

    const addToCart = (photo, album) => {
        setCartItems(prev => {
            // Avoid duplicates
            if (prev.some(item => item.id === photo.id)) return prev;

            const newItem = {
                id: photo.id,
                watermarked_url: photo.watermarked_url,
                title: photo.title || 'Photo',
                album_id: album.id,
                album_title: album.title,
                photographer_id: album.photographer_id,
                photographer_name: album.profiles?.full_name || 'Photographer',
                pricing_package: album.pricing_packages,
                album_price: album.price
            };

            return [...prev, newItem];
        });
    };

    const removeFromCart = (photoId) => {
        setCartItems(prev => prev.filter(item => item.id !== photoId));
    };

    const clearCart = () => {
        setCartItems([]);
    };

    const isInCart = (photoId) => {
        return cartItems.some(item => item.id === photoId);
    };

    // Calculate total price handling volume discounts per album
    const calculateTotal = () => {
        // Group items by album
        const groupedByAlbum = cartItems.reduce((acc, item) => {
            if (!acc[item.album_id]) {
                acc[item.album_id] = {
                    items: [],
                    pricing_package: item.pricing_package,
                    album_price: item.album_price
                };
            }
            acc[item.album_id].items.push(item);
            return acc;
        }, {});

        let total = 0;

        Object.values(groupedByAlbum).forEach(group => {
            const count = group.items.length;
            if (count === 0) return;

            if (group.pricing_package && group.pricing_package.tiers) {
                const tiers = [...group.pricing_package.tiers].sort((a, b) => b.quantity - a.quantity);
                const activeTier = tiers.find(tier => count >= tier.quantity);
                const unitPrice = activeTier ? activeTier.price : (tiers[tiers.length - 1]?.price || 0);
                total += count * unitPrice;
            } else {
                // If it's a fixed price album, usually you buy the whole album, 
                // but the current system allows per-photo purchase too.
                // Assuming fixed price refers to the whole album access if no package is present.
                // If no package, we just use the album_price for the selection.
                total += group.album_price;
            }
        });

        return parseFloat(total.toFixed(2));
    };

    const value = {
        cartItems,
        addToCart,
        removeFromCart,
        clearCart,
        isInCart,
        getItemCount: () => cartItems.length,
        calculateTotal
    };

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
};
