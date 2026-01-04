import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import PhotoUpload from '../components/PhotoUpload';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { ArrowLeft, Trash2, Upload, Eye, EyeOff, Share2, Copy, Check, Hash } from 'lucide-react';
import Toast from '../components/ui/Toast';
import { detectBibs } from '../lib/gemini';

const AlbumDetails = () => {
    const { albumTitle } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [album, setAlbum] = useState(null);
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [toast, setToast] = useState(null);
    const [isDetecting, setIsDetecting] = useState(false);
    const [availablePackages, setAvailablePackages] = useState([]);
    const [isEditingPackages, setIsEditingPackages] = useState(false);

    useEffect(() => {
        if (user && albumTitle) {
            fetchAlbumDetails();
        }
    }, [albumTitle, user]);

    const fetchAlbumDetails = async () => {
        try {
            // Fetch Album by title and photographer_id
            const { data: albumData, error: albumError } = await supabase
                .from('albums')
                .select(`
                    *,
                    profiles:photographer_id (full_name)
                `)
                .eq('photographer_id', user.id)
                .ilike('title', decodeURIComponent(albumTitle))
                .single();

            if (albumError) throw albumError;
            setAlbum(albumData);

            // Fetch Photos using the fetched album ID
            const { data: photosData, error: photosError } = await supabase
                .from('photos')
                .select('*')
                .eq('album_id', albumData.id)
                .order('created_at', { ascending: false });

            if (photosError) throw photosError;
            setPhotos(photosData);

            // Fetch all available packages for selection
            const { data: pkgData } = await supabase
                .from('pricing_packages')
                .select('*')
                .eq('photographer_id', user.id);
            setAvailablePackages(pkgData || []);
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
                .eq('id', album.id);

            if (error) throw error;
            setAlbum({ ...album, is_published: !album.is_published });
        } catch (error) {
            console.error('Error updating album:', error);
        }
    };

    const handleUpdatePackages = async (newPackageIds) => {
        try {
            const { error } = await supabase
                .from('albums')
                .update({ pricing_package_ids: newPackageIds })
                .eq('id', album.id);

            if (error) throw error;
            setAlbum({ ...album, pricing_package_ids: newPackageIds });
            setToast({ message: 'Modèles de prix mis à jour !', type: 'success' });
        } catch (error) {
            console.error('Error updating packages:', error);
            setToast({ message: 'Erreur lors de la mise à jour.', type: 'error' });
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

    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        variant: 'info',
        confirmText: 'Confirm',
        showCancel: true
    });

    const openModal = (config) => {
        setModalConfig({ ...config, isOpen: true });
    };

    const closeModal = () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }));
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


    const performBibDetection = async () => {
        setIsDetecting(true);
        let successCount = 0;
        let errorCount = 0;

        try {
            for (const photo of photos) {
                const detected = await detectBibs(photo.watermarked_url);

                if (detected && detected.length > 0) {
                    const { error } = await supabase
                        .from('photos')
                        .update({ bib_numbers: detected })
                        .eq('id', photo.id);

                    if (!error) successCount++;
                    else errorCount++;
                }

                await new Promise(r => setTimeout(r, 1000));
            }

            // USER REQUEST: Show MODULE (Modal) for results, not Alert/Toast
            if (successCount > 0) {
                openModal({
                    title: 'Detection Complete',
                    message: `Found bib numbers in ${successCount} photos.${errorCount > 0 ? ` (${errorCount} errors)` : ''}`,
                    variant: 'success',
                    confirmText: 'Close',
                    showCancel: false, // Single button for info
                    onConfirm: closeModal
                });
            } else {
                openModal({
                    title: 'No Bibs Found',
                    message: 'The AI did not detect any bib numbers in the scanned photos.',
                    variant: 'info',
                    confirmText: 'Close',
                    showCancel: false, // Single button
                    onConfirm: closeModal
                });
            }

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

    const handleDetectAllBibs = () => {
        if (photos.length === 0) return;

        // USER REQUEST: Show MODULE (Modal) for confirmation
        openModal({
            title: 'Start AI Detection?',
            message: `This will use AI to scan ${photos.length} photos for bib numbers. This may take a few moments.`,
            variant: 'info',
            confirmText: 'Start Scan',
            cancelText: 'Cancel',
            showCancel: true,
            onConfirm: performBibDetection
        });
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
                        <div className="album-info-card">
                            <div className="info-group main-group">
                                <label className="modern-label">ALBUM NAME</label>
                                <h1 className="album-title-modern">{album.title}</h1>
                            </div>

                            <div className="info-group">
                                <label className="modern-label">DESCRIPTION</label>
                                <p className="album-description-modern">{album.description || "No description provided."}</p>
                            </div>

                            <div className="modern-meta-grid">
                                <div className="meta-box">
                                    <label className="modern-label">PRICE</label>
                                    <span className="meta-value-modern">${album.price}</span>
                                </div>
                                <div className="meta-box">
                                    <label className="modern-label">PHOTOS</label>
                                    <span className="meta-value-modern">{photos.length}</span>
                                </div>
                                <div className="meta-box">
                                    <label className="modern-label">CREATED ON</label>
                                    <span className="meta-value-modern">{new Date(album.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="album-packages-section">
                                <div className="packages-header-row">
                                    <label className="modern-label">MODÈLES DE PRIX ACTIFS</label>
                                    <button
                                        className="edit-packages-toggle"
                                        onClick={() => setIsEditingPackages(!isEditingPackages)}
                                    >
                                        {isEditingPackages ? 'Terminer' : 'Gérer'}
                                    </button>
                                </div>

                                <div className="active-packages-list">
                                    {(album.pricing_package_ids || []).length === 0 ? (
                                        <p className="no-packages-text">Aucun modèle lié. Prix fixe: ${album.price}</p>
                                    ) : (
                                        <div className="package-tags-flow">
                                            {album.pricing_package_ids.map(id => {
                                                const pkg = availablePackages.find(p => p.id === id);
                                                return pkg ? (
                                                    <span key={id} className={`package-tag-pill ${pkg.package_type}`}>
                                                        {pkg.name}
                                                    </span>
                                                ) : null;
                                            })}
                                        </div>
                                    )}
                                </div>

                                {isEditingPackages && (
                                    <div className="package-selection-editor">
                                        <div className="available-packages-grid">
                                            {availablePackages.map(pkg => {
                                                const isActive = (album.pricing_package_ids || []).includes(pkg.id);
                                                return (
                                                    <label key={pkg.id} className={`package-select-item ${isActive ? 'active' : ''}`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isActive}
                                                            onChange={() => {
                                                                const currentIds = album.pricing_package_ids || [];
                                                                const newIds = isActive
                                                                    ? currentIds.filter(id => id !== pkg.id)
                                                                    : [...currentIds, pkg.id];
                                                                handleUpdatePackages(newIds);
                                                            }}
                                                        />
                                                        <div className="pkg-sel-info">
                                                            <strong>{pkg.name}</strong>
                                                            <span>{pkg.package_type}</span>
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                        <div className="editor-footer">
                                            <p>Sélectionnez les modèles à proposer aux acheteurs.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="share-link-banner">
                            <div className="share-link-content">
                                <div className="share-icon-wrapper">
                                    <Share2 size={18} />
                                </div>
                                <div className="share-text-wrapper">
                                    <p className="share-label">SHAREABLE LINK</p>
                                    <p className="share-url-text">
                                        {album?.profiles?.full_name ? `${window.location.origin}/albums/${encodeURIComponent(album.profiles.full_name)}/${encodeURIComponent(album.title)}` : 'Generating link...'}
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant={copied ? "secondary" : "outline"}
                                onClick={handleShare}
                                className="copy-link-btn"
                            >
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                                {copied ? 'Copied!' : 'Link'}
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
                <PhotoUpload albumId={album.id} onUploadComplete={fetchAlbumDetails} />
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
                    margin-bottom: 2rem;
                    gap: 1.5rem;
                }

                .header-content {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 2rem;
                    width: 100%;
                }

                .header-info {
                    flex: 1;
                    min-width: 0; /* Important for preventing overflow on flex items */
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                .header-actions {
                    flex-shrink: 0;
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

                .album-info-card {
                    background: #ffffff;
                    border: 1px solid var(--border-subtle);
                    border-radius: 16px;
                    padding: 2rem;
                    box-shadow: var(--shadow-sm);
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                .info-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .modern-label {
                    font-size: 0.75rem;
                    font-weight: 800;
                    color: var(--text-tertiary);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .album-title-modern {
                    font-size: 2rem;
                    font-weight: 800;
                    color: var(--text-primary);
                    line-height: 1.1;
                }

                .album-description-modern {
                    font-size: 1rem;
                    color: var(--text-secondary);
                    line-height: 1.5;
                }

                .modern-meta-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 1.5rem;
                    margin-top: 0.5rem;
                    padding-top: 1.5rem;
                    border-top: 1px dashed var(--border-light);
                }

                .meta-box {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }

                .meta-value-modern {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }

                /* Mobile responsiveness for the card */
                @media (max-width: 768px) {
                    .album-info-card {
                        padding: 1.5rem;
                    }
                    .modern-meta-grid {
                        grid-template-columns: 1fr;
                        gap: 1.25rem;
                    }
                }

                .publish-btn {
                    min-width: 160px;
                    display: flex;
                    align-items: center;
                    font-weight: 700 !important;
                    justify-content: center;
                    gap: 0.5rem;
                    background-color: #F5A623 !important;
                    border-color: #F5A623 !important;
                    color: white !important;
                    transition: all 0.2s;
                }

                .publish-btn:hover {
                    background-color: #e59512 !important;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(245, 166, 35, 0.3);
                }

                .publish-btn:active {
                    transform: translateY(0);
                }

                .share-link-banner {
                    margin-top: 1.5rem;
                    padding: 1rem;
                    background: white;
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 1rem;
                    border: 1px solid var(--border-subtle);
                    box-shadow: var(--shadow-sm);
                }

                .share-link-content {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    flex: 1;
                    min-width: 0;
                }

                .share-icon-wrapper {
                    background: #f0f9ff;
                    width: 40px;
                    height: 40px;
                    border-radius: 10px;
                    color: #0369a1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .share-text-wrapper {
                    overflow: hidden;
                    flex: 1;
                }

                .share-label {
                    font-size: 0.65rem;
                    font-weight: 800;
                    color: var(--text-tertiary);
                    text-transform: uppercase;
                    margin-bottom: 2px;
                    letter-spacing: 0.05em;
                }

                .share-url-text {
                    font-size: 0.85rem;
                    color: var(--text-primary);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    font-weight: 600;
                    word-break: break-all; /* Fallback for very long single words */
                }

                .copy-link-btn {
                    min-width: 110px;
                    height: 42px;
                    font-size: 0.85rem !important;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
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

                .album-packages-section {
                    margin-top: 0.5rem;
                    padding-top: 1.5rem;
                    border-top: 1px dashed var(--border-light);
                }

                .packages-header-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.75rem;
                }

                .edit-packages-toggle {
                    background: transparent;
                    border: none;
                    color: var(--primary-blue);
                    font-size: 0.8rem;
                    font-weight: 700;
                    cursor: pointer;
                    text-decoration: underline;
                }

                .package-tags-flow {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }

                .package-tag-pill {
                    font-size: 0.75rem;
                    font-weight: 700;
                    padding: 0.4rem 0.8rem;
                    border-radius: 8px;
                    background: var(--bg-tertiary);
                    border: 1px solid var(--border-subtle);
                }

                .package-tag-pill.digital {
                    color: #0369a1;
                    background: #f0f9ff;
                    border-color: #bae6fd;
                }

                .package-tag-pill.physical {
                    color: #92400e;
                    background: #fffbeb;
                    border-color: #fef3c7;
                }

                .no-packages-text {
                    font-size: 0.9rem;
                    color: var(--text-tertiary);
                    font-style: italic;
                }

                .package-selection-editor {
                    margin-top: 1.5rem;
                    background: #f8fafc;
                    padding: 1rem;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                }

                .available-packages-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
                    gap: 0.75rem;
                }

                .package-select-item {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem;
                    background: white;
                    border: 2px solid transparent;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .package-select-item:hover {
                    border-color: #cbd5e1;
                }

                .package-select-item.active {
                    border-color: var(--primary-blue);
                    background: #eff6ff;
                }

                .pkg-sel-info {
                    display: flex;
                    flex-direction: column;
                }

                .pkg-sel-info strong {
                    font-size: 0.85rem;
                    color: var(--text-primary);
                }

                .pkg-sel-info span {
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                    text-transform: uppercase;
                    font-weight: 700;
                }

                .editor-footer {
                    margin-top: 1rem;
                    font-size: 0.75rem;
                    color: #64748b;
                    text-align: center;
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
                    .album-details-container { 
                        padding: 1rem; 
                    }
                    
                    .header-top {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 1rem;
                        margin-bottom: 1.5rem;
                    }

                    .header-content { 
                        flex-direction: column; 
                        gap: 1.5rem; 
                    }
                    
                    .header-info {
                        width: 100%;
                    }

                    .header-actions { 
                        width: 100%; 
                    }
                    
                    .publish-btn { 
                        width: 100%; 
                        height: 48px;
                        justify-content: center; 
                    }
                    
                    .album-title-modern { 
                        font-size: 1.75rem; 
                        word-break: break-word;
                    }

                    .share-link-banner {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 1rem;
                        padding: 1rem;
                    }

                    .share-link-content {
                        gap: 0.75rem;
                    }

                    .share-url-text {
                        white-space: normal;
                        word-break: break-all;
                        font-size: 0.8rem;
                        line-height: 1.4;
                    }

                    .copy-link-btn {
                        width: 100%;
                    }

                    .album-manage-grid {
                        grid-template-columns: repeat(2, 1fr); /* 2 columns on mobile */
                        gap: 10px;
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

                    .manage-overlay {
                        opacity: 1;
                        background: linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(0,0,0,0.6) 100%);
                        padding: 0.5rem;
                    }

                    .photo-name {
                        display: none;
                    }

                    .delete-btn {
                        padding: 6px !important;
                        font-size: 0.75rem !important;
                    }
                }

                @media (max-width: 480px) {
                    .album-details-container { 
                        padding: 1rem 1.25rem; 
                    }
                    .album-info-card { 
                        padding: 1.25rem; 
                        gap: 1rem;
                        margin-bottom: 1rem;
                    }
                    .album-title-modern { font-size: 1.5rem; }
                    .album-description-modern { font-size: 0.9rem; }
                    .meta-value-modern { font-size: 1.1rem; }
                    
                    .share-link-banner {
                        padding: 1rem;
                        gap: 0.75rem;
                        margin-bottom: 1.5rem !important;
                    }
                    .share-icon-wrapper { display: none; }
                    .copy-link-btn { min-width: 80px !important; height: 38px !important; }

                    .upload-section-card {
                        padding: 1.25rem;
                        margin-bottom: 2rem;
                    }

                    .album-manage-grid {
                        grid-template-columns: repeat(2, 1fr); /* Force 2 columns on very small screens */
                        gap: 0.75rem;
                    }
                }

                @media (max-width: 430px) {
                    .album-details-container { 
                        padding: 0.75rem 1rem; 
                    }
                    .album-info-card { 
                        padding: 1rem; 
                        border-radius: 12px;
                    }
                    .album-title-modern { 
                        font-size: 1.35rem; 
                    }
                    .modern-meta-grid { 
                        gap: 1rem; 
                        padding-top: 1rem;
                    }
                    .meta-value-modern { 
                        font-size: 1rem; 
                    }
                    .share-link-banner {
                        padding: 0.75rem;
                        margin-bottom: 1.5rem !important;
                    }
                    .share-url-text {
                        font-size: 0.75rem !important;
                    }
                    .copy-link-btn { 
                        min-width: 70px !important; 
                        height: 36px !important;
                        font-size: 0.75rem !important;
                    }
                    .upload-section-card {
                        padding: 1rem;
                    }
                    .section-header h2 {
                        font-size: 1.25rem;
                    }
                    .album-manage-grid {
                        gap: 0.5rem;
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

            <Modal
                isOpen={modalConfig.isOpen}
                title={modalConfig.title}
                message={modalConfig.message}
                onConfirm={modalConfig.onConfirm}
                onClose={closeModal}
                variant={modalConfig.variant}
                confirmText={modalConfig.confirmText}
                cancelText={modalConfig.cancelText}
                showCancel={modalConfig.showCancel}
            />
        </div >
    );
};

export default AlbumDetails;
