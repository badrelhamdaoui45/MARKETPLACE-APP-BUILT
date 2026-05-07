import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { CreditCard, User, Mail, ShieldCheck, CheckCircle, ArrowRight, Lock, LogIn, UserPlus, Landmark, Copy, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { useAuth } from '../context/AuthContext';
import { getBankLogoUrl } from '../utils/banks';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const CheckoutModal = ({ isOpen, onClose, onConfirm, totalAmount, isLoading, photographerId, isFree }) => {
    const { user, signIn, signUp } = useAuth();
    const [step, setStep] = useState(1);
    const [authMode, setAuthMode] = useState('signup'); // 'login' or 'signup'
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: ''
    });
    const [clientSecret, setClientSecret] = useState(null);
    const [initializingPayment, setInitializingPayment] = useState(false);
    const [authError, setAuthError] = useState('');
    const [authMethod, setAuthMethod] = useState('email'); // 'email' or 'phone'
    const [countryCode, setCountryCode] = useState('+212');
    const [paymentMethod, setPaymentMethod] = useState('stripe'); // 'stripe' or 'bank_transfer'
    const [photographerSettings, setPhotographerSettings] = useState(null);
    const [copied, setCopied] = useState(false);
    const [confirmedTransfer, setConfirmedTransfer] = useState(false);
    const [selectedBankIndex, setSelectedBankIndex] = useState(0);

    const effectivelyFree = isFree || parseFloat(totalAmount) === 0;

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                email: user.email,
                fullName: user.user_metadata?.full_name || ''
            }));
        }
        if (isOpen && photographerId) {
            fetchPhotographerSettings();
        }
    }, [user, isOpen, photographerId]);

    const fetchPhotographerSettings = async () => {
        try {
            const { data, error } = await supabase.functions.invoke('stripe-service', {
                body: {
                    action: 'get-bank-details',
                    payload: { photographerId }
                }
            });

            if (error) throw error;
            setPhotographerSettings(data);
        } catch (error) {
            console.error("Error fetching photographer settings:", error);
        }
    };

    const handleCopyDetails = (text, fieldId) => {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            setCopied(fieldId);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setAuthError('');
    };

    const { signInWithPhonePassword, signUpWithPhone } = useAuth();

    const handleAuthAction = async () => {
        setAuthError('');
        setInitializingPayment(true);

        try {
            if (!user) {
                if (authMethod === 'phone') {
                    if (!formData.phone || !formData.password) throw new Error("Please enter phone and password.");
                    if (authMode === 'signup' && !formData.fullName) throw new Error("Please enter your full name.");
                    
                    const fullPhoneNumber = countryCode + formData.phone.replace(/^0+/, '');
                    
                    if (authMode === 'login') {
                        const { error } = await signInWithPhonePassword(fullPhoneNumber, formData.password);
                        if (error) throw error;
                    } else {
                        const { error } = await signUpWithPhone(fullPhoneNumber, formData.password, formData.fullName, 'runner');
                        if (error) throw error;
                    }
                } else {
                    if (authMode === 'login') {
                        if (!formData.email || !formData.password) throw new Error("Please enter email and password.");
                        const { error } = await signIn(formData.email, formData.password);
                        if (error) throw error;
                    } else {
                        if (!formData.email || !formData.password || !formData.fullName) throw new Error("Please fill in all fields.");
                        const { error } = await signUp(formData.email, formData.password, formData.fullName, 'runner');
                        if (error) throw error;
                    }
                }
            }

            // Move to Step 2 (or Final if Free)
            if (effectivelyFree) {
                setPaymentMethod('free');
                setStep(3); // Skip Step 2 entirely
            } else {
                setStep(2);
            }

        } catch (error) {
            console.error("Authentication Error:", error);
            setAuthError(error.message || "An error occurred.");
        } finally {
            setInitializingPayment(false);
        }
    };

    const handleFinalConfirm = async () => {
        setInitializingPayment(true);
        try {
            const result = await onConfirm({
                fullName: formData.fullName,
                email: formData.email,
                paymentMethod: paymentMethod
            });

            if (paymentMethod === 'stripe' && result) {
                setClientSecret(result);
                setStep(3);
            } else if (paymentMethod === 'bank_transfer') {
                setStep(3); // Just show instructions first
            }
        } catch (error) {
            setAuthError(error.message);
        } finally {
            setInitializingPayment(false);
        }
    };

    const handleManualConfirm = async () => {
        setInitializingPayment(true);
        try {
            const result = await onConfirm({
                fullName: formData.fullName,
                email: formData.email,
                paymentMethod: paymentMethod,
                confirmedTransfer: true
            });
        } catch (error) {
            setAuthError(error.message);
        } finally {
            setInitializingPayment(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="checkout-modal-overlay">
            <div className="checkout-modal-container">
                <button className="close-btn" onClick={onClose}>&times;</button>

                <div className="checkout-header">
                    <h2>Secure Checkout</h2>
                    <div className="step-indicator">
                        <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
                            <div className="step-circle">{step > 1 ? <CheckCircle size={16} /> : '1'}</div>
                            <span>Account</span>
                        </div>
                        <div className="step-line"></div>
                        <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
                            <div className="step-circle">{step > 2 ? <CheckCircle size={16} /> : '2'}</div>
                            <span>Method</span>
                        </div>
                        <div className="step-line"></div>
                        <div className={`step ${step >= 3 ? 'active' : ''}`}>
                            <div className="step-circle">3</div>
                            <span>Finish</span>
                        </div>
                    </div>
                </div>

                <div className="checkout-body">
                    {step === 1 ? (
                        <div className="step-content fade-in">
                            {!user && (
                                <div className="auth-tabs">
                                    <button
                                        className={`auth-tab ${authMode === 'signup' ? 'active' : ''}`}
                                        onClick={() => setAuthMode('signup')}
                                    >
                                        <UserPlus size={16} /> Create Account
                                    </button>
                                    <button
                                        className={`auth-tab ${authMode === 'login' ? 'active' : ''}`}
                                        onClick={() => setAuthMode('login')}
                                    >
                                        <LogIn size={16} /> Login
                                    </button>
                                </div>
                            )}

                            <h3 className="step-title">
                                {user ? `Welcome back, ${formData.fullName || 'User'}` : (authMode === 'login' ? 'Log in to continue' : 'Create your account')}
                            </h3>
                            <div className="step-desc">
                                {user ? 'Confirm your details to proceed.' : 'You need an account to access your photos securely.'}
                                {effectivelyFree && <div style={{ color: '#10b981', fontWeight: '700', marginTop: '0.5rem' }}>This album is 100% Free!</div>}
                            </div>

                            {authError && <div className="error-message">{authError}</div>}

                            {!user && (
                                <div className="auth-method-switcher" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: '8px' }}>
                                    <button 
                                        className={`method-btn ${authMethod === 'email' ? 'active' : ''}`}
                                        onClick={() => setAuthMethod('email')}
                                        style={{ flex: 1, padding: '0.5rem', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', background: authMethod === 'email' ? 'white' : 'transparent', color: authMethod === 'email' ? '#1e293b' : '#64748b', boxShadow: authMethod === 'email' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
                                    >
                                        Email
                                    </button>
                                    <button 
                                        className={`method-btn ${authMethod === 'phone' ? 'active' : ''}`}
                                        onClick={() => setAuthMethod('phone')}
                                        style={{ flex: 1, padding: '0.5rem', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', background: authMethod === 'phone' ? 'white' : 'transparent', color: authMethod === 'phone' ? '#1e293b' : '#64748b', boxShadow: authMethod === 'phone' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
                                    >
                                        Phone
                                    </button>
                                </div>
                            )}

                            {!user && authMode === 'signup' && (
                                <div className="form-group">
                                    <label>Full Name</label>
                                    <div className="input-wrapper">
                                        <User size={18} className="input-icon" />
                                        <input
                                            type="text"
                                            name="fullName"
                                            placeholder="John Doe"
                                            value={formData.fullName}
                                            onChange={handleInputChange}
                                            className="checkout-input"
                                        />
                                    </div>
                                </div>
                            )}

                            {authMethod === 'email' ? (
                                <div className="form-group">
                                    <label>Email Address</label>
                                    <div className="input-wrapper">
                                        <Mail size={18} className="input-icon" />
                                        <input
                                            type="email"
                                            name="email"
                                            placeholder="john@example.com"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            className="checkout-input"
                                            disabled={!!user} // Disable if logged in
                                        />
                                    </div>
                                </div>
                            ) : !user && (
                                <div className="form-group">
                                    <label>Phone Number</label>
                                    <div className="phone-input-row" style={{ display: 'flex', gap: '0.5rem' }}>
                                        <select 
                                            className="country-code-select-checkout"
                                            value={countryCode}
                                            onChange={(e) => setCountryCode(e.target.value)}
                                            style={{ width: '100px', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', background: '#f8fafc' }}
                                        >
                                            <option value="+212">+212 (MA)</option>
                                            <option value="+33">+33 (FR)</option>
                                            <option value="+1">+1 (US)</option>
                                            <option value="+44">+44 (UK)</option>
                                        </select>
                                        <input
                                            type="tel"
                                            name="phone"
                                            placeholder="612345678"
                                            value={formData.phone || ''}
                                            onChange={handleInputChange}
                                            className="checkout-input phone-field"
                                            style={{ flex: 1, paddingLeft: '1rem' }}
                                        />
                                    </div>
                                </div>
                            )}

                            {!user && (
                                <div className="form-group">
                                    <label>Password</label>
                                    <div className="input-wrapper">
                                        <Lock size={18} className="input-icon" />
                                        <input
                                            type="password"
                                            name="password"
                                            placeholder="••••••••"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            className="checkout-input"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : step === 2 ? (
                        <div className="step-content fade-in">
                            <h3 className="step-title">Choose Payment Method</h3>
                            <p className="step-desc">Select how you would like to pay for your photos.</p>

                            <div className="payment-options">
                                <div
                                    className={`payment-option ${paymentMethod === 'stripe' ? 'active' : ''}`}
                                    onClick={() => setPaymentMethod('stripe')}
                                >
                                    <div className="option-icon"><CreditCard size={24} /></div>
                                    <div className="option-text">
                                        <h4>Credit Card</h4>
                                        <p>Secure payment via Stripe</p>
                                    </div>
                                    <div className="option-check">{paymentMethod === 'stripe' && <CheckCircle size={20} />}</div>
                                </div>

                                {photographerSettings?.bank_transfer_enabled && (
                                    <div
                                        className={`payment-option ${paymentMethod === 'bank_transfer' ? 'active' : ''}`}
                                        onClick={() => setPaymentMethod('bank_transfer')}
                                    >
                                        <div className="option-icon"><Landmark size={24} /></div>
                                        <div className="option-text">
                                            <h4>Bank Transfer</h4>
                                            <p>Direct payment to photographer</p>
                                        </div>
                                        <div className="option-check">{paymentMethod === 'bank_transfer' && <CheckCircle size={20} />}</div>
                                    </div>
                                )}
                            </div>

                            <div className="total-indicator">
                                <span>Total to pay:</span>
                                <strong>${totalAmount}</strong>
                            </div>
                        </div>
                    ) : (
                        <div className="step-content fade-in">
                            {paymentMethod === 'stripe' ? (
                                <div className="stripe-container">
                                    {clientSecret && (
                                        <EmbeddedCheckoutProvider
                                            stripe={stripePromise}
                                            options={{ clientSecret }}
                                        >
                                            <EmbeddedCheckout />
                                        </EmbeddedCheckoutProvider>
                                    )}
                                </div>
                            ) : paymentMethod === 'free' ? (
                                <div className="free-checkout-finish" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                                    <div className="success-icon" style={{ color: '#10b981', marginBottom: '1.5rem' }}>
                                        <CheckCircle size={64} strokeWidth={1.5} />
                                    </div>
                                    <h3 className="step-title">Your Photos are Ready!</h3>
                                    <p className="step-desc">
                                        Since this album is free, you can unlock these photos instantly and add them to your collection.
                                    </p>
                                </div>
                            ) : (
                                <div className="bank-transfer-instructions">
                                    <div className="instruction-header">
                                        <Landmark size={32} className="header-icon" />
                                        <h3>Virement Bancaire</h3>
                                    </div>
                                    <div className="bank-details-container">
                                        {photographerSettings?.bank_accounts && photographerSettings.bank_accounts.length > 0 ? (
                                            <div className="bank-accounts-selection">
                                                <div className="bank-accounts-dropdown-container" style={{ marginBottom: '1.5rem' }}>
                                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Choose Bank to Transfer To</label>
                                                    <div className="custom-bank-select" style={{ position: 'relative' }}>
                                                        <select 
                                                            value={selectedBankIndex} 
                                                            onChange={(e) => setSelectedBankIndex(Number(e.target.value))}
                                                            style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', appearance: 'none', background: '#fff', fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', cursor: 'pointer' }}
                                                        >
                                                            {photographerSettings.bank_accounts.map((acc, idx) => (
                                                                <option key={idx} value={idx}>{acc.bank_name || `Bank Option ${idx + 1}`}</option>
                                                            ))}
                                                        </select>
                                                        <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                                                            {photographerSettings.bank_accounts[selectedBankIndex]?.logo_url ? (
                                                                <img src={photographerSettings.bank_accounts[selectedBankIndex].logo_url} alt="Bank Logo" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                                                            ) : (
                                                                getBankLogoUrl(photographerSettings.bank_accounts[selectedBankIndex]?.bank_name) ? (
                                                                    <img src={getBankLogoUrl(photographerSettings.bank_accounts[selectedBankIndex].bank_name)} alt="Bank Logo" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                                                                ) : (
                                                                    <Landmark size={18} color="#64748b" />
                                                                )
                                                            )}
                                                        </div>
                                                        <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                                            <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1.5L6 6.5L11 1.5" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                                        </div>
                                                    </div>
                                                </div>

                                                {(() => {
                                                    const account = photographerSettings.bank_accounts[selectedBankIndex];
                                                    if (!account) return null;
                                                    return (
                                                        <div className="bank-details-grid">
                                                            {account.bank_name && (
                                                                <div className="bank-detail-item">
                                                                    <label>Banque</label>
                                                                    <div className="detail-value-box">
                                                                        <span>{account.bank_name}</span>
                                                                        <button className="copy-btn-mini" onClick={() => handleCopyDetails(account.bank_name, 'bank_name')}>
                                                                            {copied === 'bank_name' ? <Check size={14} /> : <Copy size={14} />}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {account.account_holder && (
                                                                <div className="bank-detail-item">
                                                                    <label>Titulaire</label>
                                                                    <div className="detail-value-box">
                                                                        <span>{account.account_holder}</span>
                                                                        <button className="copy-btn-mini" onClick={() => handleCopyDetails(account.account_holder, 'account_holder')}>
                                                                            {copied === 'account_holder' ? <Check size={14} /> : <Copy size={14} />}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {account.bank_code && (
                                                                <div className="bank-detail-item">
                                                                    <label>Code Banque</label>
                                                                    <div className="detail-value-box">
                                                                        <span>{account.bank_code}</span>
                                                                        <button className="copy-btn-mini" onClick={() => handleCopyDetails(account.bank_code, 'bank_code')}>
                                                                            {copied === 'bank_code' ? <Check size={14} /> : <Copy size={14} />}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {account.account_number && (
                                                                <div className="bank-detail-item">
                                                                    <label>Numéro de Compte</label>
                                                                    <div className="detail-value-box">
                                                                        <span>{account.account_number}</span>
                                                                        <button className="copy-btn-mini" onClick={() => handleCopyDetails(account.account_number, 'account_number')}>
                                                                            {copied === 'account_number' ? <Check size={14} /> : <Copy size={14} />}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {account.rib && (
                                                                <div className="bank-detail-item full-width">
                                                                    <label>RIB / IBAN</label>
                                                                    <div className="detail-value-box">
                                                                        <span>{account.rib}</span>
                                                                        <button className="copy-btn-mini" onClick={() => handleCopyDetails(account.rib, 'rib')}>
                                                                            {copied === 'rib' ? <Check size={14} /> : <Copy size={14} />}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        ) : (
                                            <div className="bank-details-grid">
                                                {photographerSettings?.bank_name && (
                                                    <div className="bank-detail-item">
                                                        <label>Banque</label>
                                                        <div className="detail-value-box">
                                                            <div className="bank-name-with-logo">
                                                                {getBankLogoUrl(photographerSettings.bank_name) && (
                                                                    <img 
                                                                        src={getBankLogoUrl(photographerSettings.bank_name)} 
                                                                        alt={photographerSettings.bank_name} 
                                                                        className="bank-logo-small"
                                                                        onError={(e) => { e.target.style.display = 'none'; }}
                                                                    />
                                                                )}
                                                                <span>{photographerSettings.bank_name}</span>
                                                            </div>
                                                            <button className="copy-btn-mini" onClick={() => handleCopyDetails(photographerSettings.bank_name, 'bank_name')}>
                                                                {copied === 'bank_name' ? <Check size={14} /> : <Copy size={14} />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                                {photographerSettings?.account_holder && (
                                                    <div className="bank-detail-item">
                                                        <label>Titulaire</label>
                                                        <div className="detail-value-box">
                                                            <span>{photographerSettings.account_holder}</span>
                                                            <button className="copy-btn-mini" onClick={() => handleCopyDetails(photographerSettings.account_holder, 'account_holder')}>
                                                                {copied === 'account_holder' ? <Check size={14} /> : <Copy size={14} />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                                {photographerSettings?.bank_code && (
                                                    <div className="bank-detail-item">
                                                        <label>Code Banque</label>
                                                        <div className="detail-value-box">
                                                            <span>{photographerSettings.bank_code}</span>
                                                            <button className="copy-btn-mini" onClick={() => handleCopyDetails(photographerSettings.bank_code, 'bank_code')}>
                                                                {copied === 'bank_code' ? <Check size={14} /> : <Copy size={14} />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                                {photographerSettings?.account_number && (
                                                    <div className="bank-detail-item">
                                                        <label>Numéro de Compte</label>
                                                        <div className="detail-value-box">
                                                            <span>{photographerSettings.account_number}</span>
                                                            <button className="copy-btn-mini" onClick={() => handleCopyDetails(photographerSettings.account_number, 'account_number')}>
                                                                {copied === 'account_number' ? <Check size={14} /> : <Copy size={14} />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                                {photographerSettings?.rib && (
                                                    <div className="bank-detail-item full-width">
                                                        <label>RIB / IBAN</label>
                                                        <div className="detail-value-box">
                                                            <span>{photographerSettings.rib}</span>
                                                            <button className="copy-btn-mini" onClick={() => handleCopyDetails(photographerSettings.rib, 'rib')}>
                                                                {copied === 'rib' ? <Check size={14} /> : <Copy size={14} />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {photographerSettings?.bank_details && (
                                            <div className="bank-detail-item full-width" style={{ marginTop: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Instructions Générales</label>
                                                <div className="detail-value-box instructions" style={{ alignItems: 'flex-start' }}>
                                                    <pre style={{ margin: 0, fontFamily: 'inherit', fontSize: '0.9rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{photographerSettings.bank_details}</pre>
                                                    <button className="copy-btn-mini" onClick={() => handleCopyDetails(photographerSettings.bank_details, 'details')}>
                                                        {copied === 'details' ? <Check size={14} /> : <Copy size={14} />}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="important-note">
                                        <ShieldCheck size={20} />
                                        <p>
                                            Une fois le virement effectué, le photographe devra valider manuellement votre paiement pour débloquer vos photos haute résolution.
                                        </p>
                                    </div>

                                    <div className="confirmation-step">
                                        <label className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={confirmedTransfer}
                                                onChange={(e) => setConfirmedTransfer(e.target.checked)}
                                            />
                                            <span>J'ai envoyé le virement au photographe</span>
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="checkout-footer">
                    {step === 1 ? (
                        <Button
                            className="w-100 orange-btn"
                            onClick={handleAuthAction}
                            disabled={initializingPayment}
                        >
                            {initializingPayment ? 'Processing...' : (
                                <>
                                    {effectivelyFree ? 'Unlock Free Photos' : (user ? 'Continue to Payment' : (authMode === 'login' ? 'Login & Continue' : 'Create Account & Continue'))}
                                    <ArrowRight size={18} style={{ marginLeft: '8px' }} />
                                </>
                            )}
                        </Button>
                    ) : step === 2 ? (
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <Button variant="outline" onClick={() => setStep(1)} disabled={initializingPayment}>
                                Back
                            </Button>
                            <Button
                                className="flex-1 orange-btn"
                                onClick={handleFinalConfirm}
                                disabled={initializingPayment}
                            >
                                {initializingPayment ? 'Processing...' : (
                                    <>
                                        Confirm {paymentMethod === 'stripe' ? 'Card' : 'Bank Transfer'}
                                        <ArrowRight size={18} style={{ marginLeft: '8px' }} />
                                    </>
                                )}
                            </Button>
                        </div>
                    ) : (
                        <div className="step-actions">
                            {paymentMethod === 'bank_transfer' ? (
                                <Button
                                    className="w-100 orange-btn"
                                    disabled={!confirmedTransfer || initializingPayment || isLoading}
                                    onClick={() => handleManualConfirm()} // Call the new manual confirm
                                >
                                    {(isLoading || initializingPayment) ? 'Processing...' : 'I HAVE SENT THE PAYMENT'}
                                </Button>
                            ) : paymentMethod === 'free' ? (
                                <Button
                                    className="w-100 orange-btn"
                                    disabled={initializingPayment || isLoading}
                                    onClick={() => handleManualConfirm()}
                                >
                                    {(isLoading || initializingPayment) ? 'Processing...' : 'CONFIRM & UNLOCK PHOTOS'}
                                </Button>
                            ) : (
                                <button className="back-btn" onClick={() => setStep(2)}>change method</button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .checkout-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    animation: fadeIn 0.2s ease-out;
                    padding: 1rem;
                }

                .checkout-modal-container {
                    background: white;
                    width: 100%;
                    max-width: 550px;
                    border-radius: 20px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    position: relative;
                    overflow: hidden;
                    animation: slideUp 0.3s ease-out;
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                }

                .close-btn {
                    position: absolute;
                    top: 1rem;
                    right: 1.5rem;
                    background: none;
                    border: none;
                    font-size: 2rem;
                    color: var(--text-tertiary);
                    cursor: pointer;
                    line-height: 1;
                    z-index: 10;
                }

                .checkout-header {
                    background: #f8fafc;
                    padding: 1.5rem;
                    border-bottom: 1px solid #e2e8f0;
                    text-align: center;
                    flex-shrink: 0;
                    position: relative;
                }

                .checkout-header h2 {
                    font-size: 1.25rem;
                    font-weight: 800;
                    color: var(--text-primary);
                    margin-bottom: 1rem;
                }

                .step-indicator {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 1rem;
                }

                .step {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.25rem;
                    opacity: 0.5;
                    transition: all 0.3s;
                }

                .step.active {
                    opacity: 1;
                }

                .step-circle {
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    background: #e2e8f0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                    transition: all 0.3s;
                }

                .step.active .step-circle {
                    background: var(--primary-blue);
                    color: white;
                    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.2);
                }
                
                .step.completed .step-circle {
                    background: #10b981;
                    color: white;
                }

                .step-line {
                    width: 40px;
                    height: 2px;
                    background: #e2e8f0;
                    margin-top: -1.25rem;
                }

                .step span {
                    font-size: 0.75rem;
                    font-weight: 600;
                }

                .checkout-body {
                    padding: 1.5rem;
                    overflow-y: auto;
                    flex: 1;
                }
                
                .stripe-container {
                    min-height: 400px;
                }

                .step-title {
                    font-size: 1.25rem;
                    font-weight: 700;
                    margin-bottom: 0.5rem;
                    color: var(--text-primary);
                }

                .step-desc {
                    color: var(--text-secondary);
                    margin-bottom: 1.5rem;
                    font-size: 0.95rem;
                }

                .auth-tabs {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                    border-bottom: 1px solid #e2e8f0;
                    padding-bottom: 0.5rem;
                }

                .auth-tab {
                    background: none;
                    border: none;
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: var(--text-secondary);
                    padding: 0.5rem 1rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    border-bottom: 2px solid transparent;
                    transition: all 0.2s;
                }

                .auth-tab.active {
                    color: var(--primary-blue);
                    border-bottom-color: var(--primary-blue);
                }

                .form-group {
                    margin-bottom: 1.5rem;
                }

                .form-group label {
                    display: block;
                    font-size: 0.9rem;
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                    color: var(--text-secondary);
                }

                .input-wrapper {
                    position: relative;
                }

                .input-icon {
                    position: absolute;
                    left: 1.5rem;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--text-tertiary);
                }

                .checkout-input {
                    width: 100% !important;
                    padding-left: 4.2rem !important; /* Force space from icon */
                    padding-top: 0.8rem !important;
                    padding-bottom: 0.8rem !important;
                    padding-right: 1rem !important;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    font-size: 1rem;
                    transition: all 0.2s;
                    display: block !important;
                }

                .checkout-input:focus {
                    border-color: var(--primary-blue);
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
                    outline: none;
                }

                .checkout-footer {
                    padding: 1rem 1.5rem;
                    background: white;
                    border-top: 1px solid #f1f5f9;
                    flex-shrink: 0;
                }
                
                .orange-btn {
                    background-color: var(--secondary-cyan) !important;
                    border-color: var(--secondary-cyan) !important;
                    color: white !important;
                }
                
                .orange-btn:hover {
                    background-color: var(--secondary-cyan-dark) !important;
                }
                
                .step-actions {
                    text-align: center;
                }

                .back-btn {
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    font-size: 0.85rem;
                    text-decoration: underline;
                    cursor: pointer;
                    padding: 0.5rem;
                }

                .w-100 {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .error-message {
                    color: var(--danger-red);
                    background: rgba(239, 68, 68, 0.1);
                    padding: 0.75rem;
                    border-radius: 8px;
                    margin-bottom: 1rem;
                    font-size: 0.9rem;
                }

                .total-indicator {
                    margin-top: 2rem;
                    padding: 1.5rem;
                    background: #f8fafc;
                    border-radius: 12px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border: 1px dashed #cbd5e1;
                }

                .total-indicator span { font-weight: 600; color: #64748b; }
                .total-indicator strong { font-size: 1.5rem; color: var(--text-primary); }

                .payment-options {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    margin: 1.5rem 0;
                }

                .payment-option {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                    padding: 1.25rem;
                    border: 2px solid #e2e8f0;
                    border-radius: 16px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .payment-option:hover {
                    border-color: var(--primary-blue-light);
                    background: #f8fafc;
                }

                .payment-option.active {
                    border-color: var(--primary-blue);
                    background: #eff6ff;
                }

                .option-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                    background: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #64748b;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
                }

                .payment-option.active .option-icon {
                    color: var(--primary-blue);
                }

                .option-text h4 { font-size: 1rem; font-weight: 700; margin-bottom: 0.15rem; }
                .option-text p { font-size: 0.8rem; color: #94a3b8; }

                .option-check { margin-left: auto; color: var(--primary-blue); }

                /* Bank Instructions */
                .bank-transfer-instructions {
                    animation: fadeIn 0.3s ease-out;
                }

                .instruction-header {
                    text-align: center;
                    margin-bottom: 1.5rem;
                }

                .header-icon { color: var(--primary-blue); margin-bottom: 0.5rem; }
                .instruction-header h3 { font-size: 1.25rem; font-weight: 800; }

                .bank-details-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                    background: #f8fafc;
                    padding: 1.25rem;
                    border-radius: 16px;
                    margin-bottom: 1.5rem;
                    border: 1px solid #e2e8f0;
                }

                .bank-detail-item {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }

                .bank-detail-item.full-width {
                    grid-column: span 2;
                }

                .bank-detail-item label {
                    font-size: 0.7rem;
                    font-weight: 800;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 0.025em;
                }

                .detail-value-box {
                    position: relative;
                    background: white;
                    padding: 0.6rem 2.5rem 0.6rem 0.75rem;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                    min-height: 40px;
                    display: flex;
                    align-items: center;
                }

                .detail-value-box span {
                    font-size: 0.9rem;
                    font-weight: 700;
                    color: #1e293b;
                    word-break: break-all;
                }

                .detail-value-box.instructions {
                    align-items: flex-start;
                    padding-top: 0.75rem;
                }

                .detail-value-box pre {
                    font-family: inherit;
                    font-size: 0.85rem;
                    white-space: pre-wrap;
                    color: #475569;
                    margin: 0;
                }

                .copy-btn-mini {
                    position: absolute;
                    top: 50%;
                    right: 0.5rem;
                    transform: translateY(-50%);
                    background: #f1f5f9;
                    border: none;
                    border-radius: 6px;
                    width: 28px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: #64748b;
                    transition: all 0.2s;
                }

                .copy-btn-mini:hover {
                    background: var(--primary-blue-light);
                    color: var(--primary-blue);
                }

                .important-note {
                    display: flex;
                    gap: 1rem;
                    padding: 1rem;
                    background: #fff7ed;
                    border-radius: 12px;
                    color: #9a3412;
                    margin-bottom: 1.5rem;
                }

                .important-note p { font-size: 0.85rem; line-height: 1.4; font-weight: 500; }

                .confirmation-step {
                    display: flex;
                    justify-content: center;
                }

                .checkbox-label {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    font-size: 0.95rem;
                    font-weight: 700;
                    cursor: pointer;
                    color: #1e293b;
                }

                .checkbox-label input { width: 20px; height: 20px; cursor: pointer; }

                @keyframes slideUp {
                    from { transform: translateY(100px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @media (max-width: 640px) {
                    .checkout-modal-container {
                        max-height: 85vh;
                        height: auto;
                        width: 90vw !important; /* Use viewport width */
                        max-width: 380px !important;
                        margin: 0 !important; /* Flexbox handles centering */
                        border-radius: 20px;
                        display: flex;
                        flex-direction: column;
                        box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                        position: relative !important;
                        transform: none !important; /* prevent animation conflict */
                        animation: none !important; /* Disable animation on mobile to ensure layout stability */
                    }
                    
                    .checkout-modal-overlay {
                        padding: 0 !important;
                        align-items: center !important;
                        justify-content: center !important;
                        width: 100vw !important;
                        height: 100vh !important;
                        top: 0 !important;
                        left: 0 !important;
                    }
                    
                    /* Prevent zoom on iOS inputs */
                    .checkout-input {
                        font-size: 16px !important; 
                        padding: 0.8rem 0.8rem 0.8rem 3.5rem; /* Increase from 3rem to 3.5rem for more space from icon */
                    }

                    .checkout-header {
                        padding: 1rem;
                    }

                    .close-btn {
                        top: 0.5rem;
                        right: 0.5rem;
                        font-size: 1.5rem;
                        padding: 0.5rem; /* Larger touch target */
                    }

                    .checkout-body {
                        padding: 1rem;
                    }

                    .step-indicator {
                        gap: 0.5rem;
                    }

                    .step-line {
                        width: 20px;
                    }

                    .checkout-footer {
                        padding: 1rem;
                    }
                    
                    .orange-btn {
                        padding: 0.9rem; /* Taller button */
                        font-size: 1rem;
                    }

                    h2 {
                        font-size: 1.1rem;
                        margin-bottom: 0.75rem;
                    }
                }

                   @media (max-width: 480px) {
                    .checkout-modal-container {
                        max-height: 95vh;
                        border-radius: 15px;
                        margin: 0;
                    }
                    
                    .checkout-header {
                        padding: 1rem;
                    }
                    
                    .checkout-header h2 {
                        font-size: 1.1rem;
                        margin-bottom: 0.5rem;
                    }
                    
                    .step-indicator {
                        gap: 0.5rem;
                    }
                    
                    .step-line {
                        width: 20px;
                    }
                    
                    .checkout-body {
                        padding: 1rem;
                    }
                    
                    .step-title {
                        font-size: 1.1rem;
                    }
                    
                    .step-desc {
                        font-size: 0.85rem;
                        margin-bottom: 1rem;
                    }
                    
                    .form-group {
                        margin-bottom: 1rem;
                    }
                    
                    .checkout-input {
                        padding-top: 0.6rem !important;
                        padding-bottom: 0.6rem !important;
                        font-size: 0.95rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default CheckoutModal;
