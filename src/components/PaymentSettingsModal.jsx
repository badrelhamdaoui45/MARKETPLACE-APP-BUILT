import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Landmark, Save, X, Plus, Trash2, Upload, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';

const PaymentSettingsModal = ({ isOpen, onClose, profile, onSave }) => {
    const [enabled, setEnabled] = useState(profile?.bank_transfer_enabled || false);
    const [details, setDetails] = useState(profile?.bank_details || '');
    const [bankAccounts, setBankAccounts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(null);

    useEffect(() => {
        if (!profile?.bank_accounts || profile.bank_accounts.length === 0) {
            // Migrate legacy data if it exists
            if (profile?.bank_name) {
                setBankAccounts([{
                    id: Date.now().toString(),
                    bank_name: profile.bank_name,
                    account_holder: profile.account_holder || '',
                    bank_code: profile.bank_code || '',
                    account_number: profile.account_number || '',
                    rib: profile.rib || '',
                    logo_url: ''
                }]);
            } else {
                setBankAccounts([]);
            }
        } else {
            setBankAccounts(profile.bank_accounts);
        }
    }, [profile]);

    const handleSave = async () => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('photographer_private_data')
                .upsert({
                    id: profile.id,
                    bank_transfer_enabled: enabled,
                    bank_details: details,
                    bank_accounts: bankAccounts,
                    // Legacy fallback
                    bank_name: bankAccounts.length > 0 ? bankAccounts[0].bank_name : null,
                    account_holder: bankAccounts.length > 0 ? bankAccounts[0].account_holder : null,
                    bank_code: bankAccounts.length > 0 ? bankAccounts[0].bank_code : null,
                    account_number: bankAccounts.length > 0 ? bankAccounts[0].account_number : null,
                    rib: bankAccounts.length > 0 ? bankAccounts[0].rib : null,
                });

            if (error) throw error;
            onSave({
                bank_transfer_enabled: enabled,
                bank_details: details,
                bank_accounts: bankAccounts,
                bank_name: bankAccounts.length > 0 ? bankAccounts[0].bank_name : null,
                account_holder: bankAccounts.length > 0 ? bankAccounts[0].account_holder : null,
                bank_code: bankAccounts.length > 0 ? bankAccounts[0].bank_code : null,
                account_number: bankAccounts.length > 0 ? bankAccounts[0].account_number : null,
                rib: bankAccounts.length > 0 ? bankAccounts[0].rib : null,
            });
            onClose();
        } catch (error) {
            console.error('Error saving payment settings:', error);
            alert('Failed to save settings.');
        } finally {
            setLoading(false);
        }
    };

    const addAccount = () => {
        setBankAccounts([...bankAccounts, {
            id: Date.now().toString(),
            bank_name: '',
            account_holder: '',
            bank_code: '',
            account_number: '',
            rib: '',
            logo_url: ''
        }]);
    };

    const updateAccount = (index, field, value) => {
        const newAccounts = [...bankAccounts];
        newAccounts[index][field] = value;
        setBankAccounts(newAccounts);
    };

    const removeAccount = (index) => {
        setBankAccounts(bankAccounts.filter((_, i) => i !== index));
    };

    const handleLogoUpload = async (index, file) => {
        if (!file) return;
        try {
            setUploadingLogo(index);
            const fileExt = file.name.split('.').pop();
            const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('bank-logos')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('bank-logos')
                .getPublicUrl(filePath);

            const newAccounts = [...bankAccounts];
            newAccounts[index].logo_url = publicUrl;
            setBankAccounts(newAccounts);
        } catch (err) {
            console.error("Upload error", err);
            alert("Failed to upload logo. Make sure the 'bank-logos' bucket exists and has correct policies.");
        } finally {
            setUploadingLogo(null);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Payment Options" showFooter={false}>
            <div className="payment-settings-content">
                <div className="settings-section">
                    <div className="toggle-group">
                        <div className="toggle-info">
                            <h3>Bank Transfer (Manual)</h3>
                            <p>Allow buyers to pay directly to your bank accounts.</p>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={enabled}
                                onChange={(e) => setEnabled(e.target.checked)}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>
                </div>

                {enabled && (
                    <div className="details-section fade-in">
                        {bankAccounts.map((account, index) => (
                            <div key={account.id} className="bank-account-card">
                                <div className="bank-account-header">
                                    <h4>Bank #{index + 1}</h4>
                                    <button 
                                        className="remove-btn" 
                                        onClick={() => removeAccount(index)}
                                        title="Remove Bank"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                
                                <div className="logo-upload-section">
                                    <div className="logo-preview">
                                        {account.logo_url ? (
                                            <img src={account.logo_url} alt="Bank Logo" />
                                        ) : (
                                            <div className="logo-placeholder"><Landmark size={24} /></div>
                                        )}
                                    </div>
                                    <div className="upload-controls">
                                        <label className="upload-btn">
                                            {uploadingLogo === index ? <Loader size={16} className="spinner" /> : <Upload size={16} />}
                                            {uploadingLogo === index ? 'Uploading...' : 'Upload Custom Logo'}
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                hidden 
                                                onChange={(e) => handleLogoUpload(index, e.target.files[0])} 
                                                disabled={uploadingLogo === index}
                                            />
                                        </label>
                                        <p>Recommended size: 200x200px (PNG or SVG)</p>
                                    </div>
                                </div>

                                <div className="input-row">
                                    <div className="input-field">
                                        <label>Bank Name</label>
                                        <input
                                            type="text"
                                            value={account.bank_name}
                                            onChange={(e) => updateAccount(index, 'bank_name', e.target.value)}
                                            placeholder="ex: CIH Bank"
                                            className="settings-input"
                                        />
                                    </div>
                                    <div className="input-field">
                                        <label>Account Holder</label>
                                        <input
                                            type="text"
                                            value={account.account_holder}
                                            onChange={(e) => updateAccount(index, 'account_holder', e.target.value)}
                                            placeholder="Full name"
                                            className="settings-input"
                                        />
                                    </div>
                                </div>

                                <div className="input-row">
                                    <div className="input-field">
                                        <label>Bank Code / Sort Code</label>
                                        <input
                                            type="text"
                                            value={account.bank_code}
                                            onChange={(e) => updateAccount(index, 'bank_code', e.target.value)}
                                            placeholder="BANK CODE"
                                            className="settings-input"
                                        />
                                    </div>
                                    <div className="input-field">
                                        <label>Account Number</label>
                                        <input
                                            type="text"
                                            value={account.account_number}
                                            onChange={(e) => updateAccount(index, 'account_number', e.target.value)}
                                            placeholder="ACCOUNT NUMBER"
                                            className="settings-input"
                                        />
                                    </div>
                                </div>

                                <div className="input-field">
                                    <label>RIB / IBAN / Swift</label>
                                    <input
                                        type="text"
                                        value={account.rib}
                                        onChange={(e) => updateAccount(index, 'rib', e.target.value)}
                                        placeholder="IBAN / Swift"
                                        className="settings-input"
                                    />
                                </div>
                            </div>
                        ))}

                        <Button 
                            variant="outline" 
                            className="add-bank-btn" 
                            onClick={addAccount}
                        >
                            <Plus size={16} /> Add Another Bank
                        </Button>

                        <div className="input-field mt-4">
                            <label>General Instructions (optional)</label>
                            <textarea
                                value={details}
                                onChange={(e) => setDetails(e.target.value)}
                                placeholder="Other instructions that apply to all banks..."
                                className="settings-textarea"
                                rows={3}
                            />
                        </div>
                        <p className="hint-text">
                            This information will be displayed to buyers when they choose Bank Transfer.
                        </p>
                    </div>
                )}

                <div className="modal-actions">
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={loading} className="save-btn">
                        {loading ? 'Saving...' : 'Save'}
                    </Button>
                </div>
            </div>

            <style>{`
                .payment-settings-content {
                    padding: 1rem 0;
                    max-height: 70vh;
                    overflow-y: auto;
                    padding-right: 0.5rem;
                }

                .settings-section {
                    margin-bottom: 1.5rem;
                    padding-bottom: 1.5rem;
                    border-bottom: 1px solid #eef2f6;
                }

                .toggle-group {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 2rem;
                }

                .toggle-info h3 {
                    font-size: 1.1rem;
                    font-weight: 700;
                    margin-bottom: 0.25rem;
                    color: #1e293b;
                }

                .toggle-info p {
                    font-size: 0.9rem;
                    color: #64748b;
                }

                .details-section {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }
                
                .bank-account-card {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 1.25rem;
                    margin-bottom: 1rem;
                    position: relative;
                }
                
                .bank-account-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                    border-bottom: 1px dashed #cbd5e1;
                    padding-bottom: 0.5rem;
                }
                
                .bank-account-header h4 {
                    font-size: 0.95rem;
                    font-weight: 700;
                    color: #334155;
                    margin: 0;
                }
                
                .remove-btn {
                    background: none;
                    border: none;
                    color: #ef4444;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .remove-btn:hover {
                    background: #fee2e2;
                }
                
                .logo-upload-section {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    margin-bottom: 1rem;
                }
                
                .logo-preview {
                    width: 60px;
                    height: 60px;
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                }
                
                .logo-preview img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    padding: 4px;
                }
                
                .logo-placeholder {
                    color: #cbd5e1;
                }
                
                .upload-controls {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }
                
                .upload-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: white;
                    border: 1px solid #cbd5e1;
                    padding: 0.4rem 0.75rem;
                    border-radius: 6px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: #475569;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .upload-btn:hover {
                    background: #f1f5f9;
                    border-color: #94a3b8;
                }
                
                .upload-controls p {
                    margin: 0;
                    font-size: 0.7rem;
                    color: #94a3b8;
                }
                
                .add-bank-btn {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    padding: 0.75rem;
                    border-style: dashed !important;
                }

                .details-section label {
                    font-size: 0.85rem;
                    font-weight: 700;
                    color: #475569;
                    margin-bottom: 0.5rem;
                    display: block;
                }

                .input-row {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 1rem;
                }

                .input-field {
                    flex: 1;
                    margin-bottom: 1rem;
                }

                .settings-input {
                    width: 100%;
                    padding: 0.75rem 1rem;
                    border-radius: 10px;
                    border: 2px solid #e2e8f0;
                    font-size: 0.9rem;
                    transition: all 0.2s;
                }

                .settings-input:focus {
                    outline: none;
                    border-color: #F5A623;
                    background: #fff;
                }

                .settings-textarea {
                    width: 100%;
                    padding: 1rem;
                    border-radius: 12px;
                    border: 2px solid #e2e8f0;
                    font-size: 0.95rem;
                    resize: vertical;
                    transition: border-color 0.2s;
                }

                .settings-textarea:focus {
                    outline: none;
                    border-color: #F5A623;
                }

                .hint-text {
                    font-size: 0.8rem;
                    color: #94a3b8;
                    font-style: italic;
                    margin-top: -0.5rem;
                }

                .modal-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 1rem;
                    margin-top: 1rem;
                    padding-top: 1.5rem;
                    border-top: 1px solid #eef2f6;
                }

                .save-btn {
                    background: #F5A623 !important;
                    border-color: #F5A623 !important;
                    color: white !important;
                    font-weight: 700 !important;
                    padding: 0.75rem 2rem !important;
                    border-radius: 12px !important;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
                }

                .save-btn:hover {
                    background: #e69512 !important;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(245, 166, 35, 0.3);
                }

                .save-btn:active {
                    transform: translateY(0);
                }

                /* Switch/Toggle styles */
                .switch {
                    position: relative;
                    display: inline-block;
                    width: 50px;
                    height: 26px;
                    flex-shrink: 0;
                }

                .switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }

                .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #cbd5e1;
                    transition: .4s;
                }

                .slider:before {
                    position: absolute;
                    content: "";
                    height: 18px;
                    width: 18px;
                    left: 4px;
                    bottom: 4px;
                    background-color: white;
                    transition: .4s;
                }

                input:checked + .slider {
                    background-color: #F5A623;
                }

                input:focus + .slider {
                    box-shadow: 0 0 1px #F5A623;
                }

                input:checked + .slider:before {
                    transform: translateX(24px);
                }

                .slider.round {
                    border-radius: 34px;
                }

                .slider.round:before {
                    border-radius: 50%;
                }

                .fade-in {
                    animation: fadeIn 0.3s ease-out;
                }

                .spinner {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </Modal>
    );
};

export default PaymentSettingsModal;
