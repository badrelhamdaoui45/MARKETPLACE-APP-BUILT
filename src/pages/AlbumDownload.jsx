
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';

const AlbumDownload = () => {
    const { albumId } = useParams();
    const { user } = useAuth();
    const [photos, setPhotos] = useState([]);
    const [album, setAlbum] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) fetchData();
    }, [albumId, user]);

    const fetchData = async () => {
        try {
            // 1. Fetch Album Info
            const { data: albumData } = await supabase.from('albums').select('*').eq('id', albumId).single();
            setAlbum(albumData);

            // 2. Fetch Transaction to check for unlocked_photo_ids
            // Note: User might have purchased same album multiple times, get the most recent
            const { data: transactions, error: txError } = await supabase
                .from('transactions')
                .select('unlocked_photo_ids')
                .eq('buyer_id', user.id)
                .eq('album_id', albumId)
                .order('created_at', { ascending: false });

            console.log("Transaction data:", transactions);
            console.log("Transaction error:", txError);

            // Merge all unlocked photo IDs from all purchases
            let unlockedIds = [];
            if (transactions && transactions.length > 0) {
                transactions.forEach(tx => {
                    if (tx.unlocked_photo_ids && tx.unlocked_photo_ids.length > 0) {
                        unlockedIds = [...new Set([...unlockedIds, ...tx.unlocked_photo_ids])];
                    }
                });
            }

            console.log("Unlocked photo IDs (merged from all purchases):", unlockedIds);

            // 3. Fetch Photos Metadata
            let query = supabase.from('photos').select('*').eq('album_id', albumId);

            // If unlockedIds exists (partial purchase), filter the query. 
            // If it's null, we assume full album purchase (legacy compatibility).
            if (unlockedIds && unlockedIds.length > 0) {
                console.log("Filtering photos to unlocked IDs:", unlockedIds);
                query = query.in('id', unlockedIds);
            } else {
                console.log("No photo filtering - showing all photos (full album purchase or legacy)");
            }

            const { data: photosData, error } = await query;
            if (error) throw error;

            console.log("Photos fetched:", photosData?.length, "photos");

            // 4. Generate Signed URLs for each photo
            const photosWithUrls = await Promise.all(photosData.map(async (photo) => {
                const { data, error } = await supabase.storage
                    .from('original-photos')
                    .createSignedUrl(photo.original_url, 3600); // 1 hour expiry

                return {
                    ...photo,
                    downloadUrl: data?.signedUrl || null,
                    error: error
                };
            }));

            setPhotos(photosWithUrls);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadAll = () => {
        alert("To download all at once, we would generate a ZIP. For now, please download images individually below.");
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
            <Link to="/my-purchases" style={{ display: 'inline-block', marginBottom: '1rem', textDecoration: 'underline' }}>&larr; Back to Purchases</Link>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>{album?.title || 'Album'} - Downloads</h1>
                {/* <Button variant="outline" onClick={() => window.print()}>Print List</Button> */}
            </div>

            {loading ? <p>Loading original files...</p> : (
                <>
                    <p style={{ marginBottom: '1rem' }}>
                        You have access to <strong>{photos.length}</strong> photo{photos.length !== 1 && 's'}.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
                        {photos.map(photo => (
                            <div key={photo.id} style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                                <div style={{ height: '200px', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                    {/* Show watermarked thumb as preview */}
                                    <img src={photo.watermarked_url} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
                                </div>
                                <div style={{ padding: '1rem', textAlign: 'center' }}>
                                    <p style={{ fontSize: '0.8rem', marginBottom: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{photo.title}</p>
                                    {photo.downloadUrl ? (
                                        <a href={photo.downloadUrl} download={photo.title} target="_blank" rel="noopener noreferrer">
                                            <Button style={{ width: '100%', fontSize: '0.8rem' }}>Download Original</Button>
                                        </a>
                                    ) : (
                                        <p style={{ color: 'red', fontSize: '0.8rem' }}>Access Denied (Check Policy)</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default AlbumDownload;
