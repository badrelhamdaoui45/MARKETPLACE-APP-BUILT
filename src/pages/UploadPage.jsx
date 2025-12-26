
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import PhotoUpload from '../components/PhotoUpload';
import Button from '../components/ui/Button';

const UploadPage = () => {
    const { user } = useAuth();

    // Data State
    const [albums, setAlbums] = useState([]);
    const [packages, setPackages] = useState([]);

    // Selection State
    const [selectedAlbumId, setSelectedAlbumId] = useState('');
    const [currentPackageId, setCurrentPackageId] = useState('');

    // UI State
    const [loading, setLoading] = useState(true);
    const [savingPackage, setSavingPackage] = useState(false);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    // When album selection changes, update the local currentPackageId to match that album's package
    useEffect(() => {
        if (selectedAlbumId && albums.length > 0) {
            const album = albums.find(a => a.id === selectedAlbumId);
            if (album) {
                setCurrentPackageId(album.pricing_package_id || '');
            }
        }
    }, [selectedAlbumId, albums]);

    const fetchData = async () => {
        try {
            // 1. Fetch Albums
            const { data: albumsData, error: albumsError } = await supabase
                .from('albums')
                .select('id, title, pricing_package_id')
                .eq('photographer_id', user.id)
                .order('created_at', { ascending: false });

            if (albumsError) throw albumsError;
            setAlbums(albumsData);

            // 2. Fetch Packages
            const { data: packagesData, error: packagesError } = await supabase
                .from('pricing_packages')
                .select('*')
                .eq('photographer_id', user.id);

            if (packagesError) throw packagesError;
            setPackages(packagesData);

            // Auto-select first album
            if (albumsData.length > 0) {
                setSelectedAlbumId(albumsData[0].id);
            }

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePackageChange = async (newPackageId) => {
        setCurrentPackageId(newPackageId);
        setSavingPackage(true);

        try {
            const { error } = await supabase
                .from('albums')
                .update({ pricing_package_id: newPackageId || null })
                .eq('id', selectedAlbumId);

            if (error) throw error;

            // Update local state to reflect change permanently
            setAlbums(prev => prev.map(a =>
                a.id === selectedAlbumId ? { ...a, pricing_package_id: newPackageId } : a
            ));

        } catch (error) {
            console.error('Error updating package:', error);
            alert('Failed to update package setting.');
        } finally {
            setSavingPackage(false);
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '2rem' }}>Upload Photos</h1>

            <div className="card" style={{ padding: '2rem' }}>
                {loading ? (
                    <p>Loading your albums...</p>
                ) : albums.length === 0 ? (
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ marginBottom: '1rem' }}>You need to create an album before you can upload photos.</p>
                        <Button onClick={() => window.location.href = '/photographer/albums/new'}>
                            Create New Album
                        </Button>
                    </div>
                ) : (
                    <>
                        {/* Album Selection */}
                        <div className="input-group">
                            <label className="input-label">Select Album</label>
                            <select
                                className="input-field"
                                value={selectedAlbumId}
                                onChange={(e) => setSelectedAlbumId(e.target.value)}
                            >
                                {albums.map(album => (
                                    <option key={album.id} value={album.id}>
                                        {album.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Package Selection */}
                        {selectedAlbumId && (
                            <div className="input-group" style={{ marginTop: '1rem', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                                <label className="input-label" style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Pricing Package for this Album</span>
                                    {savingPackage && <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)' }}>Saving...</span>}
                                </label>
                                <select
                                    className="input-field"
                                    value={currentPackageId}
                                    onChange={(e) => handlePackageChange(e.target.value)}
                                >
                                    <option value="">-- No Package (Free / Contact) --</option>
                                    {packages.map(pkg => (
                                        <option key={pkg.id} value={pkg.id}>
                                            {pkg.name} - ${pkg.price}
                                        </option>
                                    ))}
                                </select>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                    Applies to all photos in this album immediately.
                                </p>
                            </div>
                        )}

                        {/* Upload Component */}
                        {selectedAlbumId && (
                            <div style={{ marginTop: '2rem' }}>
                                <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>Add Photos</h3>
                                <PhotoUpload
                                    albumId={selectedAlbumId}
                                    onUploadComplete={() => alert('Photos uploaded successfully!')}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default UploadPage;
