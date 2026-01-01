import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import { ArrowLeft, ArrowRight, Camera, Images } from 'lucide-react';

const PhotographerProfile = () => {
    const { id } = useParams();
    const [photographer, setPhotographer] = useState(null);
    const [albums, setAlbums] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ albumCount: 0, photoCount: 0 });

    useEffect(() => {
        fetchPhotographerData();
    }, [id]);

    const fetchPhotographerData = async () => {
        try {
            // 1. Fetch Photographer Info
            const { data: photographerData, error: photographerError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', id)
                .eq('role', 'photographer')
                .single();

            if (photographerError) throw photographerError;
            setPhotographer(photographerData);

            // 2. Fetch Published Albums
            const { data: albumsData, error: albumsError } = await supabase
                .from('albums')
                .select('*')
                .eq('photographer_id', id)
                .eq('is_published', true)
                .order('created_at', { ascending: false });

            if (albumsError) throw albumsError;
            setAlbums(albumsData || []);

            // 3. Calculate Stats
            const albumCount = albumsData?.length || 0;
            let photoCount = 0;

            if (albumsData && albumsData.length > 0) {
                const albumIds = albumsData.map(a => a.id);
                const { count } = await supabase
                    .from('photos')
                    .select('*', { count: 'exact', head: true })
                    .in('album_id', albumIds);
                photoCount = count || 0;
            }

            setStats({ albumCount, photoCount });

        } catch (error) {
            console.error('Error fetching photographer data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <p>Loading photographer profile...</p>
            </div>
        );
    }

    if (!photographer) {
        return (
            <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <h2>Photographer not found</h2>
                <Link to="/albums">
                    <Button variant="outline" style={{ marginTop: '1rem' }}>Back to Albums</Button>
                </Link>
            </div>
        );
    }


    return (
        <div className="profile-container">
            {/* Photographer Header */}
            <div className="profile-header-card">
                <div className="header-bg-gradient"></div>
                <div className="header-content">
                    <div className="photographer-avatar-large">
                        {photographer.full_name?.charAt(0).toUpperCase() || 'P'}
                    </div>
                    <div className="photographer-main-info">
                        <h1 className="photographer-name">{photographer.full_name}</h1>
                        <p className="photographer-email">{photographer.email}</p>
                    </div>

                    {/* Stats */}
                    <div className="photographer-stats">
                        <div className="stat-item">
                            <span className="stat-value">{stats.albumCount}</span>
                            <span className="stat-label">Albums</span>
                        </div>
                        <div className="stat-divider"></div>
                        <div className="stat-item">
                            <span className="stat-value">{stats.photoCount}</span>
                            <span className="stat-label">Photos</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Albums Section */}
            <div className="albums-section-container">
                <div className="section-header">
                    <h2 className="section-title">Published Albums</h2>
                    <Link to="/albums" className="back-to-market">
                        <span className="icon"><ArrowLeft size={18} /></span> Albums
                    </Link>
                </div>

                {albums.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon"><Images size={64} strokeWidth={1} /></div>
                        <p className="empty-text">
                            This photographer hasn't published any albums yet.
                        </p>
                    </div>
                ) : (
                    <div className="profile-albums-grid">
                        {albums.map(album => (
                            <Link
                                key={album.id}
                                to={`/albums/${album.id}`}
                                className="album-card-link"
                            >
                                <div className="profile-album-card">
                                    <div className="album-card-image">
                                        {album.cover_image_url ? (
                                            <img src={album.cover_image_url} alt={album.title} loading="lazy" />
                                        ) : (
                                            <div className="no-cover"><Camera size={48} strokeWidth={1} /></div>
                                        )}
                                        <div className="album-price-overlay">
                                            {album.pricing_package_id ? (
                                                <span className="pkg-badge">Package</span>
                                            ) : (
                                                <span className="price-badge">${album.price}</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="album-card-info">
                                        <h3 className="album-title">{album.title}</h3>
                                        <p className="album-desc">
                                            {album.description || 'Professional collection'}
                                        </p>
                                        <div className="album-card-action">
                                            <span>{album.pricing_package_id ? 'View Package' : 'Buy Now'}</span>
                                            <span className="arrow"><ArrowRight size={16} /></span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            <style>{`
                .profile-container {
                    padding: var(--spacing-xl);
                    max-width: 1400px;
                    margin: 0 auto;
                }

                .profile-header-card {
                    position: relative;
                    background: var(--bg-primary);
                    border-radius: var(--radius-2xl);
                    overflow: hidden;
                    border: 1px solid var(--border-light);
                    margin-bottom: var(--spacing-2xl);
                    box-shadow: var(--shadow-md);
                }

                .header-bg-gradient {
                    height: 160px;
                    background: linear-gradient(135deg, var(--primary-blue) 0%, var(--secondary-cyan) 100%);
                    opacity: 0.9;
                }

                .header-content {
                    padding: 0 var(--spacing-xl) var(--spacing-xl);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    margin-top: -60px;
                    text-align: center;
                }

                .photographer-avatar-large {
                    width: 120px;
                    height: 120px;
                    border-radius: 50%;
                    background: var(--bg-primary);
                    border: 6px solid var(--bg-primary);
                    box-shadow: var(--shadow-lg);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 3rem;
                    font-weight: 800;
                    color: var(--primary-blue);
                    margin-bottom: var(--spacing-md);
                }

                .photographer-main-info {
                    margin-bottom: var(--spacing-xl);
                }

                .photographer-name {
                    font-size: clamp(1.5rem, 6vw, 2.5rem);
                    font-weight: 800;
                    color: var(--text-primary);
                    margin-bottom: var(--spacing-xs);
                }

                .photographer-email {
                    color: var(--text-secondary);
                    font-size: var(--font-size-md);
                }

                .photographer-stats {
                    display: inline-flex;
                    align-items: center;
                    background: var(--bg-secondary);
                    padding: var(--spacing-md) var(--spacing-2xl);
                    border-radius: var(--radius-xl);
                    gap: var(--spacing-2xl);
                }

                .stat-item {
                    display: flex;
                    flex-direction: column;
                }

                .stat-value {
                    font-size: var(--font-size-2xl);
                    font-weight: 800;
                    color: var(--text-primary);
                    line-height: 1;
                }

                .stat-label {
                    font-size: var(--font-size-xs);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: var(--text-tertiary);
                    font-weight: 600;
                    margin-top: 4px;
                }

                .stat-divider {
                    width: 1px;
                    height: 40px;
                    background: var(--border-light);
                }

                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: var(--spacing-xl);
                }

                .section-title {
                    font-size: var(--font-size-2xl);
                    font-weight: 800;
                }

                .back-to-market {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-sm);
                    color: var(--primary-blue);
                    text-decoration: none;
                    font-weight: 600;
                    font-size: var(--font-size-sm);
                    transition: transform var(--transition-fast);
                }

                .back-to-market:hover {
                    transform: translateX(-4px);
                }

                .profile-albums-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 1.5rem;
                    align-items: start;
                }

                .album-card-link {
                    text-decoration: none;
                    color: inherit;
                    display: block;
                }

                .profile-album-card {
                    background: var(--bg-primary);
                    border-radius: 8px;
                    overflow: hidden;
                    border: 1px solid var(--border-light);
                    transition: all 0.3s ease;
                    display: flex;
                    flex-direction: column;
                }

                .profile-album-card:hover {
                    box-shadow: var(--shadow-lg);
                    transform: translateY(-4px);
                    border-color: var(--border-subtle);
                }

                .album-card-image {
                    /* Removed fixed height for original ratio */
                    position: relative;
                    background: var(--bg-tertiary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 200px; /* Min height for no-cover */
                }

                .album-card-image img {
                    width: 100%;
                    height: auto;
                    display: block;
                }

                .album-price-overlay {
                    position: absolute;
                    bottom: var(--spacing-md);
                    right: var(--spacing-md);
                }

                .price-badge, .pkg-badge {
                    padding: var(--spacing-xs) var(--spacing-md);
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(4px);
                    border-radius: var(--radius-full);
                    font-weight: 800;
                    color: var(--primary-blue);
                    box-shadow: var(--shadow-md);
                }

                .pkg-badge {
                    color: var(--secondary-cyan);
                }

                .album-card-info {
                    padding: var(--spacing-lg);
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }

                .album-title {
                    font-size: var(--font-size-xl);
                    margin-bottom: var(--spacing-xs);
                    color: var(--text-primary);
                }

                .album-desc {
                    color: var(--text-secondary);
                    font-size: var(--font-size-sm);
                    margin-bottom: var(--spacing-lg);
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .album-card-action {
                    margin-top: auto;
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-sm);
                    font-size: var(--font-size-sm);
                    font-weight: 700;
                    color: var(--primary-blue);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .album-card-action .arrow {
                    transition: transform var(--transition-base);
                    display: flex;
                    align-items: center;
                }

                .profile-album-card:hover .album-card-action .arrow {
                    transform: translateX(6px);
                }

                .empty-state {
                    text-align: center;
                    padding: 6rem var(--spacing-xl);
                    background: var(--bg-tertiary);
                    border-radius: var(--radius-2xl);
                    color: var(--text-tertiary);
                }

                .empty-icon {
                    color: var(--text-tertiary);
                    margin-bottom: var(--spacing-md);
                    display: flex;
                    justify-content: center;
                }
                
                .no-cover {
                    color: var(--text-tertiary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    height: 200px;
                }

                @media (max-width: 768px) {
                    .profile-container {
                        padding: var(--spacing-md);
                    }
                    .header-content {
                        padding: 0 var(--spacing-md) var(--spacing-xl);
                    }
                    .photographer-stats {
                        padding: var(--spacing-md) var(--spacing-lg);
                        gap: var(--spacing-lg);
                    }
                    .profile-albums-grid {
                        grid-template-columns: 1fr;
                        gap: var(--spacing-md);
                    }
                }
            `}</style>
        </div>
    );
};

export default PhotographerProfile;
