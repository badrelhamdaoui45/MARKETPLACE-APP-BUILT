
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { calculateCommission } from '../config/platform';

const BuyerProfile = () => {
    const { user } = useAuth();
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    // Ref to prevent double insertion on React Strict Mode
    const processedRef = useRef(false);

    useEffect(() => {
        if (user) {
            handlePurchaseSuccess().then(() => fetchPurchases());
        }
    }, [user]);

    const handlePurchaseSuccess = async () => {
        const sessionId = searchParams.get('session_id');
        const albumId = searchParams.get('album_id');
        const amount = searchParams.get('amount');
        const photosParam = searchParams.get('photos');

        console.log("Purchase Success Handler - Params:", { sessionId, albumId, amount, photosParam });

        // Check if we have parameters AND haven't processed yet
        if (sessionId && albumId && !processedRef.current) {
            processedRef.current = true;

            try {
                // 1. Fetch Album to get Photographer ID
                const { data: album, error: albumError } = await supabase.from('albums').select('photographer_id').eq('id', albumId).single();

                if (albumError) {
                    console.error("Album fetch error:", albumError);
                    throw albumError;
                }

                let photoIds = null;
                if (photosParam) {
                    try {
                        photoIds = JSON.parse(decodeURIComponent(photosParam));
                        console.log("Parsed photo IDs:", photoIds);
                    } catch (e) {
                        console.error("Failed to parse photos param", e);
                    }
                }

                if (album) {
                    console.log("Inserting transaction for album:", album);
                    // 2. Insert Transaction
                    const transactionAmount = parseFloat(amount);
                    const { data: insertedData, error } = await supabase.from('transactions').insert({
                        buyer_id: user.id,
                        photographer_id: album.photographer_id,
                        album_id: albumId,
                        amount: transactionAmount,
                        commission_amount: calculateCommission(transactionAmount),
                        stripe_payment_intent_id: sessionId,
                        status: 'paid',
                        unlocked_photo_ids: photoIds // Save specific photos if partial buy
                    }).select();

                    if (error) {
                        console.error("Transaction insert error:", error);
                        alert("Failed to record purchase: " + error.message);
                    } else {
                        console.log("Transaction inserted successfully:", insertedData);
                    }
                }

                // 3. Clear URL params
                setSearchParams({});

            } catch (err) {
                console.error("Purchase success handler error:", err);
            }
        }
    };

    const fetchPurchases = async () => {
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
                .eq('buyer_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPurchases(data);
        } catch (error) {
            console.error('Error fetching purchases:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '2rem' }}>My Purchases</h1>

            {loading ? (
                <p>Loading...</p>
            ) : purchases.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>You haven't purchased any albums yet.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {purchases.map((tx) => (
                        <div key={tx.id} style={{
                            background: 'var(--bg-secondary)',
                            padding: '1.5rem',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--border-subtle)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem' }}>{tx.albums?.title}</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                        Purchased on {new Date(tx.created_at).toLocaleDateString()} • ${tx.amount}
                                    </p>
                                </div>
                                {/* 
                  Real app would generate a signed URL for original_url here.
                  For prototype, we just link to watermarked or dummy download. 
                  If we had the original_url in transaction/album, we could link IF we have a policy.
                */}
                                <Button variant="outline" onClick={() => navigate(`/my-purchases/${tx.album_id}`)}>
                                    Download Originals
                                </Button>
                            </div>

                            <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--accent-primary)', fontSize: '0.9rem' }}>
                                <strong>Access Unlocked:</strong> You have full rights to these photos.
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default BuyerProfile;
