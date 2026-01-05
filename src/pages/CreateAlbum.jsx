
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
        pricing_package_ids: [],
        pre_inscription_enabled: false
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
        setFormData(prev => ({
            ...prev,
            pricing_package_ids: [...prev.pricing_package_ids, newPackage.id]
        }));
        setToast({ message: 'Modèle de prix créé avec succès !', type: 'success' });
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
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
                        pricing_package_ids: formData.pricing_package_ids.length > 0 ? formData.pricing_package_ids : [],
                        cover_image_url: coverImageUrl,
                        is_published: false,
                        pre_inscription_enabled: formData.pre_inscription_enabled
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
                                className="action-btn"
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

                <div className="input-group checkbox-group">
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            name="pre_inscription_enabled"
                            checked={formData.pre_inscription_enabled}
                            onChange={handleChange}
                        />
                        <div className="checkbox-text">
                            <span className="checkbox-title">Activer la pré-inscription</span>
                            <span className="checkbox-hint">Permet aux clients de s'inscrire pour être notifiés quand les photos seront prêtes.</span>
                        </div>
                    </label>
                </div>

                <div className="input-group">
                    <div className="package-select-header">
                        <label className="input-label">Modèles de prix</label>
                        <button
                            type="button"
                            onClick={() => setIsPackageModalOpen(true)}
                            className="new-package-btn"
                        >
                            + Nouveau modèle
                        </button>
                    </div>

                    <div className="multi-package-list">
                        {formData.pricing_package_ids.map((selectedId, idx) => (
                            <div key={idx} className="package-select-row">
                                <select
                                    className="input-field"
                                    value={selectedId}
                                    onChange={(e) => {
                                        const newIds = [...formData.pricing_package_ids];
                                        newIds[idx] = e.target.value;
                                        setFormData({ ...formData, pricing_package_ids: newIds });
                                    }}
                                >
                                    <option value="">-- Sélectionner un modèle --</option>
                                    {packages.map(pkg => (
                                        <option key={pkg.id} value={pkg.id} disabled={formData.pricing_package_ids.includes(pkg.id) && selectedId !== pkg.id}>
                                            {pkg.name} ({pkg.package_type === 'digital' ? 'Numérique' : 'Physique'})
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    className="remove-pkg-btn"
                                    onClick={() => {
                                        const newIds = formData.pricing_package_ids.filter((_, i) => i !== idx);
                                        setFormData({ ...formData, pricing_package_ids: newIds });
                                    }}
                                >
                                    &times;
                                </button>
                            </div>
                        ))}

                        <Button
                            type="button"
                            variant="outline"
                            className="add-package-dropdown-btn"
                            onClick={() => setFormData({
                                ...formData,
                                pricing_package_ids: [...formData.pricing_package_ids, '']
                            })}
                        >
                            + Ajouter un autre modèle
                        </Button>
                    </div>

                    {formData.pricing_package_ids.length === 0 && (
                        <p className="no-packages-hint">Aucun modèle sélectionné. L'album utilisera un prix fixe simple.</p>
                    )}
                </div>

                {formData.pricing_package_ids.length === 0 && (
                    <Input
                        label="Prix fixe (€)"
                        name="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.price}
                        onChange={handleChange}
                        required={formData.pricing_package_ids.length === 0}
                    />
                )}

                <div className="form-actions">
                    <Button type="button" variant="outline" className="action-btn" onClick={() => navigate(-1)}>Annuler</Button>
                    <Button type="submit" className="action-btn" disabled={loading}>
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
                    width: 240px;
                    height: 240px;
                    border-radius: var(--radius-md);
                    border: 2px dashed var(--border-subtle);
                    background: var(--bg-tertiary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    flex-shrink: 0;
                }

                .input-field, .input-group select, .input-group textarea {
                    border: 2px solid var(--primary-blue) !important;
                }

                .checkbox-group {
                    background: #fff7ed;
                    padding: 1.25rem;
                    border-radius: var(--radius-md);
                    border: 1px solid #ffedd5;
                    margin-bottom: 2rem;
                }

                .checkbox-label {
                    display: flex;
                    gap: 1rem;
                    cursor: pointer;
                    align-items: flex-start;
                }

                .checkbox-label input[type="checkbox"] {
                    width: 20px;
                    height: 20px;
                    margin-top: 3px;
                    accent-color: var(--primary-orange);
                    cursor: pointer;
                }

                .checkbox-text {
                    display: flex;
                    flex-direction: column;
                }

                .checkbox-title {
                    font-weight: 700;
                    color: #9a3412;
                    font-size: 1rem;
                }

                .checkbox-hint {
                    font-size: 0.85rem;
                    color: #c2410c;
                    margin-top: 0.25rem;
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

                .multi-package-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                    margin-top: 0.5rem;
                }

                .package-select-row {
                    display: flex;
                    gap: 0.75rem;
                    align-items: center;
                }

                .package-select-row select {
                    flex: 1;
                }

                .remove-pkg-btn {
                    background: #fee2e2;
                    color: #ef4444;
                    border: none;
                    width: 38px;
                    height: 38px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .remove-pkg-btn:hover {
                    background: #fecaca;
                }

                .add-package-dropdown-btn {
                    border-style: dashed !important;
                    font-size: 0.85rem !important;
                    height: 42px !important;
                }

                .no-packages-hint {
                    font-size: 0.8rem;
                    color: var(--text-tertiary);
                    margin-top: 0.5rem;
                    font-style: italic;
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
