
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Plus, Layout, Package as PackageIcon, Info } from 'lucide-react';

const PackageSettings = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [packages, setPackages] = useState([]);
    const [isCreating, setIsCreating] = useState(false);

    // Modal State
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, packageId: null, packageName: '' });

    // Form State
    const [formData, setFormData] = useState({
        name: 'New Package',
        type: 'digital',
        tiers: [{ quantity: 1, price: '' }]
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
            tiers: [...prev.tiers, { quantity: prev.tiers.length + 1, price: '' }]
        }));
    };

    const handleTierChange = (index, field, value) => {
        const newTiers = [...formData.tiers];
        // Allow empty string to keep input clear
        newTiers[index][field] = value === '' ? '' : parseFloat(value);
        setFormData(prev => ({ ...prev, tiers: newTiers }));
    };

    const handleRemoveTier = (index) => {
        const newTiers = formData.tiers.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, tiers: newTiers }));
    };

    const handleSave = async () => {
        try {
            // Sanitize tiers to ensure numeric values
            const sanitizedTiers = formData.tiers.map(tier => ({
                quantity: parseInt(tier.quantity) || 0,
                price: parseFloat(tier.price) || 0
            }));

            const { error } = await supabase
                .from('pricing_packages')
                .insert({
                    photographer_id: user.id,
                    name: formData.name,
                    package_type: formData.type,
                    tiers: sanitizedTiers
                });

            if (error) throw error;

            setIsCreating(false);
            fetchPackages();
        } catch (error) {
            alert('Error saving package: ' + error.message);
        }
    };

    const handleDelete = async (packageId, packageName) => {
        // Open modal instead of alert
        setDeleteModal({ isOpen: true, packageId, packageName });
    };

    const confirmDelete = async () => {
        try {
            const { error } = await supabase
                .from('pricing_packages')
                .delete()
                .eq('id', deleteModal.packageId)
                .eq('photographer_id', user.id);

            if (error) throw error;

            // Refresh the packages list
            fetchPackages();
        } catch (error) {
            console.error('Error deleting package:', error);
        }
    };

    if (loading) return <div style={{ padding: '2rem' }}>Loading settings...</div>;

    return (
        <div className="packages-settings-container">
            <header className="packages-header">
                <Button variant="outline" onClick={() => navigate('/photographer/dashboard')} className="back-btn">
                    <ArrowLeft size={16} /> Back to Dashboard
                </Button>
                <div className="header-main">
                    <h1>Pricing Packages</h1>
                    <p>Create reusable pricing structures for your albums.</p>
                </div>
            </header>

            {!isCreating ? (
                <div className="packages-overview">
                    <div className="action-bar">
                        <Button onClick={() => setIsCreating(true)} className="create-btn">
                            <Plus size={18} /> Create New Model
                        </Button>
                    </div>

                    {packages.length === 0 ? (
                        <div className="empty-packages">
                            <PackageIcon size={48} strokeWidth={1} />
                            <h3>No packages yet</h3>
                            <p>Get started by creating your first pricing model.</p>
                        </div>
                    ) : (
                        <div className="packages-grid">
                            {packages.map(pkg => (
                                <div key={pkg.id} className="package-card">
                                    <div className="package-card-header">
                                        <div className="package-identity">
                                            <h3>{pkg.name}</h3>
                                            <span className={`type-tag ${pkg.package_type}`}>{pkg.package_type}</span>
                                        </div>
                                        <button className="delete-icon-btn" onClick={() => handleDelete(pkg.id, pkg.name)}>
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                    <div className="package-tiers">
                                        {pkg.tiers.map((tier, i) => (
                                            <div key={i} className="tier-row">
                                                <span className="tier-qty">{tier.quantity} Photo{tier.quantity > 1 ? 's' : ''}</span>
                                                <span className="tier-price">${tier.price} <small>/ea</small></span>
                                                <span className="tier-total">${(tier.quantity * tier.price).toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="create-package-card">
                    <div className="card-header">
                        <h2>Create Package Model</h2>
                        <span className="helper-text">Define unit prices that scale with quantity.</span>
                    </div>

                    <div className="form-section">
                        <label className="section-label">PACKAGE TYPE</label>
                        <div className="type-selector">
                            <label className={`type-option ${formData.type === 'digital' ? 'active' : ''}`}>
                                <input type="radio" checked={formData.type === 'digital'} onChange={() => setFormData({ ...formData, type: 'digital' })} />
                                <div className="option-content">
                                    <strong>Digital Format</strong>
                                    <span>Instant download delivery</span>
                                </div>
                            </label>
                            <label className={`type-option ${formData.type === 'physical' ? 'active' : ''}`}>
                                <input type="radio" checked={formData.type === 'physical'} onChange={() => setFormData({ ...formData, type: 'physical' })} />
                                <div className="option-content">
                                    <strong>Physical Format</strong>
                                    <span>Mail delivery for prints</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="form-section">
                        <Input
                            label="PACKAGE NAME"
                            placeholder="e.g. Standard Digital Set"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="pricing-config-grid">
                        <div className="config-left">
                            <label className="section-label">DEFINE TIERS</label>
                            <div className="tiers-list">
                                {formData.tiers.map((tier, index) => (
                                    <div key={index} className="tier-input-group">
                                        <div className="input-col">
                                            {index === 0 && <span className="input-sublabel">Qty.</span>}
                                            <input
                                                type="number"
                                                value={tier.quantity}
                                                onChange={(e) => handleTierChange(index, 'quantity', e.target.value)}
                                                className="modern-input qty-input"
                                            />
                                        </div>
                                        <div className="input-col grow">
                                            {index === 0 && <span className="input-sublabel">Unit Price ($)</span>}
                                            <input
                                                type="number"
                                                value={tier.price}
                                                onChange={(e) => handleTierChange(index, 'price', e.target.value)}
                                                className="modern-input price-input"
                                            />
                                        </div>
                                        <button className="remove-tier-btn" onClick={() => handleRemoveTier(index)} disabled={formData.tiers.length === 1}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                                <Button variant="outline" onClick={handleAddTier} className="add-tier-btn">
                                    <Plus size={16} /> Add Pricing Tier
                                </Button>
                            </div>
                        </div>

                        <div className="config-right">
                            <div className="preview-container">
                                <div className="preview-header">
                                    <Layout size={18} />
                                    <h4>Pricing Grid Preview</h4>
                                </div>
                                <div className="preview-grid">
                                    <div className="grid-header">
                                        <span>Photos</span>
                                        <span>Total Price</span>
                                    </div>
                                    <div className="grid-body">
                                        {formData.tiers.map((tier, i) => (
                                            <div key={i} className="grid-row">
                                                <span className="qty-col">{tier.quantity} item{tier.quantity > 1 ? 's' : ''}</span>
                                                <span className="price-col">
                                                    <strong>${(tier.quantity * tier.price).toFixed(2)}</strong>
                                                    <small>(${tier.price}/u)</small>
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="preview-footer">
                                    <Info size={14} />
                                    <span>Customers pay the total price for the selected quantity.</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="form-actions">
                        <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
                        <Button onClick={handleSave} className="save-btn">Save Package Model</Button>
                    </div>
                </div>
            )}

            <Modal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, packageId: null, packageName: '' })}
                onConfirm={confirmDelete}
                title="Delete Package"
                message={`Are you sure you want to delete "${deleteModal.packageName}"? This action cannot be undone and will affect any albums using this pricing package.`}
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
            />

            <style>{`
                .packages-settings-container {
                    padding: 2.5rem 2rem;
                    max-width: 1100px;
                    margin: 0 auto;
                    min-height: 90vh;
                }

                .packages-header {
                    margin-bottom: 2.5rem;
                }

                .back-btn {
                    margin-bottom: 1.5rem;
                    font-size: 0.85rem !important;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .header-main h1 {
                    font-size: 2.25rem;
                    font-weight: 800;
                    margin-bottom: 0.5rem;
                    letter-spacing: -0.02em;
                }

                .header-main p {
                    color: var(--text-secondary);
                    font-size: 1.1rem;
                }

                .action-bar {
                    margin-bottom: 2rem;
                }

                .create-btn {
                    gap: 0.5rem;
                    background-color: #F5A623 !important;
                    border-color: #F5A623 !important;
                    color: white !important;
                }

                .create-btn:hover {
                    background-color: #e59512 !important;
                    box-shadow: 0 4px 12px rgba(245, 166, 35, 0.3);
                }

                .packages-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: 1.5rem;
                }

                .package-card {
                    background: white;
                    border: 1px solid var(--border-subtle);
                    border-radius: 16px;
                    padding: 1.5rem;
                    box-shadow: var(--shadow-sm);
                    transition: all 0.2s ease;
                }

                .package-card:hover {
                    box-shadow: var(--shadow-md);
                    transform: translateY(-2px);
                }

                .package-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 1.5rem;
                }

                .package-identity h3 {
                    font-size: 1.1rem;
                    font-weight: 700;
                    margin-bottom: 0.5rem;
                }

                .type-tag {
                    font-size: 0.65rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    padding: 0.25rem 0.6rem;
                    border-radius: 6px;
                    letter-spacing: 0.02em;
                }

                .type-tag.digital {
                    background: #e0f2fe;
                    color: #0369a1;
                }

                .type-tag.physical {
                    background: #fef3c7;
                    color: #92400e;
                }

                .delete-icon-btn {
                    background: transparent;
                    border: none;
                    color: #94a3b8;
                    cursor: pointer;
                    padding: 0.5rem;
                    border-radius: 8px;
                    transition: all 0.2s;
                }

                .delete-icon-btn:hover {
                    background: #fef2f2;
                    color: #ef4444;
                }

                .package-tiers {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }

                .tier-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    align-items: center;
                    font-size: 0.9rem;
                    padding-bottom: 0.5rem;
                    border-bottom: 1px solid #f1f5f9;
                }

                .tier-row:last-child {
                    border-bottom: none;
                }

                .tier-qty {
                    color: var(--text-secondary);
                    font-weight: 500;
                }

                .tier-price {
                    color: #64748b;
                    text-align: center;
                }

                .tier-total {
                    font-weight: 700;
                    color: var(--text-primary);
                    text-align: right;
                }

                .empty-packages {
                    text-align: center;
                    padding: 4rem 2rem;
                    background: #f8fafc;
                    border: 2px dashed #e2e8f0;
                    border-radius: 20px;
                    color: #94a3b8;
                }

                .empty-packages h3 {
                    margin-top: 1rem;
                    color: #64748b;
                }

                /* Create Form Styles */
                .create-package-card {
                    background: white;
                    border: 1px solid var(--border-subtle);
                    border-radius: 20px;
                    padding: 2.5rem;
                    box-shadow: var(--shadow-lg);
                }

                .card-header {
                    margin-bottom: 2.5rem;
                    border-bottom: 1px solid #f1f5f9;
                    padding-bottom: 1.5rem;
                }

                .card-header h2 {
                    font-size: 1.5rem;
                    font-weight: 800;
                    margin-bottom: 0.5rem;
                }

                .helper-text {
                    color: var(--text-tertiary);
                    font-size: 0.95rem;
                }

                .form-section {
                    margin-bottom: 2rem;
                }

                .section-label {
                    display: block;
                    font-size: 0.7rem;
                    font-weight: 800;
                    color: var(--text-tertiary);
                    margin-bottom: 1rem;
                    letter-spacing: 0.05em;
                }

                .type-selector {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1.5rem;
                }

                .type-option {
                    border: 2px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 1.25rem;
                    cursor: pointer;
                    display: flex;
                    align-items: flex-start;
                    gap: 1rem;
                    transition: all 0.2s;
                }

                .type-option:hover {
                    border-color: var(--primary-blue-light);
                    background: #f8fafc;
                }

                .type-option.active {
                    border-color: var(--primary-blue);
                    background: #eff6ff;
                }

                .option-content strong {
                    display: block;
                    color: var(--text-primary);
                    margin-bottom: 0.25rem;
                }

                .option-content span {
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                }

                .pricing-config-grid {
                    display: grid;
                    grid-template-columns: 1fr 380px;
                    gap: 3rem;
                    margin-top: 2rem;
                    border-top: 1px dashed #e2e8f0;
                    padding-top: 2rem;
                }

                .tiers-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .tier-input-group {
                    display: flex;
                    gap: 1rem;
                    align-items: flex-end;
                }

                .input-col {
                    display: flex;
                    flex-direction: column;
                    gap: 0.4rem;
                }

                .input-col.grow { flex: 1; }

                .input-sublabel {
                    font-size: 0.65rem;
                    font-weight: 700;
                    color: var(--text-tertiary);
                    text-transform: uppercase;
                }

                .modern-input {
                    padding: 0.75rem;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    font-size: 0.95rem;
                    width: 100%;
                }

                .qty-input { width: 80px; text-align: center; }

                .remove-tier-btn {
                    padding: 0.75rem;
                    color: #94a3b8;
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    border-radius: 8px;
                    transition: all 0.2s;
                }

                .remove-tier-btn:hover {
                    color: #ef4444;
                    background: #fef2f2;
                }

                .add-tier-btn {
                    margin-top: 1rem;
                    width: 100%;
                    border-style: dashed !important;
                    font-size: 0.85rem !important;
                    gap: 0.5rem;
                }

                .preview-container {
                    background: #f8fafc;
                    border-radius: 16px;
                    padding: 1.5rem;
                    position: sticky;
                    top: 2rem;
                    border: 1px solid #e2e8f0;
                }

                .preview-header {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    color: var(--text-primary);
                    margin-bottom: 1.5rem;
                }

                .preview-header h4 { font-weight: 700; }

                .preview-grid {
                    background: white;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    overflow: hidden;
                    margin-bottom: 1.5rem;
                }

                .grid-header {
                    display: flex;
                    justify-content: space-between;
                    background: #f1f5f9;
                    padding: 0.75rem 1rem;
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #64748b;
                    text-transform: uppercase;
                }

                .grid-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 0.75rem 1rem;
                    border-bottom: 1px solid #f1f5f9;
                }

                .grid-row:last-child { border-bottom: none; }

                .qty-col { font-weight: 500; font-size: 0.9rem; }

                .price-col { text-align: right; display: flex; flex-direction: column; }
                .price-col strong { color: var(--primary-blue); font-size: 1rem; }
                .price-col small { font-size: 0.7rem; color: #94a3b8; }

                .preview-footer {
                    display: flex;
                    gap: 0.5rem;
                    font-size: 0.75rem;
                    color: #64748b;
                    line-height: 1.4;
                }

                .form-actions {
                    display: flex;
                    gap: 1rem;
                    margin-top: 3rem;
                    padding-top: 2rem;
                    border-top: 1px solid #f1f5f9;
                    justify-content: flex-end;
                }
                
                .save-btn {
                    min-width: 200px;
                    background-color: #F5A623 !important;
                    border-color: #F5A623 !important;
                    color: white !important;
                }

                .save-btn:hover {
                    background-color: #e59512 !important;
                    box-shadow: 0 4px 12px rgba(245, 166, 35, 0.3);
                }

                @media (max-width: 900px) {
                    .pricing-config-grid {
                        grid-template-columns: 1fr;
                        gap: 2rem;
                    }
                    .preview-container {
                        position: static;
                    }
                }

                @media (max-width: 640px) {
                    .packages-settings-container {
                        padding: 1.5rem 1.25rem;
                    }
                    .header-main h1 { font-size: 1.75rem; }
                    .header-main p { font-size: 0.95rem; }
                    .type-selector {
                        grid-template-columns: 1fr;
                        gap: 1rem;
                    }
                    .create-package-card {
                        padding: 1.5rem;
                    }
                    .form-actions {
                        flex-direction: column;
                    }
                    .form-actions button {
                        width: 100%;
                    }
                    .tier-input-group {
                        gap: 0.5rem;
                    }
                    .qty-input { width: 65px; }
                }

                @media (max-width: 430px) {
                    .packages-settings-container {
                        padding: 1rem 1rem;
                    }
                    .package-card {
                        padding: 1rem;
                    }
                    .tier-row {
                        grid-template-columns: 1fr auto auto;
                        gap: 0.5rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default PackageSettings;
