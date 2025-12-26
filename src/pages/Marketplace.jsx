
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

const Marketplace = () => {
    const [albums, setAlbums] = useState([]);
    const [loading, setLoading] = useState(true);

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
            console.error('Error fetching marketplace:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <section style={{ marginBottom: '4rem', textAlign: 'center' }}>
                <h1 style={{ fontSize: '3rem', marginBottom: '1rem', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Discover Premium Photography
                </h1>
                <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
                    Browse curated albums from top photographers. Purchase secure access to high-resolution originals.
                </p>
            </section>

            {loading ? (
                <p>Loading collection...</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
                    {albums.map((album) => (
                        <Link to={`/albums/${album.id}`} key={album.id} style={{ display: 'block' }}>
                            <div className="album-card" style={{
                                background: 'var(--bg-secondary)',
                                borderRadius: 'var(--radius-lg)',
                                overflow: 'hidden',
                                border: '1px solid var(--border-subtle)',
                                transition: 'transform 0.2s',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                <div style={{ height: '240px', background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                                    {album.cover_image_url ? (
                                        <img src={album.cover_image_url} alt={album.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                            No Cover
                                        </div>
                                    )}
                                </div>
                                <div style={{ padding: '1.5rem', flex: 1 }}>
                                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{album.title}</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {album.description || 'No description provided.'}
                                    </p>

                                    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent-primary)' }}></div>
                                            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                {album.profiles?.full_name || 'Photographer'}
                                            </span>
                                        </div>
                                        <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>${album.price}</span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Marketplace;
