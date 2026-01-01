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
                        <span className="search-icon"><Search size={24} /></span>
                        <input
                            type="text"
                            placeholder="Search for an album or photographer..."
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
                            <Link to={`/albums/${album.id}`} className="album-card-main-link">
                                <div className="album-card-image">
                                    {album.cover_image_url ? (
                                        <img src={album.cover_image_url} alt={album.title} loading="lazy" />
                                    ) : (
                                        <div className="no-cover">
                                            <span><Image size={32} strokeWidth={1.5} /></span>
                                            <span style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>No Cover</span>
                                        </div>
                                    )}
                                    <div className="album-price-badge">{album.price}</div>
                                </div>
                                <div className="album-card-content">
                                    <h3 className="album-card-title">{album.title}</h3>
                                    <div className="album-card-photographer">
                                        <div className="photographer-logo-mini">
                                            <Camera size={14} />
                                        </div>
                                        <span className="photographer-name-text">
                                            {album.profiles?.full_name || 'Photographer'}
                                        </span>
                                    </div>
                                </div>
                            </Link>

                            {/* Status label if needed - e.g. Pre-inscription or similar */}
                            {false && <div className="album-status-label">Pre-registration</div>}
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
                    display: flex;
                    align-items: center;
                    margin-right: 1.5rem;
                    color: #1f2937;
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
                    color: var(--text-tertiary);
                    margin-bottom: 1rem;
                    display: flex;
                    justify-content: center;
                }

                .albums-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); 
                    gap: 1.5rem; 
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
                }

                .album-card:hover {
                    border-color: #d1d5db;
                }

                .album-card-image {
                    /* min-height removed */
                    background: #f3f4f6;
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 200px;
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
        </div>
    );
};

export default Albums;
