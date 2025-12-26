
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Toast from '../components/ui/Toast';
import '../components/ui/ui.css';

const CreateAlbum = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [packages, setPackages] = useState([]);
    const [toast, setToast] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: '',
        pricing_package_id: ''
    });

    // File state for cover image
    const [coverFile, setCoverFile] = useState(null);
    const [coverPreview, setCoverPreview] = useState('');

    useEffect(() => {
        if (user) fetchPackages();
    }, [user]);

    const fetchPackages = async () => {
        const { data } = await supabase.from('pricing_packages').select('*').eq('photographer_id', user.id);
        if (data) setPackages(data);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setCoverFile(file);
            setCoverPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let coverImageUrl = null;

            // 1. Upload Cover Image if selected
            if (coverFile) {
                const fileName = `cover-${Date.now()}-${coverFile.name}`;
                // Upload to public-photos or a dedicated 'covers' folder
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('public-photos')
                    .upload(`covers/${user.id}/${fileName}`, coverFile, {
                        contentType: coverFile.type
                    });

                if (uploadError) throw uploadError;

                // Get Public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('public-photos')
                    .getPublicUrl(`covers/${user.id}/${fileName}`);

                coverImageUrl = publicUrl;
            }

            // 2. Create Album
            const { error } = await supabase
                .from('albums')
                .insert([
                    {
                        photographer_id: user.id,
                        title: formData.title,
                        description: formData.description,
                        price: formData.price === '' ? null : formData.price,
                        pricing_package_id: formData.pricing_package_id || null,
                        cover_image_url: coverImageUrl, // Save URL
                        is_published: false
                    }
                ])
                .select()
                .single();

            if (error) throw error;

            navigate('/photographer/dashboard');
        } catch (error) {
            console.error('Error creating album:', error);
            setToast({ message: 'Failed to create album: ' + error.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '700px', margin: '0 auto' }}>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <h1 style={{ marginBottom: '2rem' }}>Create New Album</h1>
            <form onSubmit={handleSubmit} className="card" style={{ padding: '2rem' }}>

                {/* Cover Image Upload */}
                <div className="input-group">
                    <label className="input-label">Album Cover Image</label>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
                        <div style={{
                            width: '100px',
                            height: '100px',
                            borderRadius: 'var(--radius-md)',
                            border: '2px dashed var(--border-highlight)',
                            background: 'var(--bg-tertiary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            position: 'relative'
                        }}>
                            {coverPreview ? (
                                <img src={coverPreview} alt="Cover Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>No Image</span>
                            )}
                        </div>
                        <div>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                id="cover-upload"
                                style={{ display: 'none' }}
                            />
                            <Button type="button" variant="outline" onClick={() => document.getElementById('cover-upload').click()}>
                                {coverPreview ? 'Change Cover' : 'Upload Cover'}
                            </Button>
                        </div>
                    </div>
                </div>

                <Input
                    label="Album Title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g. Wedding 2025"
                    required
                />

                <div className="input-group">
                    <label className="input-label">Description</label>
                    <textarea
                        className="input-field"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows="4"
                        placeholder="Tell us about this collection..."
                    />
                </div>

                <div className="input-group">
                    <label className="input-label">Pricing Model</label>
                    <select
                        className="input-field"
                        name="pricing_package_id"
                        value={formData.pricing_package_id}
                        onChange={handleChange}
                    >
                        <option value="">-- Simple Flat Price (Legacy) --</option>
                        {packages.map(pkg => (
                            <option key={pkg.id} value={pkg.id}>
                                {pkg.name} ({pkg.package_type})
                            </option>
                        ))}
                    </select>
                </div>

                {!formData.pricing_package_id && (
                    <Input
                        label="Flat Price ($)"
                        name="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.price}
                        onChange={handleChange}
                        required={!formData.pricing_package_id}
                    />
                )}

                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                    <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? 'Creating...' : 'Create Album'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default CreateAlbum;
