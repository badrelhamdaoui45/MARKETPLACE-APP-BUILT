
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import { calculateCommission } from '../config/platform';

const PublicAlbumView = () => {
    const { id } = useParams();
    const [album, setAlbum] = useState(null);
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(false);

    // Selection Mode State
    const [selectedPhotoIds, setSelectedPhotoIds] = useState(new Set());

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

    const togglePhotoSelection = (photoId) => {
        const newSelection = new Set(selectedPhotoIds);
        if (newSelection.has(photoId)) {
            newSelection.delete(photoId);
        } else {
            newSelection.add(photoId);
        }
        setSelectedPhotoIds(newSelection);
    };

    const calculatePrice = () => {
        if (!album) return 0;

        const quantity = selectedPhotoIds.size;
        if (quantity === 0) return 0;

        // 1. Use Pricing Package Tiers if available
        if (album.pricing_packages && album.pricing_packages.tiers) {
            // Volume Pricing Logic:
            // Find the highest tier that fits the quantity (e.g., if buying 3, and tiers are 1+ and 5+, use 1+ tier price).
            // Apply that UNIT price to ALL photos.

            const tiers = [...album.pricing_packages.tiers].sort((a, b) => b.quantity - a.quantity); // Descending (e.g., 50, 10, 5, 1)

            // Find first tier where quantity >= tier.quantity
            const activeTier = tiers.find(tier => quantity >= tier.quantity);

            if (activeTier) {
                return parseFloat((quantity * activeTier.price).toFixed(2));
            } else {
                // Should not happen if there is a '1' tier, but fallback to smallest quantity tier (which is sorted to be last)
                const smallestTier = tiers[tiers.length - 1];
                return parseFloat((quantity * smallestTier.price).toFixed(2));
            }
        }

        // 2. Fallback to Album Base Price
        return album.price;
    };

    const getPackageName = () => {
        if (album && album.pricing_packages) {
            return album.pricing_packages.name;
        }
        return "Standard Access";
    };

    const handlePurchase = async () => {
        if (!album) return;
        const count = selectedPhotoIds.size;

        // Validation
        if (album.pricing_packages && count === 0) {
            alert("Please select at least one photo to buy.");
            return;
        }

        setPurchasing(true);
        const finalPrice = calculatePrice();

        try {
            // 1. Get Photographer Stripe ID
            const { data: photographer, error } = await supabase
                .from('profiles')
                .select('stripe_account_id')
                .eq('id', album.photographer_id)
                .single();

            if (error || !photographer.stripe_account_id) {
                alert("This photographer hasn't set up payouts yet.");
                setPurchasing(false);
                return;
            }

            // 2. Create Session
            const { createCheckoutSession } = await import('../lib/stripe/service');
            const commission = calculateCommission(finalPrice);
            const photoIdsArray = Array.from(selectedPhotoIds);

            const session = await createCheckoutSession(
                album.id,
                finalPrice,
                photographer.stripe_account_id,
                commission,
                photoIdsArray
            );

            // 3. Redirect
            if (session.url) {
                window.location.href = session.url;
            } else {
                throw new Error("No checkout URL");
            }

        } catch (error) {
            console.error(error);
            alert('Payment initialization failed: ' + error.message);
            setPurchasing(false);
        }
    };

    if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;
    if (!album) return <div style={{ padding: '2rem' }}>Album not found or not published.</div>;

    const finalPrice = calculatePrice();
    const pkgName = getPackageName();
    const hasPackage = !!album.pricing_packages;
    const selectionCount = selectedPhotoIds.size;

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 300px', gap: '4rem', alignItems: 'start' }}>

                {/* Left: Photos Grid */}
                <div>
                    <div style={{ marginBottom: '2rem' }}>
                        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{album.title}</h1>
                        <p style={{ color: 'var(--text-secondary)' }}>by {album.profiles?.full_name}</p>
                        {hasPackage && <p style={{ marginTop: '0.5rem', color: 'var(--accent-primary)', fontWeight: '500' }}>Click photos to select for purchase</p>}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                        {photos.map(photo => {
                            const isSelected = selectedPhotoIds.has(photo.id);
                            return (
                                <div
                                    key={photo.id}
                                    onClick={() => hasPackage && togglePhotoSelection(photo.id)}
                                    style={{
                                        position: 'relative',
                                        borderRadius: 'var(--radius-md)',
                                        overflow: 'hidden',
                                        cursor: hasPackage ? 'pointer' : 'default',
                                        border: isSelected ? '3px solid var(--accent-primary)' : '3px solid transparent',
                                        transition: 'all 0.2s',
                                        transform: isSelected ? 'scale(0.98)' : 'scale(1)'
                                    }}
                                >
                                    <img
                                        src={photo.watermarked_url}
                                        alt={photo.title}
                                        style={{ width: '100%', display: 'block' }}
                                    />
                                    {/* Selection Checkmark */}
                                    {isSelected && (
                                        <div style={{
                                            position: 'absolute', top: '0.5rem', right: '0.5rem',
                                            background: 'var(--accent-primary)', color: 'white',
                                            borderRadius: '50%', width: '24px', height: '24px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '14px', fontWeight: 'bold'
                                        }}>
                                            ✓
                                        </div>
                                    )}

                                    {!isSelected && hasPackage && (
                                        <div className="hover-overlay" style={{
                                            position: 'absolute', inset: 0,
                                            background: 'rgba(0,0,0,0.2)',
                                            opacity: 0,
                                            transition: 'opacity 0.2s',
                                            pointerEvents: 'none'
                                        }} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right: Purchase Card */}
                <div style={{
                    background: 'var(--bg-secondary)',
                    padding: '2rem',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-subtle)',
                    position: 'sticky',
                    top: '100px'
                }}>
                    <h2 style={{ marginBottom: '1rem' }}>{pkgName}</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                        {hasPackage
                            ? "Select photos from the grid to calculate price."
                            : `Full album access for $${album.price}`}
                    </p>

                    <div style={{ marginBottom: '2rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span>Selected</span>
                            <strong>{selectionCount} photos</strong>
                        </div>

                        {/* Show Tiers Info */}
                        {hasPackage && album.pricing_packages.tiers && (
                            <div style={{ margin: '1rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Pricing Tiers:</p>
                                {album.pricing_packages.tiers.sort((a, b) => a.quantity - b.quantity).map((tier, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                        <span>{tier.quantity}+ Photos</span>
                                        <span>${tier.price} / each</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '1rem 0' }}></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 'bold' }}>
                            <span>Total Price</span>
                            <span style={{ color: 'var(--accent-primary)' }}>${finalPrice}</span>
                        </div>
                    </div>

                    <Button className="w-full" style={{ width: '100%' }} onClick={handlePurchase} disabled={purchasing || (hasPackage && selectionCount === 0)}>
                        {purchasing ? 'Processing...' : (hasPackage ? `Buy ${selectionCount} Photos` : 'Buy Full Album')}
                    </Button>

                    <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                        Secure payment via Stripe
                    </p>
                </div>

            </div>
        </div>
    );
};

export default PublicAlbumView;
