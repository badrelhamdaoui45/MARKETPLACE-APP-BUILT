
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Toast from '../components/ui/Toast';
import { sanitizeFileName } from '../utils/sanitize';
import CreatePackageModal from '../components/pricing/CreatePackageModal';
import '../components/ui/ui.css';

const CreateAlbum = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [packages, setPackages] = useState([]);
    const [toast, setToast] = useState(null);
    const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);

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

    const handlePackageCreated = (newPackage) => {
        setPackages(prev => [newPackage, ...prev]);
        setFormData(prev => ({ ...prev, pricing_package_id: newPackage.id }));
        setToast({ message: 'Modèle de prix créé avec succès !', type: 'success' });
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
                const sanitizedName = sanitizeFileName(coverFile.name);
                const fileName = `cover-${Date.now()}-${sanitizedName}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('public-photos')
                    .upload(`covers/${user.id}/${fileName}`, coverFile, {
                        contentType: coverFile.type
                    });

                if (uploadError) throw uploadError;

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
                        cover_image_url: coverImageUrl,
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
        <div className="create-album-container">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <h1>Créer un nouvel album</h1>

            <form onSubmit={handleSubmit} className="card form-card">
                {/* Cover Image Upload */}
                <div className="input-group">
                    <label className="input-label">Image de couverture</label>
                    <div className="cover-upload-section">
                        <div className="cover-preview-box">
                            {coverPreview ? (
                                <img src={coverPreview} alt="Aperçu" />
                            ) : (
                                <span className="no-image-text">Aucune image</span>
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
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => document.getElementById('cover-upload').click()}
                            >
                                {coverPreview ? 'Changer l\'image' : 'Télécharger une image'}
                            </Button>
                        </div>
                    </div>
                </div>

                <Input
                    label="Titre de l'album"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="ex: Mariage 2025"
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
                        placeholder="Dites-nous en plus sur cette collection..."
                    />
                </div>

                <div className="input-group">
                    <div className="package-select-header">
                        <label className="input-label">Modèle de prix</label>
                        <button
                            type="button"
                            onClick={() => setIsPackageModalOpen(true)}
                            className="new-package-btn"
                        >
                            + Nouveau modèle
                        </button>
                    </div>
                    <select
                        className="input-field"
                        name="pricing_package_id"
                        value={formData.pricing_package_id}
                        onChange={handleChange}
                    >
                        <option value="">-- Prix fixe simple --</option>
                        {packages.map(pkg => (
                            <option key={pkg.id} value={pkg.id}>
                                {pkg.name} ({pkg.package_type === 'digital' ? 'Numérique' : 'Physique'})
                            </option>
                        ))}
                    </select>
                </div>

                {!formData.pricing_package_id && (
                    <Input
                        label="Prix fixe (€)"
                        name="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.price}
                        onChange={handleChange}
                        required={!formData.pricing_package_id}
                    />
                )}

                <div className="form-actions">
                    <Button type="button" variant="outline" onClick={() => navigate(-1)}>Annuler</Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? 'Création...' : 'Créer l\'album'}
                    </Button>
                </div>
            </form>

            <CreatePackageModal
                isOpen={isPackageModalOpen}
                onClose={() => setIsPackageModalOpen(false)}
                onSuccess={handlePackageCreated}
            />

            <style>{`
                .create-album-container {
                    padding: 2rem;
                    max-width: 700px;
                    margin: 2rem auto;
                }

                h1 {
                    margin-bottom: 2rem;
                    font-weight: 800;
                    letter-spacing: -0.02em;
                }

                .form-card {
                    padding: 2.5rem;
                }

                .cover-upload-section {
                    display: flex;
                    gap: 1.5rem;
                    align-items: center;
                    margin-top: 0.75rem;
                }

                .cover-preview-box {
                    width: 120px;
                    height: 120px;
                    border-radius: var(--radius-md);
                    border: 2px dashed var(--border-subtle);
                    background: var(--bg-tertiary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    flex-shrink: 0;
                }

                .cover-preview-box img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .no-image-text {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                }

                .package-select-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    width: 100%;
                    margin-bottom: 0.25rem;
                }

                .new-package-btn {
                    background: transparent;
                    border: none;
                    color: var(--primary-blue);
                    font-size: 0.85rem;
                    cursor: pointer;
                    font-weight: 700;
                    text-decoration: underline;
                }

                .form-actions {
                    display: flex;
                    gap: 1.25rem;
                    margin-top: 2.5rem;
                }

                .form-actions button {
                    flex: 1;
                }

                @media (max-width: 768px) {
                    .create-album-container {
                        padding: 1rem;
                        margin: 1rem auto;
                    }

                    h1 {
                        font-size: 1.5rem;
                        margin-bottom: 1.5rem;
                    }

                    .form-card {
                        padding: 1.5rem;
                    }

                    .cover-upload-section {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 1rem;
                    }

                    .cover-preview-box {
                        width: 100%;
                        height: 200px;
                    }

                    .form-actions {
                        flex-direction: column-reverse;
                        gap: 0.75rem;
                    }

                    .form-actions button {
                        width: 100%;
                    }
                }
            `}</style>
        </div>
    );
};

export default CreateAlbum;
