import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { Search, X, FolderOpen, Camera, Image, User } from 'lucide-react';

const Albums = () => {
    const [albums, setAlbums] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchMarketplaceAlbums();
    }, []);

    const fetchMarketplaceAlbums = async () => {
        try {
            const { data, error } = await supabase
                .from('albums')
                .select(`
          *,
          profiles:photographer_id (full_name, logo_url)
        `)
                .eq('is_published', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAlbums(data);
        } catch (error) {
            console.error('Error fetching albums:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredAlbums = albums.filter(album =>
        album.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        album.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );


    return (
        <div className="albums-container">
            <header className="albums-header">
                <div className="header-overlay"></div>

                <div className="header-content-inner">
                    <h1 className="albums-hero-title">
                        Explore Our Collections
                    </h1>
                    <p className="albums-hero-subtitle">
                        High-quality photo albums from pro photographers
                    </p>
                </div>

                <div className="search-bar-container">
                    <div className="search-input-wrapper">
                        <span className="search-icon"><Search size={22} strokeWidth={2} /></span>
                        <input
                            type="text"
                            placeholder="Rechercher un album ou un photographe ..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                        {searchTerm && (
                            <button className="clear-search" onClick={() => setSearchTerm('')}><X size={16} /></button>
                        )}
                    </div>
                </div>
            </header>

            {loading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading albums...</p>
                </div>
            ) : filteredAlbums.length === 0 ? (
                <div className="empty-search-state">
                    <div className="empty-icon"><FolderOpen size={48} strokeWidth={1.5} /></div>
                    <h3>No albums found</h3>
                    <p>Try searching for something else or browse all collections.</p>
                    {searchTerm && (
                        <Button variant="outline" onClick={() => setSearchTerm('')} style={{ marginTop: '1rem' }}>
                            View All Albums
                        </Button>
                    )}
                </div>
            ) : (
                <div className="albums-grid">
                    {filteredAlbums.map((album) => (
                        <div key={album.id} className="album-card">
                            <Link
                                to={`/albums/${encodeURIComponent(album.profiles?.full_name || 'unknown')}/${encodeURIComponent(album.slug || album.title)}`}
                                className="album-card-main-link"
                            >
                                <div className="album-card-image">
                                    {album.cover_image_url ? (
                                        <img src={album.cover_image_url} alt={album.title} loading="lazy" />
                                    ) : (
                                        <div className="no-cover">
                                            <span><Image size={32} strokeWidth={1.5} /></span>
                                            <span style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>No Cover</span>
                                        </div>
                                    )}

                                    {album.pre_inscription_enabled && (
                                        <div className="pre-inscription-badge">
                                            PRE INSCRIPTION
                                        </div>
                                    )}

                                    {album.is_free && (
                                        <div className="free-album-badge">
                                            ALBUM GRATUIT
                                        </div>
                                    )}
                                </div>
                                <div className="album-card-content">
                                    <h3 className="album-card-title">{album.title}</h3>
                                    <div className="album-card-photographer">
                                        <div className="photographer-logo-mini">
                                            {album.profiles?.logo_url ? (
                                                <img
                                                    src={album.profiles.logo_url}
                                                    alt="Photographer Logo"
                                                    style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }}
                                                />
                                            ) : (
                                                <User size={14} />
                                            )}
                                        </div>
                                        <div className="photographer-name-text">
                                            {album.profiles?.full_name || 'Photographer'}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    ))}
                </div>
            )}

            <style>{`
                .albums-container {
                    padding: 0 4rem; /* More padding but full width */
                    max-width: 1800px; /* Even wider */
                    width: 100%;
                    margin: 0 auto;
                }

                .albums-header {
                    margin-bottom: 3rem;
                    text-align: center;
                    padding: 6rem 1rem 8rem;
                    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                    position: relative;
                    overflow: visible; /* Allow search bar to float out */
                    border-radius: 0 0 40px 40px;
                }
                
                .albums-header::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 120px;
                    height: 4px;
                    background: #F5A623;
                    border-radius: 2px;
                }

                .header-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: radial-gradient(circle at 50% 50%, rgba(79, 70, 229, 0.1) 0%, transparent 70%);
                    z-index: 1;
                    border-radius: 0 0 40px 40px;
                }

                .header-content-inner {
                    position: relative;
                    z-index: 2;
                }

                .albums-hero-title {
                    font-size: 2.75rem;
                    font-weight: 800;
                    color: #ffffff;
                    margin-bottom: 1rem;
                    letter-spacing: -0.02em;
                }

                .albums-hero-subtitle {
                    font-size: 1.15rem;
                    color: #94a3b8;
                    max-width: 600px;
                    margin: 0 auto;
                    font-weight: 400;
                }

                .search-bar-container {
                    max-width: 900px;
                    width: 90%;
                    position: absolute;
                    bottom: -28px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 10;
                }

                .search-input-wrapper {
                    display: flex;
                    align-items: center;
                    background: #f3f4f6;
                    border-radius: 8px;
                    padding: 0 1.25rem;
                    border: 1px solid transparent;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
                    height: 52px;
                    transition: all 0.2s ease;
                }

                .search-input-wrapper:focus-within {
                    background: #ffffff;
                    border-color: #d1d5db;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
                }

                /* Specific override for focus-within lift since parent is absolute */
                .search-bar-container:focus-within {
                    transform: translateX(-50%);
                }

                .search-icon {
                    display: flex;
                    align-items: center;
                    margin-right: 0.75rem;
                    color: #9ca3af;
                    flex-shrink: 0;
                }

                .search-input {
                    width: 100%;
                    border: none;
                    background: transparent;
                    padding: 0;
                    font-size: 0.95rem;
                    color: #1f2937;
                    outline: none !important;
                    font-weight: 400;
                }

                .search-input::placeholder {
                    color: #9ca3af;
                    font-weight: 400;
                }

                .clear-search {
                    background: transparent;
                    border: none;
                    width: 24px;
                    height: 24px;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: #9ca3af;
                    margin-left: 0.5rem;
                    transition: all 0.2s ease;
                    flex-shrink: 0;
                }

                .clear-search:hover {
                    background: #e5e7eb;
                    color: #6b7280;
                }

                @media (max-width: 768px) {
                    .albums-header {
                        padding: 4rem 1rem 6rem;
                        border-radius: 0 0 24px 24px;
                    }

                    .albums-hero-title {
                        font-size: 2rem;
                    }

                    .albums-hero-subtitle {
                        font-size: 1rem;
                    }

                    .search-bar-container {
                        bottom: -28px;
                        width: 92%;
                    }

                    .search-input-wrapper {
                        height: 52px;
                        padding: 0 1rem;
                        border-radius: 12px;
                    }

                    .search-input {
                        font-size: 1rem;
                    }

                    .search-icon {
                        margin-right: 0.75rem;
                    }
                }

                @media (max-width: 480px) {
                    .albums-header {
                        padding: 3.5rem 1rem 5.5rem;
                    }

                    .search-bar-container {
                        bottom: -24px;
                        width: 90%;
                    }

                    .search-input-wrapper {
                        height: 48px;
                        padding: 0 0.85rem;
                    }
                    
                    .search-icon {
                        margin-right: 0.5rem;
                    }

                    .albums-grid {
                        margin-top: 3.5rem;
                    }
                }

                .empty-search-state {
                    text-align: center;
                    padding: 4rem 2rem;
                    background: var(--bg-secondary);
                    border-radius: var(--radius-2xl);
                    border: 2px dashed var(--border-light);
                    margin: 2rem 0;
                }

                .empty-icon {
                    color: var(--text-tertiary);
                    margin-bottom: 1rem;
                    display: flex;
                    justify-content: center;
                }

                .albums-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                    gap: 2.5rem;
                    margin-top: 5rem;
                    width: 100%;
                    align-items: start;
                }

                .album-card-main-link {
                    text-decoration: none;
                    color: inherit;
                    display: block;
                    flex: 1;
                }

                .album-card {
                    background: #ffffff;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    overflow: hidden;
                    transition: all 0.3s ease;
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                }

                .album-card:hover {
                    border-color: #d1d5db;
                }

                .album-card-image {
                    background: #f3f4f6;
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    overflow: hidden;
                }

                .pre-inscription-badge, .free-album-badge {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    padding: 0.5rem;
                    font-size: 0.75rem;
                    font-weight: 800;
                    text-align: center;
                    letter-spacing: 0.05em;
                }

                .pre-inscription-badge {
                    background: #f97316;
                    color: white;
                }

                .free-album-badge {
                    background: #10b981;
                    color: white;
                }

                .album-card-image img {
                    width: 100%;
                    height: auto;
                    display: block;
                }
                
                .no-cover {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-tertiary);
                    width: 100%;
                    height: 100%;
                }


                .album-card-content {
                    padding: 1.5rem 1.5rem 2rem 1.5rem;
                    text-align: center;
                }

                .album-card-title {
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: #1f2937;
                    margin-bottom: 1.25rem;
                }

                .album-card-photographer {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.75rem;
                    padding-top: 1rem;
                    padding-bottom: 0.5rem;
                    border-top: 1px solid #f3f4f6;
                }

                .photographer-logo-mini {
                    width: 24px;
                    height: 24px;
                    background: #f3f4f6;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #9ca3af;
                }

                .photographer-name-text {
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: #4b5563;
                }

                .loading-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 4rem;
                    gap: 1rem;
                    color: var(--text-secondary);
                }

                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 3px solid var(--bg-tertiary);
                    border-top-color: var(--primary-blue);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                @media (max-width: 768px) {
                    .albums-container {
                        padding: 0 1rem;
                    }
                    .albums-header {
                        padding: 3rem 0 5rem;
                    }
                    .search-bar-container {
                        width: 95%;
                        bottom: -30px;
                    }
                    .search-input-wrapper {
                        height: 60px;
                        padding: 0 1rem;
                    }
                    .search-icon {
                        margin-right: 0.75rem;
                    }
                    .albums-grid {
                        margin-top: 3.5rem;
                        grid-template-columns: 1fr;
                        gap: 1rem;
                    }
                }

                @media (max-width: 640px) {
                    .albums-grid {
                        grid-template-columns: 1fr;
                        gap: 1rem;
                    }
                }
            `}</style>
        </div >
    );
};

export default Albums;
