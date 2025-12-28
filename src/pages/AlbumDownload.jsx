
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
        <div className="download-page-container">
            <header className="download-page-header">
                <Link to="/my-purchases" className="back-link">
                    <span className="back-icon">←</span> Back to Purchases
                </Link>
                <div className="header-content">
                    <h1 className="album-title">{album?.title || 'Album'}</h1>
                    <span className="download-badge">Downloads Ready</span>
                </div>
            </header>

            {loading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading original high-resolution files...</p>
                </div>
            ) : (
                <div className="download-content">
                    <div className="download-stats">
                        <div className="stat-card">
                            <span className="stat-label">Available Items</span>
                            <span className="stat-value">{photos.length} photos</span>
                        </div>
                        <p className="download-instruction">
                            Click the buttons below to download your high-resolution image files.
                        </p>
                    </div>

                    <div className="download-grid">
                        {photos.map(photo => (
                            <div key={photo.id} className="download-card">
                                <div className="card-preview">
                                    <img src={photo.watermarked_url} alt="preview" loading="lazy" />
                                    <div className="resolution-label">Original HD</div>
                                </div>
                                <div className="card-info">
                                    <h3 className="photo-title">{photo.title || "Image File"}</h3>
                                    {photo.downloadUrl ? (
                                        <a
                                            href={photo.downloadUrl}
                                            download={photo.title || `photo-${photo.id}.jpg`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="download-anchor"
                                        >
                                            <Button className="download-button">
                                                <span className="download-icon">📥</span> Download
                                            </Button>
                                        </a>
                                    ) : (
                                        <div className="access-denied">
                                            <span className="denied-icon">⚠️</span>
                                            Access Denied
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <style>{`
                .download-page-container {
                    padding: var(--spacing-xl);
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .download-page-header {
                    margin-bottom: var(--spacing-2xl);
                }

                .back-link {
                    display: inline-flex;
                    align-items: center;
                    gap: var(--spacing-sm);
                    color: var(--text-secondary);
                    text-decoration: none;
                    font-size: var(--font-size-sm);
                    margin-bottom: var(--spacing-lg);
                    transition: color var(--transition-fast);
                }

                .back-link:hover {
                    color: var(--primary-blue);
                }

                .header-content {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: var(--spacing-md);
                    flex-wrap: wrap;
                }

                .album-title {
                    font-size: clamp(1.5rem, 5vw, 2.5rem);
                    font-weight: 800;
                    color: var(--text-primary);
                }

                .download-badge {
                    padding: var(--spacing-xs) var(--spacing-md);
                    background: rgba(16, 185, 129, 0.1);
                    color: var(--success-green);
                    border-radius: var(--radius-full);
                    font-weight: 600;
                    font-size: var(--font-size-sm);
                }

                .download-stats {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-xl);
                    margin-bottom: var(--spacing-2xl);
                    background: var(--bg-tertiary);
                    padding: var(--spacing-lg);
                    border-radius: var(--radius-xl);
                    flex-wrap: wrap;
                }

                .stat-card {
                    display: flex;
                    flex-direction: column;
                }

                .stat-label {
                    font-size: var(--font-size-xs);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: var(--text-tertiary);
                    font-weight: 600;
                }

                .stat-value {
                    font-size: var(--font-size-xl);
                    font-weight: 800;
                    color: var(--text-primary);
                }

                .download-instruction {
                    color: var(--text-secondary);
                    font-size: var(--font-size-sm);
                }

                .download-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: var(--spacing-xl);
                }

                .download-card {
                    background: var(--bg-primary);
                    border-radius: var(--radius-xl);
                    overflow: hidden;
                    border: 1px solid var(--border-light);
                    transition: all var(--transition-base);
                    box-shadow: var(--shadow-sm);
                    display: flex;
                    flex-direction: column;
                }

                .download-card:hover {
                    box-shadow: var(--shadow-lg);
                    transform: translateY(-4px);
                    border-color: var(--primary-blue-light);
                }

                .card-preview {
                    height: 200px;
                    position: relative;
                    background: #f0f4f8;
                    overflow: hidden;
                }

                .card-preview img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    opacity: 0.8;
                }

                .resolution-label {
                    position: absolute;
                    bottom: var(--spacing-sm);
                    right: var(--spacing-sm);
                    background: rgba(0, 0, 0, 0.6);
                    color: white;
                    padding: 2px 8px;
                    border-radius: var(--radius-sm);
                    font-size: 10px;
                    font-weight: 600;
                    text-transform: uppercase;
                }

                .card-info {
                    padding: var(--spacing-lg);
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-md);
                }

                .photo-title {
                    font-size: var(--font-size-sm);
                    color: var(--text-primary);
                    margin: 0;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .download-anchor {
                    text-decoration: none;
                }

                .download-button {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: var(--spacing-sm);
                }

                .access-denied {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: var(--spacing-sm);
                    padding: var(--spacing-sm);
                    background: rgba(239, 68, 68, 0.05);
                    color: var(--danger-red);
                    border-radius: var(--radius-md);
                    font-size: var(--font-size-sm);
                    font-weight: 600;
                }

                .loading-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 4rem;
                    gap: var(--spacing-md);
                    color: var(--text-secondary);
                }

                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 3px solid var(--border-light);
                    border-top-color: var(--primary-blue);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                @media (max-width: 640px) {
                    .download-page-container {
                        padding: var(--spacing-md);
                    }
                    .header-content {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: var(--spacing-sm);
                    }
                    .download-grid {
                        grid-template-columns: 1fr;
                        gap: var(--spacing-md);
                    }
                    .download-stats {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: var(--spacing-sm);
                    }
                }
            `}</style>
        </div>
    );
};

export default AlbumDownload;
