import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import PhotoUpload from '../components/PhotoUpload';
import Button from '../components/ui/Button';
import { ArrowLeft, Trash2, Upload, Eye, EyeOff, Share2, Copy, Check, Hash } from 'lucide-react';
import Toast from '../components/ui/Toast';
import { detectBibs } from '../lib/gemini';

const AlbumDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [album, setAlbum] = useState(null);
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [toast, setToast] = useState(null);
    const [isDetecting, setIsDetecting] = useState(false);

    useEffect(() => {
        fetchAlbumDetails();
    }, [id]);

    const fetchAlbumDetails = async () => {
        try {
            // Fetch Album
            const { data: albumData, error: albumError } = await supabase
                .from('albums')
                .select(`
                    *,
                    profiles:photographer_id (full_name)
                `)
                .eq('id', id)
                .single();

            if (albumError) throw albumError;
            setAlbum(albumData);

            // Fetch Photos
            const { data: photosData, error: photosError } = await supabase
                .from('photos')
                .select('*')
                .eq('album_id', id)
                .order('created_at', { ascending: false });

            if (photosError) throw photosError;
            setPhotos(photosData);
        } catch (error) {
            console.error('Error fetching details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePublishToggle = async () => {
        try {
            const { error } = await supabase
                .from('albums')
                .update({ is_published: !album.is_published })
                .eq('id', id);

            if (error) throw error;
            setAlbum({ ...album, is_published: !album.is_published });
        } catch (error) {
            console.error('Error updating album:', error);
        }
    };

    const handleDeletePhoto = async (photoId, photoTitle) => {
        if (!window.confirm(`Are you sure you want to delete "${photoTitle}"?`)) return;

        try {
            const { error } = await supabase
                .from('photos')
                .delete()
                .eq('id', photoId);

            if (error) throw error;

            // Update UI
            setPhotos(photos.filter(p => p.id !== photoId));
        } catch (error) {
            console.error('Error deleting photo:', error);
            alert('Failed to delete photo.');
        }
    };

    const handleShare = () => {
        const photogName = album?.profiles?.full_name || 'photographer';
        const shareUrl = `${window.location.origin}/albums/${encodeURIComponent(photogName)}/${encodeURIComponent(album.title)}`;

        navigator.clipboard.writeText(shareUrl).then(() => {
            setCopied(true);
            setToast({ message: 'Lien copié avec succès !', type: 'success' });
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleDetectAllBibs = async () => {
        if (photos.length === 0) return;
        if (!confirm(`This will use AI to scan ${photos.length} photos for bib numbers. Continue?`)) return;

        setIsDetecting(true);
        let successCount = 0;
        let errorCount = 0;

        try {
            for (const photo of photos) {
                // Skip if already has bibs (optional optimization)
                // if (photo.bib_numbers && photo.bib_numbers.length > 0) continue;

                const detected = await detectBibs(photo.watermarked_url);

                if (detected && detected.length > 0) {
                    const { error } = await supabase
                        .from('photos')
                        .update({ bib_numbers: detected })
                        .eq('id', photo.id);

                    if (!error) successCount++;
                    else errorCount++;
                }

                // Small delay to avoid rate limiting
                await new Promise(r => setTimeout(r, 1000));
            }

            setToast({
                message: `Detection complete! Found bibs in ${successCount} photos.${errorCount > 0 ? ` (${errorCount} errors)` : ''}`,
                type: successCount > 0 ? 'success' : 'info'
            });

            // Refresh photos to show tags
            fetchAlbumDetails();
        } catch (error) {
            console.error("Batch detection error:", error);
            setToast({
                message: `AI Detection failed: ${error.message || 'Check your API key and network.'}`,
                type: 'error'
            });
        } finally {
            setIsDetecting(false);
        }
    };

    if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;
    if (!album) return <div style={{ padding: '2rem' }}>Album not found</div>;

    return (
        <div className="album-details-container">
            {/* Header Section */}
            <header className="album-details-header">
                <div className="header-top">
                    <Button variant="outline" onClick={() => navigate('/photographer/dashboard')} className="back-btn">
                        <ArrowLeft size={16} /> Back
                    </Button>
                    <div className="album-status-badge">
                        <span className={`status-dot ${album.is_published ? 'published' : 'draft'}`}></span>
                        {album.is_published ? 'Published' : 'Draft'}
                    </div>
                </div>

                <div className="header-content">
                    <div className="header-info">
                        <h1 className="album-title">{album.title}</h1>
                        <p className="album-description">{album.description || "No description"}</p>
                        <div className="album-meta-row">
                            <div className="meta-item">
                                <span className="meta-label">Price</span>
                                <span className="meta-value">${album.price}</span>
                            </div>
                            <div className="meta-item">
                                <span className="meta-label">Photos</span>
                                <span className="meta-value">{photos.length}</span>
                            </div>
                            <div className="meta-item">
                                <span className="meta-label">Created on</span>
                                <span className="meta-value">{new Date(album.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>

                        <div className="share-link-banner" style={{
                            marginTop: '1.5rem',
                            padding: '1rem',
                            background: 'white',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '1rem',
                            border: '1px solid var(--border-light)',
                            boxShadow: 'var(--shadow-sm)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                                <div style={{ background: '#eff6ff', width: '36px', height: '36px', borderRadius: '8px', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Share2 size={18} />
                                </div>
                                <div style={{ overflow: 'hidden' }}>
                                    <p style={{ fontSize: '0.7rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px', letterSpacing: '0.05em' }}>SHAREABLE LINK</p>
                                    <p style={{ fontSize: '0.85rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '500' }}>
                                        {album?.profiles?.full_name ? `${window.location.origin}/albums/${encodeURIComponent(album.profiles.full_name)}/${encodeURIComponent(album.title)}` : 'Generating link...'}
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant={copied ? "secondary" : "outline"}
                                onClick={handleShare}
                                style={{ minWidth: '110px', height: '40px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                            >
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                                {copied ? 'Copied!' : 'Copy Link'}
                            </Button>
                        </div>
                    </div>

                    <div className="header-actions">
                        <Button
                            onClick={handlePublishToggle}
                            variant={album.is_published ? 'secondary' : 'primary'}
                            className="publish-btn"
                        >
                            {album.is_published ? <EyeOff size={16} style={{ marginRight: '8px' }} /> : <Eye size={16} style={{ marginRight: '8px' }} />}
                            {album.is_published ? 'Unpublish' : 'Publish Album'}
                        </Button>
                    </div>
                </div>
            </header>

            {/* Upload Section */}
            <section className="upload-section-card">
                <div className="section-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ background: 'var(--bg-tertiary)', padding: '0.5rem', borderRadius: '50%' }}>
                            <Upload size={24} color="var(--primary-blue)" />
                        </div>
                        <div>
                            <h2>Add Photos</h2>
                            <p>Drag and drop your files or click to select</p>
                        </div>
                    </div>
                </div>
                <PhotoUpload albumId={id} onUploadComplete={fetchAlbumDetails} />
            </section >

            {/* Photos Grid Section */}
            <section className="photos-section">
                <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2>Gallery ({photos.length})</h2>
                    {photos.length > 0 && (
                        <Button
                            variant="outline"
                            onClick={handleDetectAllBibs}
                            disabled={isDetecting}
                            className="detect-bibs-btn"
                            style={{ gap: '0.5rem' }}
                        >
                            {isDetecting ? (
                                <>
                                    <span className="spinner"></span> Detecting...
                                </>
                            ) : (
                                <>
                                    <Upload size={16} /> Detect Bibs
                                </>
                            )}
                        </Button>
                    )}
                </div>

                {
                    photos.length === 0 ? (
                        <div className="empty-state">
                            <p>No photos in this album yet.</p>
                        </div>
                    ) : (
                        <div className="album-manage-grid">
                            {photos.map(photo => (
                                <div key={photo.id} className="album-manage-item">
                                    <div className="photo-image-container">
                                        <img
                                            src={photo.watermarked_url}
                                            alt={photo.title}
                                            className="manage-photo-img"
                                        />
                                        {photo.bib_numbers && photo.bib_numbers.length > 0 && (
                                            <div className="bib-tags">
                                                {photo.bib_numbers.map((bib, i) => (
                                                    <span key={i} className="bib-tag">#{bib}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="manage-overlay">
                                        <div className="photo-info-overlay">
                                            <span className="photo-name">{photo.title}</span>
                                        </div>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={() => handleDeletePhoto(photo.id, photo.title)}
                                            className="delete-btn"
                                        >
                                            <Trash2 size={14} style={{ marginRight: '4px' }} /> Delete
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                }
            </section >

            <style>{`
                .album-details-container {
                    padding: 2rem;
                    max-width: 1200px;
                    margin: 0 auto;
                    min-height: 80vh;
                }

                .album-details-header {
                    margin-bottom: 3rem;
                    border-bottom: 1px solid var(--border-subtle);
                    padding-bottom: 2rem;
                }

                .header-top {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                }

                .back-btn {
                    font-size: 0.9rem !important;
                    padding: 0.5rem 1rem !important;
                    display: flex;
                    gap: 0.5rem;
                }

                .album-status-badge {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.9rem;
                    font-weight: 600;
                    padding: 0.4rem 0.8rem;
                    background: var(--bg-tertiary);
                    border-radius: 50px;
                    color: var(--text-secondary);
                }

                .status-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                }

                .status-dot.published { background: #22c55e; }
                .status-dot.draft { background: #eab308; }

                .header-content {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    gap: 2rem;
                }

                .album-title {
                    font-size: 2.5rem;
                    font-weight: 800;
                    color: var(--text-primary);
                    margin-bottom: 0.5rem;
                    line-height: 1.1;
                }

                .album-description {
                    color: var(--text-secondary);
                    font-size: 1.1rem;
                    margin-bottom: 1.5rem;
                    max-width: 600px;
                }

                .album-meta-row {
                    display: flex;
                    gap: 2.5rem;
                }

                .meta-item {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }

                .meta-label {
                    font-size: 0.8rem;
                    text-transform: uppercase;
                    color: var(--text-tertiary);
                    font-weight: 600;
                    letter-spacing: 0.05em;
                }

                .meta-value {
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .publish-btn {
                    min-width: 160px;
                    display: flex;
                    align-items: center;
                }

                .upload-section-card {
                    background: #ffffff;
                    border: 1px solid var(--border-subtle);
                    border-radius: 12px;
                    padding: 2rem;
                    margin-bottom: 3rem;
                    box-shadow: var(--shadow-sm);
                }

                .section-header {
                    margin-bottom: 1.5rem;
                }

                .section-header h2 {
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin-bottom: 0.25rem;
                }

                .section-header p {
                    color: var(--text-secondary);
                    margin: 0;
                }

                .photos-section {
                    margin-bottom: 4rem;
                }

                .empty-state {
                    text-align: center;
                    padding: 4rem;
                    background: var(--bg-tertiary);
                    border-radius: 12px;
                    color: var(--text-secondary);
                    font-style: italic;
                }

                .album-manage-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 1.5rem;
                }

                .album-manage-item {
                    border-radius: 8px;
                    overflow: hidden;
                    background: var(--bg-tertiary);
                    position: relative;
                    box-shadow: var(--shadow-sm);
                    transition: all 0.3s ease;
                    border: 1px solid transparent;
                }

                .album-manage-item:hover {
                    transform: translateY(-4px);
                    box-shadow: var(--shadow-md);
                    border-color: var(--border-subtle);
                }

                .manage-photo-img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: block;
                }

                .manage-overlay {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 100%);
                    opacity: 0;
                    transition: opacity 0.2s ease;
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-end;
                    padding: 1rem;
                }

                .album-manage-item:hover .manage-overlay {
                    opacity: 1;
                }

                .photo-info-overlay {
                    margin-bottom: 0.5rem;
                }
                
                .photo-name {
                    color: white;
                    font-size: 0.8rem;
                    font-weight: 500;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
                }

                .delete-btn {
                    width: 100%;
                    background: rgba(239, 68, 68, 0.9) !important;
                    backdrop-filter: blur(4px);
                    border: none !important;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .photo-image-container {
                    position: relative;
                    width: 100%;
                    aspect-ratio: 4/5;
                    overflow: hidden;
                    background: #f8fafc;
                }

                .bib-tags {
                    position: absolute;
                    top: 8px;
                    left: 8px;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 4px;
                    z-index: 5;
                }

                .bib-tag {
                    background: rgba(15, 23, 42, 0.8);
                    color: white;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 0.7rem;
                    font-weight: 700;
                    backdrop-filter: blur(4px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }

                .detect-bibs-btn {
                    font-size: 0.85rem !important;
                    font-weight: 700 !important;
                    border: 2px solid var(--primary-blue) !important;
                    color: var(--primary-blue) !important;
                }

                .detect-bibs-btn:hover {
                    background: var(--bg-tertiary) !important;
                }

                .detect-bibs-btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                .spinner {
                    width: 14px;
                    height: 14px;
                    border: 2px solid currentColor;
                    border-top-color: transparent;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    display: inline-block;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                @media (max-width: 768px) {
                    .album-details-container { padding: 1rem; }
                    
                    .header-top {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 1rem;
                        margin-bottom: 1.5rem;
                    }

                    .header-content { 
                        flex-direction: column; 
                        align-items: flex-start; 
                        gap: 1.5rem; 
                    }
                    
                    .header-actions { 
                        width: 100%; 
                    }
                    
                    .publish-btn { 
                        width: 100%; 
                        justify-content: center; 
                    }
                    
                    .album-title { 
                        font-size: 1.85rem; 
                        letter-spacing: -0.02em;
                    }
                    
                    .album-description {
                        font-size: 1rem;
                    }

                    .album-meta-row { 
                        gap: 1.25rem; 
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        width: 100%;
                        background: #f8fafc;
                        padding: 1rem;
                        border-radius: 12px;
                        margin-bottom: 2rem;
                    }

                    .share-link-banner {
                        padding: 0.75rem !important;
                        flex-direction: column;
                        align-items: stretch !important;
                        gap: 0.75rem !important;
                        margin-top: 0 !important;
                        margin-bottom: 1.5rem !important;
                    }

                    .share-link-banner .header-info {
                        padding-right: 0;
                    }

                    .share-link-banner button {
                        width: 100%;
                    }

                    .album-manage-grid {
                        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                        gap: 1rem;
                    }

                    .section-header {
                        flex-direction: column;
                        align-items: flex-start !important;
                        gap: 1rem;
                    }

                    .detect-bibs-btn {
                        width: 100%;
                        justify-content: center;
                    }

                    /* Make actions more visible on mobile since hover isn't reliable */
                    .manage-overlay {
                        opacity: 1;
                        background: linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(0,0,0,0.6) 100%);
                        padding: 0.75rem;
                    }

                    .photo-name {
                        display: none; /* Hide name to save space on small grid */
                    }

                    .delete-btn {
                        padding: 6px !important;
                        font-size: 0.75rem !important;
                    }

                    .bib-tag {
                        font-size: 0.65rem;
                        padding: 2px 4px;
                    }
                }

                @media (max-width: 480px) {
                    .album-title { font-size: 1.6rem; }
                    .album-meta-row { grid-template-columns: 1fr; }
                    .album-manage-grid {
                        grid-template-columns: repeat(2, 1fr); /* Force 2 columns on very small screens */
                        gap: 0.75rem;
                    }
                }
            `}</style>
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div >
    );
};

export default AlbumDetails;
