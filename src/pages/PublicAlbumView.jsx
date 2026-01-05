import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import { calculateCommission } from '../config/platform';
import { useCart } from '../context/CartContext';
import { ShoppingCart, Check, Plus, Lock, X, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';
import DynamicPopup from '../components/DynamicPopup';

const PublicAlbumView = () => {
    const { photographerName, albumTitle } = useParams();
    const navigate = useNavigate();
    const [album, setAlbum] = useState(null);
    const [photos, setPhotos] = useState([]);
    const [packages, setPackages] = useState([]);
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedPhotoForView, setSelectedPhotoForView] = useState(null); // Lightbox state

    // Cart Interaction
    const { addToCart, removeFromCart, isInCart, cartItems, updateCartPackage } = useCart();

    useEffect(() => {
        fetchAlbumDetails();
    }, [photographerName, albumTitle]);

    // Handle ESC key to close lightbox
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setSelectedPhotoForView(null);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const fetchAlbumDetails = async () => {
        try {
            const { data: albumData, error: albumError } = await supabase
                .from('albums')
                .select(`
                    *, 
                    profiles:photographer_id!inner(full_name, logo_url)
                `)
                .ilike('profiles.full_name', decodeURIComponent(photographerName))
                .ilike('title', decodeURIComponent(albumTitle))
                .eq('is_published', true)
                .single();

            if (albumError) throw albumError;
            setAlbum(albumData);

            // Fetch linked packages
            if (albumData.pricing_package_ids && albumData.pricing_package_ids.length > 0) {
                const { data: pkgData, error: pkgError } = await supabase
                    .from('pricing_packages')
                    .select('*')
                    .in('id', albumData.pricing_package_ids);

                if (!pkgError && pkgData) {
                    setPackages(pkgData);

                    // Set initial selected package from cart or first available
                    const cartItemForAlbum = cartItems.find(item => item.album_id === albumData.id);
                    if (cartItemForAlbum && cartItemForAlbum.pricing_package) {
                        setSelectedPackage(cartItemForAlbum.pricing_package);
                    } else {
                        setSelectedPackage(pkgData[0]);
                    }
                }
            } else if (albumData.pricing_package_id) {
                // Fallback for legacy data
                const { data: pkgData } = await supabase
                    .from('pricing_packages')
                    .select('*')
                    .eq('id', albumData.pricing_package_id)
                    .single();
                if (pkgData) {
                    setPackages([pkgData]);
                    setSelectedPackage(pkgData);
                }
            }

            const { data: photosData, error: photosError } = await supabase
                .from('photos')
                .select('*')
                .eq('album_id', albumData.id);

            if (photosError) throw photosError;
            setPhotos(photosData);
        } catch (error) {
            console.error('Error fetching details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePreInscriptionSubmit = async (e) => {
        e.preventDefault();
        const email = e.target.email.value;
        const phone = e.target.phone?.value || '';

        try {
            const { error } = await supabase
                .from('pre_inscriptions')
                .insert([{ album_id: album.id, email, phone }]);

            if (error) throw error;
            alert('Parfait ! Vous serez notifié dès que les photos seront prêtes.');
            e.target.reset();
        } catch (err) {
            console.error('Error subscribing:', err);
            alert('Une erreur est survenue. Veuillez réessayer.');
        }
    };

    const toggleCartItem = (photo) => {
        if (isInCart(photo.id)) {
            removeFromCart(photo.id);
        } else {
            addToCart(photo, { ...album, selected_package: selectedPackage });
        }
    };

    const getSelectionForThisAlbum = () => {
        if (!album) return [];
        return cartItems.filter(item => item.album_id === album.id);
    };

    const calculateCurrentAlbumPrice = () => {
        if (!album) return 0;

        const selection = getSelectionForThisAlbum();
        const quantity = selection.length;
        if (quantity === 0) return 0;

        if (selectedPackage && selectedPackage.tiers) {
            const tiers = [...selectedPackage.tiers].sort((a, b) => b.quantity - a.quantity);
            const activeTier = tiers.find(tier => quantity >= tier.quantity);
            const unitPrice = activeTier ? activeTier.price : (tiers[tiers.length - 1]?.price || 0);
            return parseFloat((quantity * unitPrice).toFixed(2));
        }

        return album.price;
    };


    const getPackageName = () => {
        if (selectedPackage) {
            return selectedPackage.name;
        }
        return "Standard Access";
    };

    const handlePackageChange = (pkg) => {
        setSelectedPackage(pkg);
        updateCartPackage(album.id, pkg);
    };

    if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;
    if (!album) return <div style={{ padding: '2rem' }}>Album not found or not published.</div>;

    const currentAlbumSelection = getSelectionForThisAlbum();
    const selectionCount = currentAlbumSelection.length;
    const finalPrice = calculateCurrentAlbumPrice();
    const pkgName = getPackageName();
    const hasPackages = packages.length > 0;

    return (
        <div className="album-view-container">
            {album.pre_inscription_enabled ? (
                <div className="pre-inscription-view">
                    <div className="pre-inscription-content">
                        <div className="album-header central">
                            <h1 className="album-title">{album.title}</h1>
                            <div className="photographer-info-row">
                                {album.profiles?.logo_url && (
                                    <img
                                        src={album.profiles.logo_url}
                                        alt={album.profiles.full_name}
                                        className="photographer-logo-small"
                                    />
                                )}
                                <p className="album-author">
                                    by <Link to={`/photographer/${encodeURIComponent(album.profiles?.full_name)}`} className="photographer-link">
                                        {album.profiles?.full_name}
                                    </Link>
                                </p>
                            </div>
                        </div>

                        <div className="pre-inscription-card">
                            <div className="pre-inscription-image">
                                {album.cover_image_url ? (
                                    <img src={album.cover_image_url} alt={album.title} />
                                ) : (
                                    <div className="no-cover-placeholder">
                                        <Image size={64} strokeWidth={1} />
                                    </div>
                                )}
                                <div className="pre-inscription-badge-overlay">
                                    PRÉ-INSCRIPTION
                                </div>
                            </div>

                            <div className="pre-inscription-form-section">
                                <h2>{album.pre_inscription_title || "Les photos arrivent bientôt ! 📸"}</h2>
                                <p>{album.pre_inscription_description || "Inscrivez-vous pour recevoir une notification dès que l'album sera en ligne et prêt à l'achat."}</p>

                                <form onSubmit={handlePreInscriptionSubmit} className="notify-form">
                                    <div className="form-group-modern">
                                        <label>Votre Email *</label>
                                        <input type="email" name="email" required placeholder="nom@exemple.com" />
                                    </div>
                                    <div className="form-group-modern">
                                        <label>Votre Téléphone (Optionnel)</label>
                                        <input type="tel" name="phone" placeholder="06 12 34 56 78" />
                                    </div>
                                    <Button type="submit" className="notify-submit-btn">
                                        M'avertir de la sortie !
                                    </Button>
                                    <p className="privacy-note">
                                        <Lock size={12} /> Vos données resterront confidentielles avec {album.profiles?.full_name}.
                                    </p>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="album-content-layout">

                    {/* Left/Top: Photos Grid */}
                    <div className="photos-section">
                        <div className="album-header">
                            <h1 className="album-title">{album.title}</h1>
                            <div className="photographer-info-row">
                                {album.profiles?.logo_url && (
                                    <img
                                        src={album.profiles.logo_url}
                                        alt={album.profiles.full_name}
                                        className="photographer-logo-small"
                                    />
                                )}
                                <p className="album-author">
                                    by <Link to={`/photographer/${encodeURIComponent(album.profiles?.full_name)}`} className="photographer-link">
                                        {album.profiles?.full_name}
                                    </Link>
                                </p>
                            </div>
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
                                            onClick={() => setSelectedPhotoForView(photo)}
                                            className={`photo-item ${selected ? 'selected' : ''}`}
                                        >
                                            <img
                                                src={photo.watermarked_url}
                                                alt={photo.title}
                                                loading="lazy"
                                            />

                                            {/* Zoom Overlay */}
                                            <div className="photo-view-overlay">
                                                <div className="zoom-icon-wrapper">
                                                    <ZoomIn size={24} strokeWidth={2.5} />
                                                </div>
                                            </div>

                                            {selected && <div className="selected-status-badge"><Check size={12} /></div>}
                                            {selected && <div className="selected-border" />}
                                        </div>
                                        <div className="photo-actions">
                                            <Button
                                                variant="outline"
                                                className={`add-to-cart-btn action-btn cart-btn-grid ${selected ? 'in-cart' : ''}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const btn = e.currentTarget;
                                                    btn.classList.add('animate-orange');
                                                    setTimeout(() => btn.classList.remove('animate-orange'), 600);
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
                                    {selectedPackage && selectedPackage.description}
                                </p>
                            </div>

                            {packages.length > 1 && (
                                <div className="package-selector-section">
                                    <p className="selector-label">SÉLECTIONNEZ UN MODÈLE</p>
                                    <div className="package-options-grid">
                                        {packages.map(pkg => (
                                            <button
                                                key={pkg.id}
                                                className={`pkg-option-btn ${selectedPackage?.id === pkg.id ? 'active' : ''}`}
                                                onClick={() => handlePackageChange(pkg)}
                                            >
                                                <span className="pkg-opt-name">{pkg.name}</span>
                                                <span className={`pkg-opt-type ${pkg.package_type}`}>{pkg.package_type}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="purchase-details">
                                <div className="detail-row">
                                    <span>Selected (this album)</span>
                                    <span className="detail-value">{selectionCount} photos</span>
                                </div>

                                {/* Show Tiers Info */}
                                {selectedPackage && selectedPackage.tiers && (
                                    <div className="pricing-tiers">
                                        <p className="tiers-title">Volume Discounts:</p>
                                        <div className="tiers-list">
                                            {selectedPackage.tiers.sort((a, b) => a.quantity - b.quantity).map((tier, i) => (
                                                <div key={i} className="tier-item">
                                                    <span>{tier.quantity}+ Photos</span>
                                                    <span className="tier-price">{tier.price} <small>/ea</small></span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {!selectedPackage && (
                                    <p className="package-description">
                                        Full album access for {album.price}€
                                    </p>
                                )}
                                <div className="price-divider"></div>

                                <div className="total-price-row">
                                    <span>Subtotal</span>
                                    <span className="total-amount">{finalPrice}</span>
                                </div>
                            </div>

                            <Button
                                className="buy-button action-btn"
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
            )}

            <style>{`
                .pre-inscription-view {
                    max-width: 1000px;
                    margin: 2rem auto;
                    padding: 0 1rem;
                }

                .album-header.central {
                    text-align: center;
                    margin-bottom: 3rem;
                }

                .pre-inscription-card {
                    display: grid;
                    grid-template-columns: 1fr 1.2fr;
                    background: white;
                    border-radius: 20px;
                    overflow: hidden;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.1);
                    border: 1px solid #e2e8f0;
                }

                .pre-inscription-image {
                    position: relative;
                    height: 100%;
                    min-height: 400px;
                    background: #f1f5f9;
                }

                .pre-inscription-image img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .no-cover-placeholder {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #94a3b8;
                }

                .pre-inscription-badge-overlay {
                    position: absolute;
                    top: 2rem;
                    left: 2rem;
                    background: #f97316;
                    color: white;
                    padding: 0.5rem 1.25rem;
                    border-radius: 50px;
                    font-weight: 800;
                    font-size: 0.85rem;
                    box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
                }

                .pre-inscription-form-section {
                    padding: 3.5rem;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }

                .pre-inscription-form-section h2 {
                    font-size: 1.75rem;
                    font-weight: 800;
                    margin-bottom: 1rem;
                    color: #1e293b;
                }

                .pre-inscription-form-section p {
                    color: #64748b;
                    margin-bottom: 2rem;
                    line-height: 1.6;
                }

                .notify-form {
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                }

                .form-group-modern {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .form-group-modern label {
                    font-size: 0.8rem;
                    font-weight: 700;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .form-group-modern input {
                    padding: 0.85rem 1rem;
                    border-radius: 12px;
                    border: 2px solid #e2e8f0;
                    font-size: 1rem;
                    transition: all 0.2s;
                    outline: none;
                }

                .form-group-modern input:focus {
                    border-color: #f97316;
                    box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.1);
                }

                .notify-submit-btn {
                    margin-top: 1rem;
                    height: 56px;
                    background: #f97316 !important;
                    border-color: #f97316 !important;
                    color: white !important;
                    font-weight: 800 !important;
                    font-size: 1.1rem !important;
                    border-radius: 12px !important;
                }

                .notify-submit-btn:hover {
                    background: #ea580c !important;
                    transform: translateY(-2px);
                    box-shadow: 0 8px 24px rgba(234, 88, 12, 0.3) !important;
                }

                .privacy-note {
                    margin-top: 1.5rem;
                    font-size: 0.75rem !important;
                    color: #94a3b8;
                    display: flex;
                    align-items: center;
                    gap: 0.35rem;
                    justify-content: center;
                }

                @media (max-width: 768px) {
                    .pre-inscription-card {
                        grid-template-columns: 1fr;
                    }
                    .pre-inscription-image {
                        min-height: 250px;
                    }
                    .pre-inscription-form-section {
                        padding: 2rem;
                    }
                }

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
                    margin-bottom: 0; /* Remove bottom margin as it's now in a flex container */
                }

                .photographer-info-row {
                    display: flex;
                    align-items: center;
                    justify-content: flex-start; /* Changed from center to allow custom alignment */
                    gap: 0.75rem;
                    margin-bottom: var(--spacing-md);
                }

                .album-header.central .photographer-info-row {
                    justify-content: center;
                }

                .photographer-logo-small {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    object-fit: cover;
                    border: 1px solid #e2e8f0;
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
                    opacity: 0.9;
                }

                .photo-view-overlay {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0, 0, 0, 0.4);
                    opacity: 0;
                    transition: all 0.3s ease;
                    backdrop-filter: blur(2px);
                }

                .photo-item:hover .photo-view-overlay {
                    opacity: 1;
                }

                .zoom-icon-wrapper {
                    width: 48px;
                    height: 48px;
                    background: rgba(255, 255, 255, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transform: scale(0.8);
                    transition: transform 0.3s ease;
                }

                .photo-item:hover .zoom-icon-wrapper {
                    transform: scale(1);
                }

                .selected-status-badge {
                    position: absolute;
                    top: 12px;
                    right: 12px;
                    width: 24px;
                    height: 24px;
                    background: var(--primary-blue);
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                    z-index: 5;
                }

                .selected-border {
                    position: absolute;
                    inset: 0;
                    border: 3px solid var(--primary-blue);
                    border-radius: var(--radius-lg);
                    pointer-events: none;
                    z-index: 4;
                }

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
                    padding-bottom: 80px; /* Space for action bar */
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

                .lightbox-action-bar {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    padding: 2rem;
                    display: flex;
                    justify-content: center;
                    background: linear-gradient(to top, rgba(0,0,0,0.5), transparent);
                    z-index: 10001;
                    animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }

                @keyframes slideUp {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }

                .lightbox-cart-action-btn {
                    min-width: 320px;
                    height: 64px;
                    font-size: 1.2rem !important;
                    font-weight: 700 !important;
                    background: #F5A623 !important;
                    border-color: #F5A623 !important;
                    color: white !important;
                    border-radius: 99px !important;
                    box-shadow: 0 8px 24px rgba(245, 166, 35, 0.4) !important;
                    transition: all 0.2s !important;
                }

                .lightbox-cart-action-btn:hover {
                    background: #e59512 !important;
                    transform: translateY(-2px);
                    box-shadow: 0 12px 32px rgba(245, 166, 35, 0.5) !important;
                }

                .lightbox-cart-action-btn.active {
                    background: #10b981 !important;
                    border-color: #10b981 !important;
                    box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3) !important;
                }

                @media (max-width: 640px) {
                    .custom-lightbox-overlay {
                        padding: 10px; /* Match album-view-container padding */
                    }
                    .lightbox-container {
                        max-width: 100%; /* Fill available space minus container padding */
                    }
                    .lightbox-close-icon {
                        top: 1.5rem;
                        right: 1.5rem;
                        width: 44px;
                        height: 44px;
                    }
                    .lightbox-main-view {
                        padding-bottom: 90px;
                    }
                    .lightbox-image-main {
                        border-radius: 12px; /* Match card radius instead of being edge-to-edge */
                        width: 100%; /* Ensure it takes full width of the constrained container */
                        box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                    }
                    .lightbox-action-bar {
                        padding: 1.25rem;
                    }
                    .lightbox-cart-action-btn {
                        min-width: 100%; /* Match the card look */
                        height: 54px;
                        font-size: 1rem !important;
                    }
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

                .package-selector-section {
                    margin-bottom: var(--spacing-lg);
                }

                .selector-label {
                    font-size: 0.65rem;
                    font-weight: 800;
                    color: var(--text-tertiary);
                    margin-bottom: 0.5rem;
                    letter-spacing: 0.05em;
                }

                .package-options-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 0.5rem;
                }

                .pkg-option-btn {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.75rem 1rem;
                    background: var(--bg-tertiary);
                    border: 1px solid var(--border-light);
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .pkg-option-btn:hover {
                    border-color: #cbd5e1;
                    background: #f1f5f9;
                }

                .pkg-option-btn.active {
                    background: #eff6ff;
                    border-color: var(--primary-blue);
                    box-shadow: 0 0 0 1px var(--primary-blue);
                }

                .pkg-opt-name {
                    font-size: 0.85rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .pkg-opt-type {
                    font-size: 0.65rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    padding: 0.2rem 0.5rem;
                    border-radius: 4px;
                }

                .pkg-opt-type.digital {
                    color: #0369a1;
                    background: #e0f2fe;
                }

                .pkg-opt-type.physical {
                    color: #92400e;
                    background: #fef3c7;
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

                .cart-btn-grid {
                    height: 44px !important;
                    padding: 0 1rem !important;
                    font-size: 0.75rem !important;
                    background: rgba(255, 255, 255, 0.9) !important;
                    backdrop-filter: blur(4px);
                }

                /* Orange Click Animation */
                @keyframes cart-flash-orange {
                    0% {
                        background-color: white !important;
                        border-color: var(--primary-blue) !important;
                        color: var(--primary-blue) !important;
                        transform: scale(1);
                    }
                    20% {
                        background-color: #ffb703 !important; /* Safety Orange */
                        border-color: #ffb703 !important;
                        color: white !important;
                        transform: scale(0.92);
                    }
                    50% {
                        box-shadow: 0 0 20px rgba(255, 183, 3, 0.6);
                    }
                    100% {
                        background-color: white !important;
                        border-color: var(--primary-blue) !important;
                        color: var(--primary-blue) !important;
                        transform: scale(1);
                    }
                }

                .animate-orange {
                    animation: cart-flash-orange 0.6s cubic-bezier(0.4, 0, 0.2, 1);
                    z-index: 10;
                }

                .in-cart {
                    background-color: #ffb703 !important; /* Safety Orange */
                    border-color: #ffb703 !important;
                    color: white !important;
                }

                .in-cart:hover {
                    background-color: #e6a600 !important;
                    border-color: #e6a600 !important;
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
                        padding: 10px; /* Reduced padding */
                        padding-bottom: 140px;
                        width: 100%;
                        overflow-x: hidden;
                    }

                    .photos-grid {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr); /* Force 2 columns */
                        gap: 8px; /* High density gap */
                    }

                    .photo-card-wrapper {
                        gap: 0.5rem;
                    }

                    .add-to-cart-btn {
                        font-size: 0.7rem !important;
                        height: 32px !important; /* Smaller button */
                        padding: 0 4px !important;
                        letter-spacing: -0.02em !important;
                        white-space: nowrap;
                        text-overflow: ellipsis;
                        overflow: hidden;
                    }
                    
                    .album-title {
                        font-size: 1.5rem;
                        word-break: break-word; /* Prevent long title overflow */
                    }
                }
            `}</style>
            {album && (
                <DynamicPopup
                    type="album_welcome"
                    albumId={album.id}
                    placeholders={{ album_title: album.title }}
                />
            )}

            {/* Photo Lightbox - Custom Implementation */}
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

                        <div className="lightbox-action-bar">
                            <Button
                                className={`lightbox-cart-action-btn ${isInCart(selectedPhotoForView.id) ? 'active' : ''}`}
                                onClick={() => toggleCartItem(selectedPhotoForView)}
                            >
                                {isInCart(selectedPhotoForView.id) ? (
                                    <><Check size={20} style={{ marginRight: '8px' }} /> In Cart</>
                                ) : (
                                    <><ShoppingCart size={20} style={{ marginRight: '8px' }} /> Add to Cart</>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PublicAlbumView;
