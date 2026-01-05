import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import Input from '../ui/Input';

const CreatePackageModal = ({ isOpen, onClose, onSuccess }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: 'Nouveau Modèle',
        type: 'digital',
        tiers: [{ quantity: 1, price: 10 }]
    });

    if (!isOpen) return null;

    const handleAddTier = () => {
        setFormData(prev => ({
            ...prev,
            tiers: [...prev.tiers, { quantity: prev.tiers.length + 1, price: 0 }]
        }));
    };

    const handleTierChange = (index, field, value) => {
        const newTiers = [...formData.tiers];
        newTiers[index][field] = parseFloat(value) || 0;
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
                    tiers: formData.tiers
                })
                .select()
                .single();

            if (error) throw error;

            if (onSuccess) onSuccess(data);
            onClose();
        } catch (error) {
            alert('Erreur lors de la création du modèle : ' + error.message);
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

                <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: '700' }}>Créer un nouveau modèle de prix</h2>

                <form onSubmit={handleSave}>
                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>Type de format</label>
                        <div style={{ display: 'flex', gap: '2rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                                <input type="radio" checked={formData.type === 'digital'} onChange={() => setFormData({ ...formData, type: 'digital' })} />
                                Format Numérique (Envoi email)
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                                <input type="radio" checked={formData.type === 'physical'} onChange={() => setFormData({ ...formData, type: 'physical' })} />
                                Format Physique (Envoi postal)
                            </label>
                        </div>
                    </div>

                    <Input
                        label="Nom du modèle"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem', marginTop: '2rem' }}>
                        <div>
                            <h4 style={{ marginBottom: '1rem', fontWeight: '600', fontSize: '0.95rem' }}>Définir les paliers de prix</h4>
                            {formData.tiers.map((tier, index) => (
                                <div key={index} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'flex-end' }}>
                                    <div style={{ flex: 1 }}>
                                        {index === 0 && <label style={{ fontSize: '0.8rem', fontWeight: '600', display: 'block', marginBottom: '0.4rem' }}>Quantité</label>}
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
                                        {index === 0 && <label style={{ fontSize: '0.8rem', fontWeight: '600', display: 'block', marginBottom: '0.4rem' }}>Prix Unitaire ($)</label>}
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
                                + Ajouter un palier
                            </Button>
                        </div>

                        <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
                            <h4 style={{ marginBottom: '1rem', fontWeight: '600', fontSize: '0.95rem' }}>Aperçu de la grille</h4>
                            <div style={{ fontSize: '0.85rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem', fontWeight: '600' }}>
                                    <span>Photos</span>
                                    <span>Prix Total</span>
                                </div>
                                {formData.tiers.map((tier, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', padding: '0.6rem 0' }}>
                                        <span>{tier.quantity} photo{tier.quantity > 1 ? 's' : ''}</span>
                                        <span>${(tier.quantity * tier.price).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem', justifyContent: 'flex-end' }}>
                        <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            style={{ backgroundColor: '#f97316', borderColor: '#f97316' }}
                        >
                            {loading ? 'Création...' : 'Enregistrer le modèle'}
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
