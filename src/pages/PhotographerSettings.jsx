import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { countries } from '../utils/countries';
import { currencies } from '../utils/currencies';
import { User, Mail, Phone, Globe, Save, ArrowLeft, CheckCircle, Award, CreditCard, ArrowUpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Image as ImageIcon } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { createPlanCheckoutSession } from '../lib/stripe/service';

const PhotographerSettings = () => {
    const { user, profile } = useAuth();
    const { t, language: currentLanguage, changeLanguage } = useLanguage();
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
        country: '',
        currency: 'USD',
        language: 'en'
    });

    const [activePlan, setActivePlan] = useState(null);
    const [photoCount, setPhotoCount] = useState(0);
    const [allPlans, setAllPlans] = useState([]);
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [processingPlan, setProcessingPlan] = useState(null);

    useEffect(() => {
        if (profile) {
            setFormData({
                full_name: profile.full_name || '',
                logo_url: profile.logo_url || '',
                email: profile.email || '',
                whatsapp: profile.whatsapp || '',
                website: profile.website || '',
                bio: profile.bio || '',
                watermark_text: profile.watermark_text || '© RUN CAPTURES',
                country: profile.country || '',
                currency: profile.currency || 'USD',
                language: profile.language || 'en'
            });
            setLoading(false);
        }
    }, [profile]);

    // Handle plan upgrade success/cancel redirects from Stripe Checkout
    useEffect(() => {
        const handlePlanUpgradeSuccess = async () => {
            const params = new URLSearchParams(window.location.search);
            const success = params.get('success');
            const planId = params.get('plan_id');
            const sessionId = params.get('session_id');

            if (success === 'true' && planId && sessionId) {
                try {
                    // Update user's profile plan_id in the DB
                    const { error } = await supabase
                        .from('profiles')
                        .update({ plan_id: planId })
                        .eq('id', user.id);

                    if (error) throw error;

                    setMessage({ type: 'success', text: 'Subscription Plan upgraded successfully!' });
                    setTimeout(() => setMessage({ type: '', text: '' }), 5000);

                    // Clean parameters from URL
                    const newUrl = window.location.pathname;
                    window.history.replaceState({}, document.title, newUrl);
                    
                    // Refresh data
                    if (profile) {
                        profile.plan_id = planId; // trigger updates
                    }
                } catch (err) {
                    console.error("Error updating subscription plan profile:", err);
                    setMessage({ type: 'error', text: 'Failed to update subscription profile.' });
                }
            } else if (params.get('cancelled') === 'true') {
                setMessage({ type: 'error', text: 'Plan upgrade checkout was cancelled.' });
                setTimeout(() => setMessage({ type: '', text: '' }), 5000);
                const newUrl = window.location.pathname;
                window.history.replaceState({}, document.title, newUrl);
            }
        };

        if (user && profile) {
            handlePlanUpgradeSuccess();
        }
    }, [user, profile]);

    useEffect(() => {
        const fetchPlanAndUsage = async () => {
            if (!user) return;
            try {
                // 1. Fetch active plan details
                const planId = profile?.plan_id || '00000000-0000-0000-0000-000000000001';
                const { data: planData } = await supabase
                    .from('pricing_plans')
                    .select('*')
                    .eq('id', planId)
                    .single();
                
                if (planData) {
                    setActivePlan(planData);
                }

                // 2. Fetch all pricing plans
                const { data: allPlansData } = await supabase
                    .from('pricing_plans')
                    .select('*')
                    .order('price', { ascending: true });
                if (allPlansData) {
                    setAllPlans(allPlansData);
                }

                // 3. Fetch photo usage count
                const { data: userAlbums } = await supabase
                    .from('albums')
                    .select('id')
                    .eq('photographer_id', user.id);

                if (userAlbums && userAlbums.length > 0) {
                    const albumIds = userAlbums.map(a => a.id);
                    const { count, error: countError } = await supabase
                        .from('photos')
                        .select('id', { count: 'exact', head: true })
                        .in('album_id', albumIds);
                    
                    if (!countError) {
                        setPhotoCount(count || 0);
                    }
                }
            } catch (err) {
                console.error("Error loading subscription details:", err);
            }
        };

        if (profile) {
            fetchPlanAndUsage();
        }
    }, [profile, user]);

    const handleSelectPlan = async (targetPlan) => {
        if (!user) return;
        
        const currentPlanId = profile?.plan_id || '00000000-0000-0000-0000-000000000001';
        if (targetPlan.id === currentPlanId) {
            alert("This is already your active subscription plan!");
            return;
        }

        setProcessingPlan(targetPlan.id);
        
        try {
            // Case 1: Free Plan ($0/mo) -> update directly
            if (Number(targetPlan.price) === 0) {
                const { error } = await supabase
                    .from('profiles')
                    .update({ plan_id: targetPlan.id })
                    .eq('id', user.id);
                    
                if (error) throw error;
                
                setActivePlan(targetPlan);
                if (profile) {
                    profile.plan_id = targetPlan.id;
                }
                
                setMessage({ type: 'success', text: `Downgraded to ${targetPlan.name} plan successfully.` });
                setTimeout(() => setMessage({ type: '', text: '' }), 4000);
                setShowPlanModal(false);
            } 
            // Case 2: Paid Plan -> Stripe checkout redirect
            else {
                const session = await createPlanCheckoutSession(
                    targetPlan.id,
                    targetPlan.name,
                    targetPlan.price,
                    user.id,
                    user.email
                );
                
                if (session && session.url) {
                    window.location.href = session.url;
                } else {
                    throw new Error("Failed to generate Stripe checkout session");
                }
            }
        } catch (err) {
            console.error("Error upgrading plan:", err);
            alert("Failed to purchase plan: " + err.message);
        } finally {
            setProcessingPlan(null);
        }
    };

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
                    country: formData.country,
                    currency: formData.currency,
                    language: formData.language
                })
                .eq('id', user.id);
            
            // Immediately sync context if language changed
            if (formData.language !== currentLanguage) {
                changeLanguage(formData.language);
            }

            if (error) throw error;

            setMessage({ type: 'success', text: t('settings_update_success') });
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
                        <h1 className="settings-title">{t('settings_title')}</h1>
                        <p className="settings-subtitle">{t('settings_profile_info')}</p>
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
                                            variant="orange"
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
                                <label><User size={16} /> {t('settings_full_name')}</label>
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
                                <label><Globe size={16} /> {t('settings_website')}</label>
                                <Input
                                    name="website"
                                    value={formData.website}
                                    onChange={handleInputChange}
                                    placeholder="https://yourwebsite.com"
                                />
                            </div>

                            <div className="form-group">
                                <label><Globe size={16} /> {t('settings_location')}</label>
                                <Select
                                    name="country"
                                    value={formData.country}
                                    onChange={handleInputChange}
                                    options={countries}
                                />
                            </div>

                            <div className="form-group">
                                <label><Globe size={16} /> {t('settings_selling_currency')}</label>
                                <Select
                                    name="currency"
                                    value={formData.currency}
                                    onChange={handleInputChange}
                                    options={currencies.map(c => ({ value: c.code, label: `${c.name} (${c.symbol})` }))}
                                />
                                <small className="input-hint">This currency will be shown to runners.</small>
                            </div>

                            <div className="form-group">
                                <label><Globe size={16} /> {t('settings_language')}</label>
                                <Select
                                    name="language"
                                    value={formData.language}
                                    onChange={handleInputChange}
                                    options={[
                                        { value: 'en', label: 'English' },
                                        { value: 'fr', label: 'Français' }
                                    ]}
                                />
                                <small className="input-hint">Set your preferred dashboard language.</small>
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
                            <label>{t('settings_bio')}</label>
                            <textarea
                                name="bio"
                                value={formData.bio}
                                onChange={handleInputChange}
                                placeholder="Tell your clients a bit about yourself and your photography style..."
                                className="settings-textarea"
                            />
                        </div>
                    </div>

                    {/* Subscription & Storage Details */}
                    <div className="form-section" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '2.5rem', marginTop: '2.5rem' }}>
                        <h3 className="section-title">My Subscription Plan</h3>
                        
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                            gap: '2rem',
                            background: '#f8fafc',
                            padding: '1.75rem',
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0'
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Current Plan Tier</span>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {activePlan ? activePlan.name : 'Free'}
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, background: '#eff6ff', color: 'var(--primary-blue)', padding: '2px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                        Active
                                    </span>
                                </div>
                                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                                    Monthly Price: <strong>{activePlan ? `$${activePlan.price}` : '$0'} / mo</strong>
                                </span>
                                <span style={{ fontSize: '0.875rem', color: '#10b981', fontWeight: 600 }}>
                                    Commission: {activePlan ? activePlan.commission_percent : '15'}% platform fee on sales
                                </span>
                                <Button
                                    type="button"
                                    variant="orange"
                                    onClick={() => setShowPlanModal(true)}
                                    style={{ marginTop: '1rem', width: 'fit-content', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    <ArrowUpCircle size={16} /> Upgrade / Change Plan
                                </Button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                    <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Photo Storage Usage</span>
                                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#334155' }}>
                                        {photoCount.toLocaleString()} / {activePlan ? activePlan.upload_limit.toLocaleString() : '100'} photos
                                    </span>
                                </div>
                                
                                <div style={{ width: '100%', height: '10px', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden', marginTop: '4px' }}>
                                    <div style={{
                                        width: `${Math.min((photoCount / (activePlan ? activePlan.upload_limit : 100)) * 100, 100)}%`,
                                        height: '100%',
                                        background: (photoCount / (activePlan ? activePlan.upload_limit : 100)) >= 1.0 ? 'linear-gradient(90deg, #ef4444, #dc2626)' : 'linear-gradient(90deg, var(--primary-blue), #1d4ed8)',
                                        borderRadius: '5px',
                                        transition: 'width 0.4s ease'
                                    }}></div>
                                </div>
                                
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                    {((photoCount / (activePlan ? activePlan.upload_limit : 100)) * 100).toFixed(1)}% capacity used. Upgrades can be requested by contacting support.
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="form-actions">
                        <Button
                            type="submit"
                            variant="primary"
                            className="save-btn action-btn"
                            disabled={saving}
                        >
                            <Save size={18} /> {saving ? t('loading').toUpperCase() : t('settings_save_changes').toUpperCase()}
                        </Button>
                    </div>
                </form>
            </div>

            {showPlanModal && (
                <div className="popup-overlay-admin" onClick={(e) => e.target === e.currentTarget && setShowPlanModal(false)}>
                    <div className="popup-modal-admin" style={{ maxWidth: '650px' }}>
                        <div className="modal-header-admin">
                            <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
                                <Award size={20} color="var(--primary-blue)" /> Upgrade Subscription Plan
                            </h3>
                            <button type="button" className="close-modal-admin" onClick={() => setShowPlanModal(false)}>&times;</button>
                        </div>
                        <div className="modal-body-admin" style={{ padding: '2rem' }}>
                            <p style={{ margin: '0 0 1.5rem 0', color: '#64748b', fontSize: '0.9rem', lineHeight: '1.5' }}>
                                Choose a subscription plan that suits your photography volume. Subscriptions are billed monthly and can be cancelled at any time.
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {allPlans.map(plan => {
                                    const isCurrent = plan.id === (profile?.plan_id || '00000000-0000-0000-0000-000000000001');
                                    const isProcessing = processingPlan === plan.id;

                                    return (
                                        <div key={plan.id} style={{
                                            border: isCurrent ? '2px solid var(--primary-blue)' : '1px solid #e2e8f0',
                                            borderRadius: '16px',
                                            padding: '1.25rem 1.5rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            background: isCurrent ? '#eff6ff' : 'white',
                                            position: 'relative',
                                            transition: 'all 0.2s',
                                            boxShadow: isCurrent ? '0 4px 12px rgba(37, 99, 235, 0.08)' : '0 1px 3px rgba(0, 0, 0, 0.01)'
                                        }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontWeight: 800, fontSize: '1.15rem', color: '#0f172a' }}>{plan.name}</span>
                                                    {isCurrent && (
                                                        <span style={{ fontSize: '0.75rem', background: 'var(--primary-blue)', color: 'white', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                                                            Active
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        Photos limit: <strong style={{ color: '#334155' }}>{plan.upload_limit.toLocaleString()}</strong>
                                                    </span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        Commission: <strong style={{ color: '#10b981' }}>{plan.commission_percent}%</strong>
                                                    </span>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary-blue)' }}>${plan.price}</span>
                                                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>/ month</span>
                                                </div>

                                                <Button
                                                    type="button"
                                                    variant={isCurrent ? 'secondary' : 'orange'}
                                                    disabled={isCurrent || processingPlan !== null}
                                                    onClick={() => handleSelectPlan(plan)}
                                                    style={{ height: '40px', padding: '0 1.25rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                                                >
                                                    {isProcessing ? 'Processing...' : isCurrent ? 'Active' : Number(plan.price) === 0 ? 'Downgrade' : 'Buy Plan'}
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .settings-container {
                    padding: 4rem 4rem;
                    min-height: calc(100vh - 80px);
                    background: #f8fafc;
                    width: 100%;
                    max-width: 100%;
                }

                .settings-content {
                    width: 100%;
                    margin: 0;
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

                /* Admin Modal Styles */
                .popup-overlay-admin {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.4);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 1.5rem;
                }

                .popup-modal-admin {
                    background: white;
                    width: 100%;
                    max-width: 600px;
                    border-radius: 24px;
                    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
                    overflow: hidden;
                    animation: modalIn 0.3s ease-out;
                }

                @keyframes modalIn {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }

                .modal-header-admin {
                    padding: 1.5rem 2rem;
                    border-bottom: 1px solid #f1f5f9;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .close-modal-admin {
                    background: none;
                    border: none;
                    font-size: 1.75rem;
                    color: #94a3b8;
                    cursor: pointer;
                    line-height: 1;
                    padding: 0;
                    margin: 0;
                    transition: color 0.2s;
                }

                .close-modal-admin:hover {
                    color: #475569;
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
