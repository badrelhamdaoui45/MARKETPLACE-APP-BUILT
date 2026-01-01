import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import { calculateCommission } from '../config/platform';
import { useCart } from '../context/CartContext';
import { ShoppingCart, Check, Plus, Lock } from 'lucide-react';

const PublicAlbumView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [album, setAlbum] = useState(null);
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);

    // Cart Interaction
    const { addToCart, removeFromCart, isInCart, cartItems } = useCart();

    useEffect(() => {
        fetchAlbumDetails();
    }, [id]);

    const fetchAlbumDetails = async () => {
        try {
            const { data: albumData, error: albumError } = await supabase
                .from('albums')
                .select(`
                    *, 
                    profiles:photographer_id(full_name),
                    pricing_packages:pricing_package_id(*)
                `)
                .eq('id', id)
                .eq('is_published', true)
                .single();

            if (albumError) throw albumError;
            setAlbum(albumData);

            const { data: photosData, error: photosError } = await supabase
                .from('photos')
                .select('*')
                .eq('album_id', id);

            if (photosError) throw photosError;
            setPhotos(photosData);
        } catch (error) {
            console.error('Error fetching details:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleCartItem = (photo) => {
        if (isInCart(photo.id)) {
            removeFromCart(photo.id);
        } else {
            addToCart(photo, album);
        }
    };

    const getSelectionForThisAlbum = () => {
        return cartItems.filter(item => item.album_id === id);
    };

    const calculateCurrentAlbumPrice = () => {
        if (!album) return 0;

        const selection = getSelectionForThisAlbum();
        const quantity = selection.length;
        if (quantity === 0) return 0;

        if (album.pricing_packages && album.pricing_packages.tiers) {
            const tiers = [...album.pricing_packages.tiers].sort((a, b) => b.quantity - a.quantity);
            const activeTier = tiers.find(tier => quantity >= tier.quantity);
            const unitPrice = activeTier ? activeTier.price : (tiers[tiers.length - 1]?.price || 0);
            return parseFloat((quantity * unitPrice).toFixed(2));
        }

        return album.price;
    };


    const getPackageName = () => {
        if (album && album.pricing_packages) {
            return album.pricing_packages.name;
        }
        return "Standard Access";
    };

    if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;
    if (!album) return <div style={{ padding: '2rem' }}>Album not found or not published.</div>;

    const currentAlbumSelection = getSelectionForThisAlbum();
    const selectionCount = currentAlbumSelection.length;
    const finalPrice = calculateCurrentAlbumPrice();
    const pkgName = getPackageName();
    const hasPackage = !!album.pricing_packages;

    return (
        <div className="album-view-container">
            <div className="album-content-layout">

                {/* Left/Top: Photos Grid */}
                <div className="photos-section">
                    <div className="album-header">
                        <h1 className="album-title">{album.title}</h1>
                        <p className="album-author">
                            by <Link to={`/photographer/${album.photographer_id}`} className="photographer-link">
                                {album.profiles?.full_name}
                            </Link>
                        </p>
                        <div className="selection-hint">
                            <span className="hint-icon"><ShoppingCart size={16} /></span>
                            Click the button below photos to add to cart
                        </div>
                    </div>

                    <div className="photos-grid">
                        {photos.map(photo => {
                            const selected = isInCart(photo.id);
                            return (
                                <div key={photo.id} className="photo-card-wrapper">
                                    <div
                                        onClick={() => toggleCartItem(photo)}
                                        className={`photo-item ${selected ? 'selected' : ''}`}
                                    >
                                        <img
                                            src={photo.watermarked_url}
                                            alt={photo.title}
                                            loading="lazy"
                                        />

                                        {/* Selection Overlay */}
                                        <div className="photo-selection-overlay">
                                            <div className="selection-indicator">
                                                {selected ? <Check size={24} strokeWidth={3} /> : <Plus size={24} strokeWidth={3} />}
                                            </div>
                                        </div>

                                        {selected && <div className="selected-border" />}
                                    </div>
                                    <div className="photo-actions">
                                        <Button
                                            variant={selected ? 'primary' : 'outline'}
                                            className="add-to-cart-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleCartItem(photo);
                                            }}
                                        >
                                            {selected ? 'Remove from Cart' : 'Add to Cart'}
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right/Bottom: Purchase Card */}
                <div className="purchase-card-container">
                    <div className="purchase-card">
                        <div className="purchase-header">
                            <h2 className="package-name">{pkgName}</h2>
                            <p className="package-description">
                                {hasPackage
                                    ? "Volume discounts apply automatically in your cart."
                                    : `Full album access for ${album.price}`}
                            </p>
                        </div>

                        <div className="purchase-details">
                            <div className="detail-row">
                                <span>Selected (this album)</span>
                                <span className="detail-value">{selectionCount} photos</span>
                            </div>

                            {/* Show Tiers Info */}
                            {hasPackage && album.pricing_packages.tiers && (
                                <div className="pricing-tiers">
                                    <p className="tiers-title">Volume Discounts:</p>
                                    <div className="tiers-list">
                                        {album.pricing_packages.tiers.sort((a, b) => a.quantity - b.quantity).map((tier, i) => (
                                            <div key={i} className="tier-item">
                                                <span>{tier.quantity}+ Photos</span>
                                                <span className="tier-price">{tier.price} <small>/ea</small></span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="price-divider"></div>

                            <div className="total-price-row">
                                <span>Subtotal</span>
                                <span className="total-amount">{finalPrice}</span>
                            </div>
                        </div>

                        <Button
                            className="buy-button"
                            onClick={() => navigate('/cart')}
                        >
                            <ShoppingCart size={20} style={{ marginRight: '8px' }} />
                            View Cart ({cartItems.length})
                        </Button>

                        <p className="payment-note">
                            <Lock size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Secure payment via Stripe
                        </p>
                    </div>
                </div>
            </div>

            <style>{`
                .album-view-container {
                    padding: var(--spacing-xl);
                    max-width: 1400px;
                    margin: 0 auto;
                    min-height: calc(100vh - 80px);
                }

                .album-content-layout {
                    display: grid;
                    grid-template-columns: 1fr 350px;
                    gap: var(--spacing-2xl);
                    align-items: start;
                }

                .album-header {
                    margin-bottom: var(--spacing-xl);
                }

                .album-title {
                    font-size: clamp(1.5rem, 5vw, 2.5rem);
                    margin-bottom: var(--spacing-xs);
                    color: var(--text-primary);
                }

                .album-author {
                    font-size: var(--font-size-lg);
                    color: var(--text-secondary);
                    margin-bottom: var(--spacing-md);
                }

                .photographer-link {
                    color: var(--primary-blue);
                    text-decoration: none;
                    font-weight: 600;
                    transition: color var(--transition-fast);
                }

                .photographer-link:hover {
                    color: var(--secondary-cyan);
                    text-decoration: underline;
                }

                .selection-hint {
                    display: inline-flex;
                    align-items: center;
                    gap: var(--spacing-sm);
                    padding: var(--spacing-sm) var(--spacing-md);
                    background: var(--bg-tertiary);
                    border-radius: var(--radius-full);
                    font-size: var(--font-size-sm);
                    color: var(--primary-blue);
                    font-weight: 500;
                }
                
                .hint-icon {
                    display: flex;
                    align-items: center;
                }

                .photos-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: var(--spacing-xl);
                }

                .photo-card-wrapper {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .photo-item {
                    position: relative;
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    cursor: pointer;
                    background: var(--bg-tertiary);
                    /* aspect-ratio removed */
                    transition: transform var(--transition-base), box-shadow var(--transition-base);
                    box-shadow: var(--shadow-sm);
                }

                .photo-item:hover {
                    transform: translateY(-4px);
                    box-shadow: var(--shadow-lg);
                }

                .photo-item img {
                    width: 100%;
                    height: auto;
                    display: block;
                    transition: opacity var(--transition-base);
                }

                .photo-item.selected img {
                    opacity: 0.8;
                }

                .photo-selection-overlay {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0, 0, 0, 0.2);
                    opacity: 0;
                    transition: opacity var(--transition-base);
                }

                .photo-item:hover .photo-selection-overlay {
                    opacity: 1;
                }

                .photo-item.selected .photo-selection-overlay {
                    opacity: 1;
                    background: rgba(59, 130, 246, 0.1);
                }

                .selection-indicator {
                    width: 40px;
                    height: 40px;
                    background: var(--bg-primary);
                    color: var(--primary-blue);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                    font-weight: bold;
                    box-shadow: var(--shadow-md);
                    transform: scale(0.8);
                    transition: transform var(--transition-base);
                }

                .photo-item:hover .selection-indicator {
                    transform: scale(1);
                }

                .photo-item.selected .selection-indicator {
                    background: var(--primary-blue);
                    color: white;
                    transform: scale(1);
                }

                .selected-border {
                    position: absolute;
                    inset: 0;
                    border: 3px solid var(--primary-blue);
                    border-radius: var(--radius-lg);
                    pointer-events: none;
                }

                .photo-actions {
                    padding: 0 0.5rem;
                }

                .add-to-cart-btn {
                    width: 100%;
                    font-size: 0.9rem !important;
                    height: 44px;
                    border: 2px solid var(--primary-blue) !important; /* Added Border */
                }

                .purchase-card {
                    background: var(--bg-primary);
                    padding: var(--spacing-xl);
                    border-radius: var(--radius-xl);
                    border: 1px solid var(--border-light);
                    box-shadow: var(--shadow-lg);
                    position: sticky;
                    top: 100px;
                }

                .package-name {
                    font-size: var(--font-size-xl);
                    margin-bottom: var(--spacing-sm);
                }

                .package-description {
                    font-size: var(--font-size-sm);
                    color: var(--text-secondary);
                    margin-bottom: var(--spacing-lg);
                }

                .purchase-details {
                    background: var(--bg-secondary);
                    padding: var(--spacing-lg);
                    border-radius: var(--radius-lg);
                    margin-bottom: var(--spacing-xl);
                }

                .detail-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: var(--spacing-md);
                    font-weight: 500;
                }

                .pricing-tiers {
                    margin: var(--spacing-lg) 0;
                    border-top: 1px dashed var(--border-light);
                    padding-top: var(--spacing-md);
                }

                .tiers-title {
                    font-size: var(--font-size-xs);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    font-weight: 600;
                    color: var(--text-tertiary);
                    margin-bottom: var(--spacing-sm);
                }

                .tier-item {
                    display: flex;
                    justify-content: space-between;
                    font-size: var(--font-size-sm);
                    margin-bottom: var(--spacing-xs);
                    color: var(--text-secondary);
                }

                .tier-price {
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .price-divider {
                    height: 1px;
                    background: var(--border-light);
                    margin: var(--spacing-md) 0;
                }

                .total-price-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: var(--font-size-xl);
                    font-weight: 800;
                }

                .total-amount {
                    color: var(--primary-blue);
                }

                .buy-button {
                    width: 100%;
                    height: 56px;
                    font-size: var(--font-size-lg) !important;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }

                .payment-note {
                    text-align: center;
                    margin-top: var(--spacing-md);
                    font-size: var(--font-size-xs);
                    color: var(--text-tertiary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                @media (max-width: 1024px) {
                    .album-content-layout {
                        grid-template-columns: 1fr;
                        gap: var(--spacing-xl);
                    }

                    .purchase-card {
                        position: static;
                    }
                }

                @media (max-width: 640px) {
                    .album-view-container {
                        padding: 1rem;
                        padding-bottom: 140px;
                    }

                    .photos-grid {
                        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                        gap: 1.5rem;
                    }

                    .add-to-cart-btn {
                        font-size: 0.8rem !important;
                        height: 40px;
                    }
                }
            `}</style>
        </div>
    );
};

export default PublicAlbumView;
