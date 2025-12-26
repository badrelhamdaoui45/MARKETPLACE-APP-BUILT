
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Link } from 'react-router-dom';

const PackageSettings = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [packages, setPackages] = useState([]);
    const [isCreating, setIsCreating] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: 'New Package',
        type: 'digital',
        tiers: [{ quantity: 1, price: 10 }]
    });

    useEffect(() => {
        if (user) fetchPackages();
    }, [user]);

    const fetchPackages = async () => {
        try {
            const { data, error } = await supabase
                .from('pricing_packages')
                .select('*')
                .eq('photographer_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPackages(data);
        } catch (error) {
            console.error('Error fetching packages:', error);
        } finally {
            setLoading(false);
        }
    };

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

    const handleSave = async () => {
        try {
            const { error } = await supabase
                .from('pricing_packages')
                .insert({
                    photographer_id: user.id,
                    name: formData.name,
                    package_type: formData.type,
                    tiers: formData.tiers
                });

            if (error) throw error;

            setIsCreating(false);
            fetchPackages();
        } catch (error) {
            alert('Error saving package: ' + error.message);
        }
    };

    if (loading) return <div style={{ padding: '2rem' }}>Loading settings...</div>;

    return (
        <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <Link to="/photographer/dashboard" style={{ textDecoration: 'underline' }}>Back</Link>
                <h1>Package Pricing Settings</h1>
            </div>

            {!isCreating ? (
                <div>
                    <Button onClick={() => setIsCreating(true)} style={{ marginBottom: '2rem' }}>+ Create New Package Model</Button>

                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {packages.map(pkg => (
                            <div key={pkg.id} style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3>{pkg.name} <span style={{ fontSize: '0.8rem', opacity: 0.7, textTransform: 'uppercase', background: 'var(--bg-tertiary)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{pkg.package_type}</span></h3>
                                    <Button variant="outline" onClick={() => { /* Delete logic */ }}>Delete</Button>
                                </div>
                                <div style={{ marginTop: '1rem' }}>
                                    {pkg.tiers.map((tier, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', padding: '0.5rem 0' }}>
                                            <span>{tier.quantity} Photo{tier.quantity > 1 ? 's' : ''}</span>
                                            <span>${tier.price}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                    <h2 style={{ marginBottom: '1.5rem' }}>Create Package Model</h2>

                    {/* Type Selection */}
                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Package Type</label>
                        <div style={{ display: 'flex', gap: '2rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input type="radio" checked={formData.type === 'digital'} onChange={() => setFormData({ ...formData, type: 'digital' })} />
                                Digital Format (Email delivery)
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input type="radio" checked={formData.type === 'physical'} onChange={() => setFormData({ ...formData, type: 'physical' })} />
                                Physical Format (Mail delivery)
                            </label>
                        </div>
                    </div>

                    <Input label="Package Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />

                    {/* Pricing Tiers */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>

                        {/* Left: Definition */}
                        <div>
                            <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>Define Unit Pricing</h4>
                            {formData.tiers.map((tier, index) => (
                                <div key={index} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'end' }}>
                                    <Input
                                        label={index === 0 ? "Quantity" : ""}
                                        type="number"
                                        value={tier.quantity}
                                        onChange={(e) => handleTierChange(index, 'quantity', e.target.value)}
                                        style={{ width: '80px' }}
                                    />
                                    <Input
                                        label={index === 0 ? "Unit Price ($)" : ""}
                                        type="number"
                                        value={tier.price}
                                        onChange={(e) => handleTierChange(index, 'price', e.target.value)}
                                    />
                                    <button onClick={() => handleRemoveTier(index)} style={{ padding: '0.75rem', color: '#ef4444', background: 'transparent', border: 'none' }}>×</button>
                                </div>
                            ))}
                            <Button variant="secondary" onClick={handleAddTier} style={{ width: '100%' }}>+ Add Pricing Tier</Button>
                        </div>

                        {/* Right: Preview Grid (Example) */}
                        <div style={{ background: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                            <h4 style={{ marginBottom: '1rem' }}>Pricing Grid Preview</h4>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                                        <th style={{ padding: '0.5rem' }}>Photos</th>
                                        <th style={{ padding: '0.5rem' }}>Total Price</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {formData.tiers.map((tier, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                            <td style={{ padding: '0.5rem' }}>{tier.quantity} photo{tier.quantity > 1 ? 's' : ''}</td>
                                            <td style={{ padding: '0.5rem' }}>${(tier.quantity * tier.price).toFixed(2)} (${tier.price}/unit)</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
                        <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
                        <Button onClick={handleSave}>Save Package Model</Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PackageSettings;
