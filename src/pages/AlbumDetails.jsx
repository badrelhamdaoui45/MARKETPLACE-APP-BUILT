
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import PhotoUpload from '../components/PhotoUpload';
import Button from '../components/ui/Button';

const AlbumDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [album, setAlbum] = useState(null);
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAlbumDetails();
    }, [id]);

    const fetchAlbumDetails = async () => {
        try {
            // Fetch Album
            const { data: albumData, error: albumError } = await supabase
                .from('albums')
                .select('*')
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

    if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;
    if (!album) return <div style={{ padding: '2rem' }}>Album not found</div>;

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <Button variant="outline" onClick={() => navigate('/photographer/dashboard')} style={{ marginBottom: '1rem' }}>← Back</Button>
                    <h1>{album.title}</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>{album.description}</p>
                    <div style={{ marginTop: '0.5rem' }}>
                        <span style={{
                            backgroundColor: album.is_published ? '#22c55e20' : '#eab30820',
                            color: album.is_published ? '#22c55e' : '#eab308',
                            padding: '0.25rem 0.75rem',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.875rem'
                        }}>
                            {album.is_published ? 'Published' : 'Draft'}
                        </span>
                        <span style={{ marginLeft: '1rem', color: 'var(--text-secondary)' }}>Package Price: ${album.price}</span>
                    </div>
                </div>
                <Button onClick={handlePublishToggle}>
                    {album.is_published ? 'Unpublish' : 'Publish Album'}
                </Button>
            </div>

            <div style={{ marginBottom: '3rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Upload Photos</h3>
                <PhotoUpload albumId={id} onUploadComplete={fetchAlbumDetails} />
            </div>

            <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Photos ({photos.length})</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                    {photos.map(photo => (
                        <div key={photo.id} style={{ position: 'relative', aspectRatio: '1/1', overflow: 'hidden', borderRadius: 'var(--radius-md)' }}>
                            <img
                                src={photo.watermarked_url}
                                alt={photo.title}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', padding: '0.5rem', fontSize: '0.75rem' }}>
                                {photo.title}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AlbumDetails;
