import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { formatPrice, getCurrencySymbol } from '../../utils/currencies';
import { useLanguage } from '../../context/LanguageContext';

const CreatePackageModal = ({ isOpen, onClose, onSuccess }) => {
    const { user, profile } = useAuth();
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: 'New Template',
        type: 'digital',
        tiers: [{ quantity: 1, price: '' }]
    });

    if (!isOpen) return null;

    const handleAddTier = () => {
        setFormData(prev => ({
            ...prev,
            tiers: [...prev.tiers, { quantity: prev.tiers.length + 1, price: '' }]
        }));
    };

    const handleTierChange = (index, field, value) => {
        const newTiers = [...formData.tiers];
        newTiers[index][field] = value;
        setFormData(prev => ({ ...prev, tiers: newTiers }));
    };

    const handleRemoveTier = (index) => {
        const newTiers = formData.tiers.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, tiers: newTiers }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('pricing_packages')
                .insert({
                    photographer_id: user.id,
                    name: formData.name,
                    package_type: formData.type,
                    tiers: formData.tiers.map(t => ({
                        quantity: parseInt(t.quantity) || 0,
                        price: parseFloat(t.price) || 0
                    }))
                })
                .select()
                .single();

            if (error) throw error;

            if (onSuccess) onSuccess(data);
            onClose();
        } catch (error) {
            alert('Error creating template: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            animation: 'fadeIn 0.2s ease'
        }} onClick={onClose}>
            <div style={{
                background: 'white',
                padding: '2.5rem',
                borderRadius: '12px',
                width: '90%',
                maxWidth: '800px',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid #e5e7eb'
            }} onClick={e => e.stopPropagation()}>

                <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: '700' }}>{t('pricing_create_model')}</h2>

                <form onSubmit={handleSave}>
                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>{t('album_description')}</label>
                        <div style={{ display: 'flex', gap: '2rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                                <input type="radio" checked={formData.type === 'digital'} onChange={() => setFormData({ ...formData, type: 'digital' })} />
                                {t('pricing_digital')}
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                                <input type="radio" checked={formData.type === 'physical'} onChange={() => setFormData({ ...formData, type: 'physical' })} />
                                {t('pricing_physical')}
                            </label>
                        </div>
                    </div>

                    <Input
                        label={t('album_title')}
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem', marginTop: '2rem' }}>
                        <div>
                            <h4 style={{ marginBottom: '1rem', fontWeight: '600', fontSize: '0.95rem' }}>{t('pricing_tiers')}</h4>
                            {formData.tiers.map((tier, index) => (
                                <div key={index} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'flex-end' }}>
                                    <div style={{ flex: 1 }}>
                                        {index === 0 && <label style={{ fontSize: '0.8rem', fontWeight: '600', display: 'block', marginBottom: '0.4rem' }}>{t('pricing_photos')}</label>}
                                        <input
                                            type="number"
                                            className="input-field"
                                            value={tier.quantity}
                                            onChange={(e) => handleTierChange(index, 'quantity', e.target.value)}
                                            min="1"
                                            required
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        {index === 0 && <label style={{ fontSize: '0.8rem', fontWeight: '600', display: 'block', marginBottom: '0.4rem' }}>{t('pricing_unit_price')} ({getCurrencySymbol(profile?.currency)})</label>}
                                        <input
                                            type="number"
                                            className="input-field"
                                            value={tier.price}
                                            onChange={(e) => handleTierChange(index, 'price', e.target.value)}
                                            step="0.01"
                                            min="0"
                                            required
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveTier(index)}
                                        style={{
                                            padding: '0.75rem',
                                            color: '#ef4444',
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: '1.2rem'
                                        }}
                                        disabled={formData.tiers.length === 1}
                                    >×</button>
                                </div>
                            ))}
                            <Button type="button" variant="outline" onClick={handleAddTier} style={{ width: '100%', marginTop: '0.5rem' }}>
                                + {t('pricing_tiers')}
                            </Button>
                        </div>

                        <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
                            <h4 style={{ marginBottom: '1rem', fontWeight: '600', fontSize: '0.95rem' }}>{t('pricing_preview')}</h4>
                            <div style={{ fontSize: '0.85rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem', fontWeight: '600' }}>
                                    <span>{t('pricing_photos')}</span>
                                    <span>{t('pricing_total_price')}</span>
                                </div>
                                {formData.tiers.map((tier, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', padding: '0.6rem 0' }}>
                                        <span>{tier.quantity} photo{tier.quantity > 1 ? 's' : ''}</span>
                                        <span>{formatPrice(tier.quantity * tier.price, profile?.currency)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem', justifyContent: 'flex-end' }}>
                        <Button type="button" variant="outline" onClick={onClose}>{t('cancel')}</Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            style={{ backgroundColor: '#f97316', borderColor: '#f97316' }}
                        >
                            {loading ? t('album_saving') : t('save')}
                        </Button>
                    </div>
                </form>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default CreatePackageModal;
