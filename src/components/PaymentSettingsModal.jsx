
import React, { useState } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Landmark, Save, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

const PaymentSettingsModal = ({ isOpen, onClose, profile, onSave }) => {
    const [enabled, setEnabled] = useState(profile?.bank_transfer_enabled || false);
    const [details, setDetails] = useState(profile?.bank_details || '');
    const [bankName, setBankName] = useState(profile?.bank_name || '');
    const [accountHolder, setAccountHolder] = useState(profile?.account_holder || '');
    const [bankCode, setBankCode] = useState(profile?.bank_code || '');
    const [accountNumber, setAccountNumber] = useState(profile?.account_number || '');
    const [rib, setRib] = useState(profile?.rib || '');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    bank_transfer_enabled: enabled,
                    bank_details: details,
                    bank_name: bankName,
                    account_holder: accountHolder,
                    bank_code: bankCode,
                    account_number: accountNumber,
                    rib: rib
                })
                .eq('id', profile.id);

            if (error) throw error;
            onSave({
                bank_transfer_enabled: enabled,
                bank_details: details,
                bank_name: bankName,
                account_holder: accountHolder,
                bank_code: bankCode,
                account_number: accountNumber,
                rib: rib
            });
            onClose();
        } catch (error) {
            console.error('Error saving payment settings:', error);
            alert('Failed to save settings.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Options de Paiement" showFooter={false}>
            <div className="payment-settings-content">
                <div className="settings-section">
                    <div className="toggle-group">
                        <div className="toggle-info">
                            <h3>Virement Bancaire (Manuel)</h3>
                            <p>Permettre aux acheteurs de payer directement sur votre compte bancaire.</p>
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
                        <div className="input-row">
                            <div className="input-field">
                                <label>Nom de la Banque</label>
                                <input
                                    type="text"
                                    value={bankName}
                                    onChange={(e) => setBankName(e.target.value)}
                                    placeholder="ex: BNP Paribas"
                                    className="settings-input"
                                />
                            </div>
                            <div className="input-field">
                                <label>Titulaire du compte</label>
                                <input
                                    type="text"
                                    value={accountHolder}
                                    onChange={(e) => setAccountHolder(e.target.value)}
                                    placeholder="Nom complet"
                                    className="settings-input"
                                />
                            </div>
                        </div>

                        <div className="input-row">
                            <div className="input-field">
                                <label>Code Banque / Sort Code</label>
                                <input
                                    type="text"
                                    value={bankCode}
                                    onChange={(e) => setBankCode(e.target.value)}
                                    placeholder="BANK CODE"
                                    className="settings-input"
                                />
                            </div>
                            <div className="input-field">
                                <label>Numéro de Compte</label>
                                <input
                                    type="text"
                                    value={accountNumber}
                                    onChange={(e) => setAccountNumber(e.target.value)}
                                    placeholder="ACCOUNT NUMBER"
                                    className="settings-input"
                                />
                            </div>
                        </div>

                        <div className="input-field">
                            <label>RIB / IBAN / Swift</label>
                            <input
                                type="text"
                                value={rib}
                                onChange={(e) => setRib(e.target.value)}
                                placeholder="IBAN / Swift"
                                className="settings-input"
                            />
                        </div>

                        <div className="input-field">
                            <label>Instructions supplémentaires (optionnel)</label>
                            <textarea
                                value={details}
                                onChange={(e) => setDetails(e.target.value)}
                                placeholder="Autres instructions..."
                                className="settings-textarea"
                                rows={3}
                            />
                        </div>
                        <p className="hint-text">
                            Ces informations seront affichées aux acheteurs qui choisissent ce mode de paiement.
                        </p>
                    </div>
                )}

                <div className="modal-actions">
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Annuler
                    </Button>
                    <Button onClick={handleSave} disabled={loading} className="save-btn">
                        {loading ? 'Sauvegarde...' : 'Enregistrer'}
                    </Button>
                </div>
            </div>

            <style>{`
                .payment-settings-content {
                    padding: 1rem 0;
                }

                .settings-section {
                    margin-bottom: 2rem;
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
                    margin-top: 2rem;
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

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </Modal>
    );
};

export default PaymentSettingsModal;
