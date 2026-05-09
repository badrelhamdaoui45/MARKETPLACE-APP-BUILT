import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import { calculateCommission } from '../config/platform';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { formatPrice } from '../utils/currencies';
import { ShoppingCart, Check, Plus, Lock, X, ZoomIn, ChevronLeft, ChevronRight, Gift, Search, Tag, ChevronDown, ChevronUp } from 'lucide-react';
import DynamicPopup from '../components/DynamicPopup';
import SkeletonAlbumView from '../components/ui/SkeletonAlbumView';

const PublicAlbumView = () => {
    const { t } = useLanguage();
    const { photographerName, albumTitle } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [album, setAlbum] = useState(null);
    const [photos, setPhotos] = useState([]);
    const [packages, setPackages] = useState([]);
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isClaiming, setIsClaiming] = useState(false);
    const [selectedPhotoForView, setSelectedPhotoForView] = useState(null); // Lightbox state
    const [bibSearch, setBibSearch] = useState('');
    const [isPricingExpanded, setIsPricingExpanded] = useState(false);

    // Cart Interaction
    const { addToCart, removeFromCart, isInCart, cartItems, updateCartPackage } = useCart();

    useEffect(() => {
        fetchAlbumDetails();
    }, [photographerName, albumTitle]);

    // Handle Auto-claim if redirected from login
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const action = params.get('action');
        if (action === 'claim_free' && user && album && !loading) {
            handleClaimFree();
        }
    }, [user, album, loading]);

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
            // 1. Fetch Album by Slug or Title
            // We search by slug first (preferred), then fallback to title for old links
            let { data: albumData, error: albumError } = await supabase
                .from('albums')
                .select(`
                    *,
                    profiles:photographer_id (full_name, logo_url, currency)
                `)
                .ilike('profiles.full_name', decodeURIComponent(photographerName))
                .or(`slug.eq."${decodeURIComponent(albumTitle)}",title.eq."${decodeURIComponent(albumTitle)}"`)
                .eq('is_published', true)
                .single();

            if (albumError || !albumData) throw albumError || new Error('Album not found');
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
            alert('Perfect! You will be notified as soon as the photos are ready.');
            e.target.reset();
        } catch (err) {
            console.error('Error subscribing:', err);
            alert('An error occurred. Please try again.');
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

    const handleClaimFree = async () => {
        if (!user) {
            navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}&action=claim_free`);
            return;
        }

        setIsClaiming(true);
        try {
            // Create a completed transaction for 0 cost
            const { data, error } = await supabase
                .from('transactions')
                .insert([{
                    buyer_id: user.id,
                    photographer_id: album.photographer_id,
                    album_id: album.id,
                    amount: 0,
                    status: 'paid', // Use 'paid' to match AlbumDownload logic
                    payment_method: 'free',
                    is_full_album: true,
                    original_amount: 0,
                    commission_amount: 0,
                    net_amount: 0
                }])
                .select()
                .single();

            if (error) throw error;

            // Redirect to My Purchases
            navigate(`/my-purchases/${album.id}`);
        } catch (err) {
            console.error('Error claiming free album:', err);
            alert('An error occurred while retrieving the album.');
        } finally {
            setIsClaiming(false);
        }
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

    if (loading) return <SkeletonAlbumView />;
    if (!album) return <div style={{ padding: '2rem' }}>Album not found or not published.</div>;

    const currentAlbumSelection = getSelectionForThisAlbum();
    const selectionCount = currentAlbumSelection.length;
    const finalPrice = calculateCurrentAlbumPrice();
    const pkgName = getPackageName();
    const hasPackages = packages.length > 0;

    const filteredPhotos = bibSearch.trim() === ''
        ? photos
        : photos.filter(p => p.bib_numbers?.some(b => b.includes(bibSearch.trim())));

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
                                    PRE-REGISTRATION
                                </div>
                            </div>

                            <div className="pre-inscription-form-section">
                                <h2>{album.pre_inscription_title || "Photos coming soon! 📸"}</h2>
                                <p>{album.pre_inscription_description || "Sign up to receive a notification as soon as the album is online and ready to purchase."}</p>

                                <form onSubmit={handlePreInscriptionSubmit} className="notify-form">
                                    <div className="form-group-modern">
                                        <label>Your Email *</label>
                                        <input type="email" name="email" required placeholder="nom@exemple.com" />
                                    </div>
                                    <div className="form-group-modern">
                                        <label>Your Phone (Optional)</label>
                                        <input type="tel" name="phone" placeholder="06 12 34 56 78" />
                                    </div>
                                    <Button type="submit" className="notify-submit-btn">
                                        Notify me when it's out!
                                    </Button>
                                    <p className="privacy-note">
                                        <Lock size={12} /> Your data will remain confidential with {album.profiles?.full_name}.
                                    </p>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <div className="album-hero-section">
                        {album.cover_image_url && (
                            <div className="hero-background">
                                <img src={album.cover_image_url} alt="" />
                                <div className="hero-overlay"></div>
                            </div>
                        )}
                        
                        <div className="hero-content">
                            <div className="hero-main-info">
                                <div className="photographer-badge-premium">
                                    {album.profiles?.logo_url ? (
                                        <img src={album.profiles.logo_url} alt={album.profiles.full_name} className="p-badge-logo" />
                                    ) : (
                                        <div className="p-badge-initials">{album.profiles?.full_name?.charAt(0)}</div>
                                    )}
                                    <span className="p-badge-name">
                                        by <Link to={`/photographer/${encodeURIComponent(album.profiles?.full_name)}`}>{album.profiles?.full_name}</Link>
                                    </span>
                                </div>

                                <h1 className="hero-title">{album.title}</h1>
                                {album.description && <p className="hero-description">{album.description}</p>}
                                
                                <div className="hero-meta-row">
                                    <div className="meta-item">
                                        <Search size={14} />
                                        <span>{photos.length} Photos</span>
                                    </div>
                                    <div className="meta-item">
                                        <Tag size={14} />
                                        <span>{new Date(album.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                    </div>
                                    {album.is_free && (
                                        <div className="meta-item free-label">
                                            <Gift size={14} />
                                            <span>Free Album</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="hero-actions-hint">
                                <div className="selection-hint-premium">
                                    <ShoppingCart size={18} />
                                    <span>Select photos below to add to your collection</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="album-content-layout">
                        {/* Left/Top: Photos Grid */}
                        <div className="photos-section">

                            <div className="photos-grid">
                                {filteredPhotos.map(photo => {
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
                                            {photo.bib_numbers && photo.bib_numbers.length > 0 && (
                                                <div className="photo-bottom-info">
                                                    <div className="bib-tags">
                                                        {photo.bib_numbers.map((bib, i) => (
                                                            <span key={i} className="bib-tag">#{bib}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
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
                                                    {selected ? t('cart_remove') : t('pub_add_cart')}
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
                                <div className="purchase-header compact">
                                    <p className="package-description">
                                        {selectedPackage && selectedPackage.description}
                                    </p>
                                </div>

                                {/* SEARCH BY BIB */}
                                <div className="bib-search-container">
                                    <div className="search-input-wrapper">
                                        <Search size={18} className="search-icon" />
                                        <input
                                            type="text"
                                            placeholder={t('pub_search_bib')}
                                            className="bib-search-input"
                                            value={bibSearch}
                                            onChange={(e) => setBibSearch(e.target.value)}
                                        />
                                        {bibSearch && (
                                            <button
                                                className="clear-search-btn"
                                                onClick={() => setBibSearch('')}
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                    {bibSearch && filteredPhotos.length === 0 && (
                                        <p className="search-no-results">{t('pub_no_photos_found')}</p>
                                    )}
                                </div>


                                {/* PRICING ACCORDION */}
                                <div className="pricing-accordion-container">
                                    <button
                                        className={`pricing-toggle-btn ${isPricingExpanded ? 'active' : ''}`}
                                        onClick={() => setIsPricingExpanded(!isPricingExpanded)}
                                    >
                                        <div className="toggle-left">
                                            <Tag size={16} className="pricing-icon" />
                                            <span>{t('pub_pricing')}</span>
                                        </div>
                                        {isPricingExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </button>

                                    {isPricingExpanded && (
                                        <div className="purchase-details-panel">
                                            <div className="purchase-details">
                                                {packages.length > 1 && (
                                                    <div className="package-selector-section dropdown-theme" style={{ marginBottom: '1rem' }}>
                                                        <p className="selector-label">{t('pub_package')}</p>
                                                        <select
                                                            className="package-dropdown-select"
                                                            value={selectedPackage?.id || ''}
                                                            onChange={(e) => {
                                                                const pkg = packages.find(p => p.id === e.target.value);
                                                                if (pkg) handlePackageChange(pkg);
                                                            }}
                                                        >
                                                            {packages.map(pkg => (
                                                                <option key={pkg.id} value={pkg.id}>
                                                                    {pkg.name} — {pkg.package_type.toUpperCase()}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                                <div className="detail-row">
                                                    <span>{t('pub_selected_album')}</span>
                                                    <span className="detail-value">{selectionCount} {t('pub_photo')}{selectionCount !== 1 ? 's' : ''}</span>
                                                </div>

                                                {/* Show Tiers Info */}
                                                {selectedPackage && selectedPackage.tiers && (
                                                    <div className="pricing-tiers">
                                                        <p className="tiers-title">{t('pub_volume_discounts')}</p>
                                                        <div className="tiers-list">
                                                            {selectedPackage.tiers.sort((a, b) => a.quantity - b.quantity).map((tier, i) => (
                                                                <div key={i} className="tier-item">
                                                                    <span>{tier.quantity}+ {t('pricing_photos')}</span>
                                                                    <span className="tier-price">{formatPrice(tier.price, album.profiles?.currency)} <small>/{t('pub_photo')}</small></span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {!selectedPackage && (
                                                    <p className="package-description">
                                                        Full album access for {formatPrice(album.price, album.profiles?.currency)}
                                                    </p>
                                                )}
                                                <div className="price-divider"></div>

                                                <div className="total-price-row">
                                                    <span>{t('pub_subtotal')}</span>
                                                    <span className="total-amount">{formatPrice(finalPrice, album.profiles?.currency)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <Button
                                    className="buy-button action-btn"
                                    onClick={() => navigate('/cart')}
                                >
                                    <ShoppingCart size={20} style={{ marginRight: '8px' }} />
                                    {t('pub_view_cart')} ({cartItems.length})
                                </Button>

                                {album.is_free && (
                                    <div className="free-claim-wrapper">
                                        <div className="claim-divider">
                                            <span>{t('pub_or')}</span>
                                        </div>
                                        <Button
                                            className="free-claim-btn"
                                            onClick={handleClaimFree}
                                            disabled={isClaiming}
                                        >
                                            <Gift size={20} />
                                            {isClaiming ? t('pub_loading') : t('pub_claim_free')}
                                        </Button>
                                        <p className="free-disclaimer">{t('pub_claim_free_desc')}</p>
                                    </div>
                                )}

                                <p className="payment-note">
                                    <Lock size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('pub_secure_payment')}
                                </p>
                            </div>
                        </div>
                    </div>
                </>
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

                .album-header.central .album-title {
                    font-size: clamp(2rem, 5vw, 3rem);
                    font-weight: 800;
                    color: #1e293b;
                    margin-bottom: 0.5rem;
                }

                .album-header.central .album-author {
                    color: #64748b;
                    font-size: 1.1rem;
                }

                .album-header.central .photographer-link {
                    color: var(--primary-blue);
                    font-weight: 700;
                    text-decoration: none;
                }

                .album-header.central .photographer-logo-small {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    object-fit: cover;
                    border: 1px solid #e2e8f0;
                    vertical-align: middle;
                    margin-right: 8px;
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
                        padding: 1.5rem;
                        width: 100%;
                        box-sizing: border-box;
                    }
                    .pre-inscription-form-section h2 {
                        font-size: 1.5rem;
                    }
                    .notify-form {
                        width: 100%;
                    }
                    .form-group-modern {
                        width: 100%;
                    }
                    .form-group-modern input {
                        width: 100%;
                        box-sizing: border-box;
                        font-size: 16px; /* Prevents zoom on iOS */
                    }
                    .notify-submit-btn {
                        width: 100%;
                        box-sizing: border-box;
                        font-size: 1rem !important;
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

                .album-hero-section {
                    position: relative;
                    margin: -2rem -2rem 2.5rem -2rem;
                    padding: 4rem 4rem 3rem;
                    min-height: 300px;
                    display: flex;
                    align-items: flex-end;
                    overflow: hidden;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 0 0 32px 32px;
                    background: linear-gradient(135deg, #f97316 0%, #ef4444 100%);
                }

                .hero-background {
                    position: absolute;
                    inset: 0;
                    z-index: 1;
                }

                .hero-background img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    filter: blur(50px) brightness(0.7) saturate(1.2);
                    transform: scale(1.1);
                    opacity: 0.8;
                }

                .hero-overlay {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(to top, rgba(15, 23, 42, 0.8) 0%, rgba(249, 115, 22, 0.4) 100%);
                }

                .hero-content {
                    position: relative;
                    z-index: 2;
                    width: 100%;
                    max-width: 1400px;
                    margin: 0 auto;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    gap: 3rem;
                }

                .hero-main-info {
                    flex: 1;
                }

                .photographer-badge-premium {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    padding: 0.5rem 1rem 0.5rem 0.5rem;
                    border-radius: 99px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    width: fit-content;
                    margin-bottom: 1rem;
                }

                .p-badge-logo {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    object-fit: cover;
                    border: 1.5px solid white;
                }

                .p-badge-initials {
                    width: 32px;
                    height: 32px;
                    background: var(--primary-blue);
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 800;
                    font-size: 0.85rem;
                }

                .p-badge-name {
                    color: rgba(255, 255, 255, 0.9);
                    font-size: 0.9rem;
                    font-weight: 500;
                }

                .p-badge-name a {
                    color: white;
                    font-weight: 800;
                    text-decoration: none;
                }

                .hero-title {
                    font-size: clamp(1.75rem, 5vw, 2.75rem);
                    font-weight: 900;
                    color: white;
                    line-height: 1.2;
                    margin-bottom: 0.75rem;
                    letter-spacing: -0.01em;
                    text-shadow: 0 4px 12px rgba(0,0,0,0.3);
                }

                .hero-description {
                    font-size: 1rem;
                    color: rgba(255, 255, 255, 0.85);
                    max-width: 600px;
                    line-height: 1.5;
                    margin-bottom: 1.5rem;
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .hero-meta-row {
                    display: flex;
                    gap: 1.5rem;
                    flex-wrap: wrap;
                }

                .meta-item {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: rgba(255, 255, 255, 0.7);
                    font-size: 0.85rem;
                    font-weight: 600;
                    background: rgba(255, 255, 255, 0.05);
                    padding: 0.4rem 0.8rem;
                    border-radius: 8px;
                }

                .meta-item.free-label {
                    background: rgba(16, 185, 129, 0.2);
                    color: #10b981;
                }

                .hero-actions-hint {
                    flex-shrink: 0;
                    padding-bottom: 0.5rem;
                }

                .selection-hint-premium {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    background: rgba(245, 166, 35, 0.1);
                    border: 1px solid rgba(245, 166, 35, 0.3);
                    color: #F5A623;
                    padding: 1rem 1.5rem;
                    border-radius: 20px;
                    font-weight: 700;
                    font-size: 0.95rem;
                    backdrop-filter: blur(10px);
                }

                @media (max-width: 1024px) {
                    .album-hero-section {
                        margin: -1rem -1rem 2rem -1rem;
                        padding: 4rem 2rem 3rem;
                        min-height: auto;
                        border-radius: 0;
                    }
                    .hero-content {
                        flex-direction: column;
                        align-items: center;
                        text-align: center;
                        gap: 2rem;
                    }
                    .photographer-badge-premium {
                        margin: 0 auto 1.5rem;
                    }
                    .hero-meta-row {
                        justify-content: center;
                    }
                    .hero-description {
                        margin-left: auto;
                        margin-right: auto;
                    }
                }

                @media (max-width: 640px) {
                    .album-hero-section {
                        padding: 3rem 1.25rem 2.5rem;
                    }
                    .hero-title {
                        font-size: 1.75rem;
                    }
                    .hero-description {
                        font-size: 0.95rem;
                    }
                    .selection-hint-premium {
                        padding: 0.75rem 1rem;
                        font-size: 0.85rem;
                        width: 100%;
                        justify-content: center;
                    }
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
                    border: 2px solid var(--primary-blue);
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
                    border-radius: 12px;
                    box-shadow: 0 40px 100px rgba(0,0,0,0.8);
                    animation: imageZoom 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                    border: 1px solid rgba(255,255,255,0.1);
                }

                @media (min-width: 1025px) {
                    .lightbox-image-wrapper {
                        max-width: 75% !important;
                        max-height: 70vh !important;
                    }
                    
                    .lightbox-image-main {
                        max-height: 70vh;
                    }
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
                    height: 54px;
                    font-size: 0.95rem !important;
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
                        height: 48px;
                        font-size: 0.85rem !important;
                    }
                }

                .photo-actions {
                    padding: 0 0.5rem;
                }

                .add-to-cart-btn {
                    width: 100%;
                    font-size: 0.75rem !important;
                    height: 38px;
                    border: 1.5px solid var(--primary-blue) !important; /* Added Border */
                }

                .purchase-card {
                    background: var(--bg-primary);
                    padding: 1.25rem;
                    border-radius: var(--radius-xl);
                    border: 1px solid var(--border-light);
                    box-shadow: var(--shadow-lg);
                    position: sticky;
                    top: 100px;
                    max-width: 320px;
                }

                .purchase-header.compact {
                    margin-bottom: 1rem;
                }

                .package-description {
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                    margin-bottom: 0.5rem;
                    line-height: 1.4;
                }

                .package-dropdown-select {
                    width: 100%;
                    padding: 10px 14px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    font-size: 0.9rem;
                    font-weight: 700;
                    color: #1e293b;
                    cursor: pointer;
                    appearance: none;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 12px center;
                }

                .package-dropdown-select:focus {
                    border-color: var(--primary-blue);
                    outline: none;
                    background-color: white;
                }

                .purchase-details {
                    background: var(--bg-secondary);
                    padding: 1rem;
                    border-radius: var(--radius-lg);
                    margin-bottom: 0; /* Handled by container */
                }

                .pricing-accordion-container {
                    margin-top: 1rem;
                    margin-bottom: 1.25rem;
                }

                .pricing-toggle-btn {
                    width: 100%;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 14px;
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    font-size: 0.9rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    cursor: pointer;
                    transition: all 0.2s;
                    margin-bottom: 0.5rem;
                }

                .pricing-toggle-btn:hover {
                    background: #f8fafc;
                    border-color: #cbd5e1;
                }

                .pricing-toggle-btn.active {
                    background: #eff6ff;
                    border-color: var(--primary-blue);
                    color: var(--primary-blue);
                    margin-bottom: 0.75rem;
                }

                .toggle-left {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .pricing-icon {
                    color: #ea580c;
                }

                .purchase-details-panel {
                    animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }

                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .bib-search-container {
                    margin-bottom: 1.5rem;
                    padding: 4px;
                }

                .search-input-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .search-icon {
                    position: absolute;
                    left: 14px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #94a3b8;
                    pointer-events: none;
                    z-index: 2;
                }

                .bib-search-input {
                    width: 100%;
                    padding: 12px 16px 12px 52px !important;
                    background: #f8fafc;
                    border: 2px solid #f1f5f9;
                    border-radius: 12px;
                    font-size: 0.95rem;
                    font-weight: 600;
                    color: #1e293b;
                    transition: all 0.2s;
                    outline: none;
                }

                .bib-search-input:focus {
                    border-color: #ea580c; /* Orange focus */
                    background: white;
                    box-shadow: 0 0 0 4px rgba(234, 88, 12, 0.1);
                }

                .bib-search-input::placeholder {
                    color: #94a3b8;
                    font-weight: 500;
                }

                .clear-search-btn {
                    position: absolute;
                    right: 8px;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background: #e2e8f0;
                    color: #64748b;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .clear-search-btn:hover {
                    background: #cbd5e1;
                    color: #1e293b;
                }

                .search-no-results {
                    font-size: 0.75rem;
                    color: #ef4444;
                    margin-top: 0.5rem;
                    font-weight: 600;
                    text-align: center;
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
                        display: flex;
                        flex-direction: column;
                        width: 100%;
                        max-width: 100%;
                        gap: var(--spacing-xl);
                        margin: 0 auto;
                    }

                    .purchase-card-container {
                        width: 100%;
                        margin: 0 auto;
                    }

                    .purchase-card {
                        position: static;
                        width: 100%;
                        margin: 0 auto;
                    }
                }

                @media (max-width: 640px) {
                    .album-view-container {
                        padding: 10px 12px; /* Balanced side padding */
                        padding-bottom: 140px;
                        width: 100%;
                        max-width: 100vw;
                        overflow-x: hidden;
                        box-sizing: border-box;
                    }

                    .album-content-layout {
                        width: 100%;
                        max-width: 100%;
                        gap: 1.5rem;
                        display: flex;
                        flex-direction: column-reverse; /* Reorder: Pricing on Top */
                        margin: 0 auto;
                    }

                    .purchase-card-container {
                        width: 100%;
                        padding: 0;
                        margin: 0 auto;
                    }

                    .purchase-card {
                        padding: 1.25rem !important;
                        width: 100% !important;
                        max-width: 100%;
                        position: static !important;
                        box-sizing: border-box;
                        margin: 0 auto;
                        border-radius: 12px;
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
                        font-size: 0.65rem !important;
                        height: 34px !important;
                        padding: 0 8px !important;
                        border: 1px solid var(--primary-blue) !important;
                        letter-spacing: 0.02em !important;
                        white-space: nowrap;
                    }
                    
                    .album-title {
                        font-size: 1.5rem;
                        word-break: break-word; /* Prevent long title overflow */
                        text-align: center;
                    }

                    .photographer-info-row {
                        justify-content: center !important;
                    }

                    .selection-hint {
                        display: flex !important;
                        justify-content: center !important;
                        margin: 0 auto 1.5rem;
                        width: fit-content;
                    }

                    .free-album-banner {
                        padding: 0.6rem 1rem !important;
                        margin-bottom: 1.5rem !important;
                        border-radius: 8px !important;
                        width: 100%;
                    }

                    .banner-content {
                        font-size: 0.75rem !important;
                        gap: 0.5rem !important;
                        text-align: center;
                        justify-content: center;
                        width: 100%;
                    }

                    .free-claim-btn {
                        height: 48px !important;
                        font-size: 0.85rem !important;
                        border-radius: 10px !important;
                        padding: 0 1rem !important;
                    }

                    .free-claim-btn svg {
                        width: 18px !important;
                        height: 18px !important;
                    }

                    .free-disclaimer {
                        font-size: 0.65rem !important;
                        text-align: center;
                    }
                }
                .free-album-banner {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: white;
                    padding: 0.75rem 1.25rem;
                    border-radius: 12px;
                    margin-bottom: 2rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: slideDownIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
                }

                @keyframes slideDownIn {
                    from { transform: translateY(-20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }

                .banner-content {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    font-size: 0.9rem;
                    letter-spacing: 0.02em;
                }

                .banner-content strong {
                    font-weight: 800;
                    background: rgba(255, 255, 255, 0.2);
                    padding: 0.1rem 0.4rem;
                    border-radius: 4px;
                }

                .free-claim-wrapper {
                    margin-top: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    animation: fadeIn 0.5s ease;
                }

                .claim-divider {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    color: var(--text-tertiary);
                    font-size: 0.7rem;
                    font-weight: 700;
                }

                .claim-divider::before,
                .claim-divider::after {
                    content: "";
                    flex: 1;
                    height: 1px;
                    background: var(--border-light);
                }

                .free-claim-btn {
                    width: 100%;
                    min-height: 56px;
                    height: auto !important; /* Allow height to grow if needed */
                    padding: 0.75rem 1rem !important;
                    background: #10b981 !important;
                    border-color: #10b981 !important;
                    color: white !important;
                    font-weight: 800 !important;
                    font-size: 0.9rem !important; /* Slightly smaller to fit better */
                    border-radius: 12px !important;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.75rem;
                    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
                    line-height: 1.2;
                }

                .free-claim-btn:hover {
                    background: #059669 !important;
                    transform: translateY(-2px);
                    box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3) !important;
                }

                .free-disclaimer {
                    text-align: center;
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                    margin: 0;
                }
                .photo-bottom-info {
                    padding: 0.15rem 0.25rem 0.4rem;
                    background: transparent;
                    display: flex;
                    flex-direction: column;
                    gap: 0.3rem;
                }

                .bib-tags {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 4px;
                    margin-top: 0;
                }

                .bib-tag {
                    background: #ea580c;
                    color: white;
                    padding: 2px 8px; /* Slightly smaller padding */
                    border-radius: 4px;
                    font-size: 0.7rem; /* Reduced font size from 0.8rem */
                    font-weight: 800;
                    border: none;
                    transition: all 0.2s ease;
                    box-shadow: 0 1px 3px rgba(234, 88, 12, 0.2);
                }

                .bib-tag:hover {
                    background: #f97316;
                    transform: translateY(-1px);
                }

                .lightbox-image-wrapper {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1.5rem;
                    max-width: 90%;
                    max-height: 85vh;
                }

                .lightbox-bib-tags {
                    display: flex;
                    gap: 0.75rem;
                    flex-wrap: wrap;
                    justify-content: center;
                }

                .bib-tag.orange {
                    font-size: 0.95rem;
                    padding: 8px 16px;
                    background: #ea580c;
                    color: white;
                    border-radius: 6px;
                    box-shadow: 0 4px 12px rgba(234, 88, 12, 0.3);
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
                            <div className="lightbox-image-wrapper">
                                <img
                                    src={selectedPhotoForView.watermarked_url}
                                    alt={selectedPhotoForView.title}
                                    className="lightbox-image-main"
                                />
                                {selectedPhotoForView.bib_numbers && selectedPhotoForView.bib_numbers.length > 0 && (
                                    <div className="lightbox-bib-tags">
                                        {selectedPhotoForView.bib_numbers.map((bib, i) => (
                                            <span key={i} className="bib-tag orange">#{bib}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
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
