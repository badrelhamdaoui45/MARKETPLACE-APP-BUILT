import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { CreditCard, User, Mail, ShieldCheck, CheckCircle, ArrowRight, Lock, LogIn, UserPlus } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { useAuth } from '../context/AuthContext';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const CheckoutModal = ({ isOpen, onClose, onConfirm, totalAmount, isLoading }) => {
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

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                email: user.email,
                fullName: user.user_metadata?.full_name || ''
            }));
        }
    }, [user]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setAuthError('');
    };

    const handleAuthAction = async () => {
        setAuthError('');
        setInitializingPayment(true);

        try {
            if (!user) {
                if (authMode === 'login') {
                    if (!formData.email || !formData.password) throw new Error("Please enter email and password.");
                    const { error } = await signIn(formData.email, formData.password);
                    if (error) throw error;
                } else {
                    if (!formData.email || !formData.password || !formData.fullName) throw new Error("Please fill in all fields.");
                    const { error } = await signUp(formData.email, formData.password, formData.fullName, 'buyer');
                    if (error) throw error;
                }
            }

            // Proceed to payment setup
            const secret = await onConfirm({
                fullName: formData.fullName,
                email: formData.email
            });

            if (secret) {
                setClientSecret(secret);
                setStep(2);
            }

        } catch (error) {
            console.error("Authentication/Payment Error:", error);
            setAuthError(error.message || "An error occurred.");
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
                        <div className={`step ${step >= 2 ? 'active' : ''}`}>
                            <div className="step-circle">2</div>
                            <span>Payment</span>
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
                            <p className="step-desc">
                                {user ? 'Confirm your details to proceed to payment.' : 'You need an account to access your photos securely.'}
                            </p>

                            {authError && <div className="error-message">{authError}</div>}

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
                    ) : (
                        <div className="step-content fade-in stripe-container">
                            {clientSecret && (
                                <EmbeddedCheckoutProvider
                                    stripe={stripePromise}
                                    options={{ clientSecret }}
                                >
                                    <EmbeddedCheckout />
                                </EmbeddedCheckoutProvider>
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
                                    {user ? 'Continue to Payment' : (authMode === 'login' ? 'Login & Continue' : 'Create Account & Continue')}
                                    <ArrowRight size={18} style={{ marginLeft: '8px' }} />
                                </>
                            )}
                        </Button>
                    ) : (
                        <div className="step-actions">
                            <button className="back-btn" onClick={() => setStep(1)}>change info</button>
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
                    left: 1.25rem;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--text-tertiary);
                }

                .checkout-input {
                    width: 100%;
                    padding: 1rem 1rem 1rem 3.5rem;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    font-size: 1rem;
                    transition: all 0.2s;
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

                @keyframes slideUp {
                    from { transform: translateY(100px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @media (max-width: 640px) {
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
                        padding: 0.8rem 0.8rem 0.8rem 3rem; /* Optimize padding */
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
            `}</style>
        </div>
    );
};

export default CheckoutModal;
