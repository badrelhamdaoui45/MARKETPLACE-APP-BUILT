import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { countries } from '../utils/countries';
import { User, Mail, Phone, Globe, Save, ArrowLeft, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Image as ImageIcon } from 'lucide-react';

const PhotographerSettings = () => {
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [formData, setFormData] = useState({
        full_name: '',
        logo_url: '',
        email: '',
        whatsapp: '',
        website: '',
        bio: '',
        watermark_text: '',
        country: ''
    });

    useEffect(() => {
        if (profile) {
            setFormData({
                full_name: profile.full_name || '',
                logo_url: profile.logo_url || '',
                email: profile.email || '',
                whatsapp: profile.whatsapp || '',
                website: profile.website || '',
                bio: profile.bio || '',
                watermark_text: profile.watermark_text || '© RUN CAPTURE',
                country: profile.country || ''
            });
            setLoading(false);
        }
    }, [profile]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setSaving(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/logo_${Math.random()}.${fileExt}`;
            const filePath = `logos/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('public-photos')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('public-photos')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, logo_url: data.publicUrl }));

            // Auto-save the logo URL immediately or just let the user save the form?
            // Let's just update state for now and let the save button handle the DB update.

        } catch (error) {
            console.error('Error uploading logo:', error);
            setMessage({ type: 'error', text: 'Error uploading logo.' });
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: formData.full_name,
                    logo_url: formData.logo_url,
                    whatsapp: formData.whatsapp,
                    website: formData.website,
                    bio: formData.bio,
                    watermark_text: formData.watermark_text,
                    country: formData.country
                })
                .eq('id', user.id);

            if (error) throw error;

            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            console.error('Error updating profile:', error);
            setMessage({ type: 'error', text: 'Error updating profile. Please try again.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div style={{ padding: '4rem', textAlign: 'center' }}>Loading settings...</div>;
    }

    return (
        <div className="settings-container">
            <div className="settings-content">
                <header className="settings-header">
                    <button onClick={() => navigate(-1)} className="back-btn">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="settings-title">Profile Information</h1>
                        <p className="settings-subtitle">Update your public profile details</p>
                    </div>
                </header>

                {message.text && (
                    <div className={`status-message ${message.type}`}>
                        {message.type === 'success' && <CheckCircle size={18} />}
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSave} className="settings-form">
                    <div className="form-section">
                        <h3 className="section-title">Public Details</h3>
                        <div className="form-grid">
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label><ImageIcon size={16} /> Brand Logo</label>
                                <div className="logo-upload-container">
                                    <div className="logo-preview-wrapper">
                                        {formData.logo_url ? (
                                            <img src={formData.logo_url} alt="Logo" className="logo-preview" />
                                        ) : (
                                            <div className="logo-placeholder">NO LOGO</div>
                                        )}
                                    </div>
                                    <div className="logo-actions">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            id="logo-upload"
                                            onChange={handleLogoUpload}
                                            style={{ display: 'none' }}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => document.getElementById('logo-upload').click()}
                                            disabled={saving}
                                        >
                                            {formData.logo_url ? 'Change Logo' : 'Upload Logo'}
                                        </Button>
                                        <p className="input-hint">Recommended: Square PNG or JPG, at least 200x200px.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="form-group">
                                <label><User size={16} /> Full Name</label>
                                <Input
                                    name="full_name"
                                    value={formData.full_name}
                                    onChange={handleInputChange}
                                    placeholder="Enter your full name"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label><Mail size={16} /> Email Address</label>
                                <Input
                                    name="email"
                                    value={formData.email}
                                    readOnly
                                    disabled
                                    className="readonly-input"
                                />
                                <small className="input-hint">Email cannot be changed here.</small>
                            </div>

                            <div className="form-group">
                                <label><Phone size={16} /> WhatsApp Number</label>
                                <Input
                                    name="whatsapp"
                                    value={formData.whatsapp}
                                    onChange={handleInputChange}
                                    placeholder="+212 600000000"
                                />
                            </div>

                            <div className="form-group">
                                <label><Globe size={16} /> Website Link</label>
                                <Input
                                    name="website"
                                    value={formData.website}
                                    onChange={handleInputChange}
                                    placeholder="https://yourwebsite.com"
                                />
                            </div>

                            <div className="form-group">
                                <label><Globe size={16} /> Country</label>
                                <Select
                                    name="country"
                                    value={formData.country}
                                    onChange={handleInputChange}
                                    options={countries}
                                />
                            </div>

                            <div className="form-group">
                                <label><ImageIcon size={16} /> Custom Watermark Text</label>
                                <Input
                                    name="watermark_text"
                                    value={formData.watermark_text}
                                    onChange={handleInputChange}
                                    placeholder="e.g. © MY STUDIO"
                                />
                                <small className="input-hint">This text will appear on all new photo uploads.</small>
                            </div>
                        </div>

                        <div className="form-group bio-group">
                            <label>Biography</label>
                            <textarea
                                name="bio"
                                value={formData.bio}
                                onChange={handleInputChange}
                                placeholder="Tell your clients a bit about yourself and your photography style..."
                                className="settings-textarea"
                            />
                        </div>
                    </div>

                    <div className="form-actions">
                        <Button
                            type="submit"
                            variant="primary"
                            className="save-btn action-btn"
                            disabled={saving}
                        >
                            <Save size={18} /> {saving ? 'SAVING...' : 'SAVE CHANGES'}
                        </Button>
                    </div>
                </form>
            </div>

            <style>{`
                .settings-container {
                    padding: 4rem 2rem;
                    min-height: calc(100vh - 80px);
                    background: #f8fafc;
                    display: flex;
                    justify-content: center;
                }

                .settings-content {
                    max-width: 800px;
                    width: 100%;
                }

                .settings-header {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                    margin-bottom: 3rem;
                }

                .back-btn {
                    background: white;
                    border: 1px solid #e2e8f0;
                    width: 44px;
                    height: 44px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: #64748b;
                    transition: all 0.2s ease;
                }

                .back-btn:hover {
                    color: var(--primary-blue);
                    border-color: var(--primary-blue);
                    transform: translateX(-4px);
                }

                .settings-title {
                    font-size: 2rem;
                    font-weight: 800;
                    color: #0f172a;
                    margin: 0;
                }

                .settings-subtitle {
                    color: #64748b;
                    margin: 0.25rem 0 0;
                }

                .settings-form {
                    background: white;
                    border-radius: 20px;
                    padding: 2.5rem;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
                }

                .form-section {
                    margin-bottom: 2rem;
                }

                .section-title {
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: #334155;
                    margin-bottom: 2rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .form-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 2rem;
                    margin-bottom: 2rem;
                }

                .form-group label {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: #475569;
                    margin-bottom: 0.75rem;
                }

                .readonly-input {
                    background: #f1f5f9 !important;
                    color: #94a3b8 !important;
                    cursor: not-allowed;
                }

                .input-hint {
                    display: block;
                    margin-top: 0.5rem;
                    color: #94a3b8;
                    font-size: 0.75rem;
                }

                .settings-textarea {
                    width: 100%;
                    min-height: 120px;
                    padding: 1rem;
                    border-radius: 12px;
                    border: 2px solid var(--primary-blue);
                    font-family: inherit;
                    font-size: 1rem;
                    resize: vertical;
                    transition: all 0.2s ease;
                }

                .settings-textarea:focus {
                    outline: none;
                    box-shadow: 0 0 0 4px rgba(2, 46, 68, 0.1);
                }

                .form-actions {
                    border-top: 1px solid #f1f5f9;
                    padding-top: 2rem;
                    display: flex;
                    justify-content: flex-end;
                }

                .save-btn {
                    height: 52px;
                    padding: 0 2rem !important;
                    gap: 0.75rem;
                }

                .status-message {
                    padding: 1rem 1.5rem;
                    border-radius: 12px;
                    margin-bottom: 2rem;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    font-weight: 600;
                }

                .status-message.success {
                    background: #f0fdf4;
                    color: #166534;
                    border: 1px solid #bbf7d0;
                }

                .status-message.error {
                    background: #fef2f2;
                    color: #991b1b;
                    border: 1px solid #fecaca;
                }

                /* Logo Upload Styles */
                .logo-upload-container {
                    display: flex;
                    align-items: center;
                    gap: 2rem;
                    padding: 1.5rem;
                    background: #f8fafc;
                    border-radius: 12px;
                    border: 1px dashed #cbd5e1;
                }

                .logo-preview-wrapper {
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    overflow: hidden;
                    background: white;
                    border: 1px solid #e2e8f0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
                }

                .logo-preview {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .logo-placeholder {
                    font-size: 0.7rem;
                    font-weight: 700;
                    color: #94a3b8;
                }

                .logo-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                @media (max-width: 768px) {
                    .settings-container {
                        padding: 2rem 1rem;
                    }
                    .settings-form {
                        padding: 1.5rem;
                    }
                    .form-grid {
                        grid-template-columns: 1fr;
                        gap: 1.5rem;
                    }
                    .settings-title {
                        font-size: 1.5rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default PhotographerSettings;
