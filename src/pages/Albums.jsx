
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

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
          profiles:photographer_id (full_name)
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
                <h1 className="albums-title">
                    Explore Albums
                </h1>
                <p className="albums-subtitle">
                    Find and purchase high-quality photo collections from professional photographers.
                </p>

                <div className="search-bar-container">
                    <div className="search-input-wrapper">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Rechercher un album ou un photographe..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                        {searchTerm && (
                            <button className="clear-search" onClick={() => setSearchTerm('')}>×</button>
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
                    <div className="empty-icon">📂</div>
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
                            <Link to={`/albums/${album.id}`} className="album-card-main-link">
                                <div className="album-card-image">
                                    {album.cover_image_url ? (
                                        <img src={album.cover_image_url} alt={album.title} loading="lazy" />
                                    ) : (
                                        <div className="no-cover">
                                            <span>📷</span>
                                            <span>No Cover</span>
                                        </div>
                                    )}
                                    <div className="album-price-badge">${album.price}</div>
                                </div>
                                <div className="album-card-content">
                                    <h3 className="album-card-title">{album.title}</h3>
                                    <div className="album-card-photographer">
                                        <div className="photographer-logo-mini">
                                            <span>📷</span>
                                        </div>
                                        <span className="photographer-name-text">
                                            {album.profiles?.full_name || 'Photographer'}
                                        </span>
                                    </div>
                                </div>
                            </Link>

                            {/* Status label if needed - e.g. Pre-inscription or similar */}
                            {false && <div className="album-status-label">Pré-inscription</div>}
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
                    padding: 6rem 0 8rem; /* Tall header for the floating effect */
                    background: #f8f9fa; /* Light grey background area */
                    position: relative;
                }

                .albums-title {
                    display: none; /* Hidden as per reference visual focus */
                }

                .albums-subtitle {
                    display: none; /* Hidden as per reference visual focus */
                }

                .search-bar-container {
                    max-width: 1200px;
                    width: 90%;
                    margin: 0 auto;
                    position: absolute;
                    bottom: -35px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 10;
                }

                .search-input-wrapper {
                    display: flex;
                    align-items: center;
                    background: #ffffff;
                    border-radius: 8px;
                    padding: 0 2rem;
                    border: 1px solid #e5e7eb; /* No shadow anymore */
                    height: 70px;
                    transition: all 0.3s ease;
                }

                .search-input-wrapper:focus-within {
                    border-color: #d1d5db;
                }

                .search-icon {
                    font-size: 1.5rem;
                    margin-right: 1.5rem;
                    color: #1f2937;
                    transform: scaleX(-1); /* Mirror icon like in some search bars */
                    opacity: 0.8;
                }

                .search-input {
                    width: 100%;
                    border: none;
                    background: transparent;
                    padding: 1rem 0;
                    font-size: 1.1rem;
                    color: #1f2937;
                    outline: none;
                }

                .search-input::placeholder {
                    color: #9ca3af;
                    font-weight: 400;
                }

                .clear-search {
                    background: var(--bg-tertiary);
                    border: none;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: var(--text-secondary);
                    font-size: 1.25rem;
                    margin-left: var(--spacing-sm);
                }

                .clear-search:hover {
                    background: var(--border-light);
                    color: var(--text-primary);
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
                    font-size: 3rem;
                    margin-bottom: 1rem;
                    opacity: 0.5;
                }

                .albums-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); 
                    gap: 1.5rem; 
                    margin-top: 5rem;
                    width: 100%;
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
                }

                .album-card:hover {
                    border-color: #d1d5db;
                }

                .album-card-image {
                    height: 320px; /* Slightly shorter to fit more in viewport */
                    background: #f3f4f6;
                    position: relative;
                }

                .album-card-image img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .album-price-badge {
                    position: absolute;
                    bottom: 0;
                    right: 0;
                    background: #ffb703;
                    color: white;
                    padding: 0.5rem 1rem;
                    font-weight: 700;
                    font-size: 0.9rem;
                    border-top-left-radius: 8px;
                }

                .album-card-content {
                    padding: 1.5rem;
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
                    font-size: 0.75rem;
                    color: #9ca3af;
                }

                .photographer-name-text {
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: #4b5563;
                }

                .photographer-info-link {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-sm);
                    text-decoration: none;
                    transition: all var(--transition-fast);
                }

                .photographer-info-link:hover {
                    transform: translateX(4px);
                }

                .photographer-avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, var(--primary-blue), var(--secondary-cyan));
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 0.8rem;
                    font-weight: 700;
                }

                .photographer-name {
                    font-size: var(--font-size-sm);
                    color: var(--text-secondary);
                    font-weight: 500;
                    transition: color var(--transition-fast);
                }

                .photographer-info-link:hover .photographer-name {
                    color: var(--primary-blue);
                }

                .view-button-link {
                    text-decoration: none;
                }

                .view-button {
                    font-size: var(--font-size-xs);
                    font-weight: 700;
                    color: var(--primary-blue);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
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
                        font-size: 1.2rem;
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
        </div>
    );
};

export default Albums;
