import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import { ArrowLeft, ArrowRight, Camera, Images, Phone, Globe } from 'lucide-react';

const PhotographerProfile = () => {
    const { name } = useParams();
    const [photographer, setPhotographer] = useState(null);
    const [albums, setAlbums] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ albumCount: 0, photoCount: 0 });

    useEffect(() => {
        fetchPhotographerData();
    }, [name]);

    const fetchPhotographerData = async () => {
        try {
            const decodedParam = decodeURIComponent(name);
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decodedParam);

            let photographerData = null;

            if (isUuid) {
                // Try fetching by ID first if it looks like a UUID
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', decodedParam)
                    .eq('role', 'photographer')
                    .single();
                photographerData = data;
            }

            // If not found by ID or not a UUID, try by name
            if (!photographerData) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .ilike('full_name', decodedParam) // Use ilike for case-insensitive
                    .eq('role', 'photographer')
                    .single();

                if (!error) photographerData = data;
            }

            if (!photographerData) {
                setLoading(false);
                return;
            }

            setPhotographer(photographerData);

            // 2. Fetch Published Albums
            const { data: albumsData, error: albumsError } = await supabase
                .from('albums')
                .select('*')
                .eq('photographer_id', photographerData.id)
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
            <div className="profile-loading-screen" style={{
                padding: '10rem 2rem',
                textAlign: 'center',
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                minHeight: '100vh'
            }}>
                <div className="spinner" style={{
                    width: '40px',
                    height: '40px',
                    border: '4px solid rgba(59, 130, 246, 0.1)',
                    borderTopColor: 'var(--primary-blue)',
                    borderRadius: '50%',
                    margin: '0 auto 1.5rem',
                    animation: 'spin 1s linear infinite'
                }}></div>
                <p style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Loading photographer profile...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!photographer) {
        return (
            <div className="profile-error-screen" style={{
                padding: '8rem 2rem',
                textAlign: 'center',
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                minHeight: '100vh'
            }}>
                <div style={{ maxWidth: '400px', margin: '0 auto', background: 'white', padding: '3rem', borderRadius: '24px', boxShadow: 'var(--shadow-xl)' }}>
                    <div style={{ width: '80px', height: '80px', background: '#fee2e2', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                        <Camera size={40} />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '1rem' }}>Photographer not found</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>The profile you are looking for might have been moved or renamed.</p>
                    <Link to="/albums">
                        <Button variant="primary" style={{ width: '100%' }}>Explore Marketplace</Button>
                    </Link>
                </div>
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

                        {photographer.bio && (
                            <p className="photographer-bio">{photographer.bio}</p>
                        )}

                        <div className="photographer-social-links">
                            {photographer.country && (
                                <span className="social-link country-badge">
                                    <Globe size={16} /> {photographer.country}
                                </span>
                            )}
                            {photographer.whatsapp && (
                                <a href={`https://wa.me/${photographer.whatsapp.replace(/\s+/g, '')}`} target="_blank" rel="noopener noreferrer" className="social-link whatsapp">
                                    <Phone size={16} /> WhatsApp
                                </a>
                            )}
                            {photographer.website && (
                                <a href={photographer.website.startsWith('http') ? photographer.website : `https://${photographer.website}`} target="_blank" rel="noopener noreferrer" className="social-link website">
                                    <Globe size={16} /> Website
                                </a>
                            )}
                        </div>
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
                                to={`/albums/${encodeURIComponent(photographer.full_name)}/${encodeURIComponent(album.slug || album.title)}`}
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
                                            {album.is_free ? (
                                                <span className="price-badge" style={{ background: '#10b981', color: 'white' }}>GRATUIT</span>
                                            ) : (
                                                !album.pricing_package_id && (
                                                    <span className="price-badge">${album.price}</span>
                                                )
                                            )}
                                        </div>
                                        {album.pre_inscription_enabled && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '1rem',
                                                left: '1rem',
                                                background: '#f97316',
                                                color: 'white',
                                                padding: '0.4rem 0.8rem',
                                                borderRadius: '6px',
                                                fontSize: '0.7rem',
                                                fontWeight: 800,
                                                zIndex: 5
                                            }}>PRÉ-INSCRIPTION</div>
                                        )}
                                        {album.is_free && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '1rem',
                                                right: '1rem',
                                                background: '#10b981',
                                                color: 'white',
                                                padding: '0.4rem 0.8rem',
                                                borderRadius: '6px',
                                                fontSize: '0.7rem',
                                                fontWeight: 800,
                                                zIndex: 5
                                            }}>GRATUIT</div>
                                        )}
                                    </div>

                                    <div className="album-card-info">
                                        <h3 className="album-title">{album.title}</h3>
                                        <p className="album-desc">
                                            {album.description || 'Professional collection'}
                                        </p>
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
                    width: 100%;
                    text-align: left; /* Force left alignment against any global centering */
                }

                .profile-header-card {
                    position: relative;
                    background: var(--bg-primary);
                    border-radius: var(--radius-2xl);
                    overflow: hidden;
                    border: 1px solid var(--border-light);
                    margin-bottom: var(--spacing-2xl);
                    box-shadow: var(--shadow-md);
                    width: 100%;
                    min-height: 450px; /* Ensure a minimum presence even with short content */
                }

                .header-bg-gradient {
                    height: 200px;
                    background: linear-gradient(135deg, var(--primary-blue) 0%, var(--secondary-cyan) 100%);
                    opacity: 0.9;
                }

                .header-content {
                    padding: 0 var(--spacing-xl) var(--spacing-2xl);
                    display: flex;
                    flex-direction: column;
                    align-items: center; /* Avatar and stats stay centered within their own flow */
                    margin-top: -70px;
                    text-align: center;
                    width: 100%;
                }

                .photographer-avatar-large {
                    width: 140px;
                    height: 140px;
                    border-radius: 50%;
                    background: var(--bg-primary);
                    border: 4px solid var(--bg-primary);
                    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 4rem;
                    font-weight: 800;
                    color: var(--primary-blue);
                    margin-bottom: var(--spacing-lg);
                    z-index: 5;
                    position: relative;
                }

                .photographer-main-info {
                    margin-bottom: var(--spacing-xl);
                    width: 100%;
                    max-width: 800px;
                }

                .photographer-name {
                    font-size: clamp(2rem, 6vw, 3rem); /* Slightly larger for premium feel */
                    font-weight: 800;
                    color: var(--text-primary);
                    margin-bottom: var(--spacing-xs);
                    width: 100%;
                }

                .photographer-email {
                    color: var(--text-secondary);
                    font-size: var(--font-size-md);
                    margin-bottom: var(--spacing-md);
                }

                .photographer-bio {
                    max-width: 600px;
                    margin: 0 auto var(--spacing-lg);
                    color: var(--text-secondary);
                    line-height: 1.6;
                    font-size: 0.95rem;
                }

                .photographer-social-links {
                    display: flex;
                    gap: var(--spacing-md);
                    justify-content: center;
                    margin-bottom: var(--spacing-xl);
                    flex-wrap: wrap;
                }

                .country-badge {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem;
                    border-radius: var(--radius-full);
                    font-size: var(--font-size-sm);
                    font-weight: 600;
                    background: #f1f5f9;
                    color: #64748b;
                    border: 1px solid #e2e8f0;
                }

                .social-link {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem;
                    border-radius: var(--radius-full);
                    font-size: var(--font-size-sm);
                    font-weight: 600;
                    text-decoration: none;
                    transition: all 0.2s ease;
                }

                .social-link.whatsapp {
                    background: #25d366;
                    color: white;
                }

                .social-link.website {
                    background: var(--primary-blue);
                    color: white;
                }

                .social-link:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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

                .albums-section-container {
                    width: 100%;
                }

                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: var(--spacing-xl);
                    width: 100%;
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
