
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { countries } from '../utils/countries';
import { createConnectedAccount, createAccountLink } from '../lib/stripe/service';
import '../components/ui/ui.css';
import { Check, ChevronRight, User, Globe, CreditCard } from 'lucide-react';

const Onboarding = () => {
    const { signUp, user } = useAuth();
    const navigate = useNavigate();

    // Step state
    const [currentStep, setCurrentStep] = useState(1);

    // Form data state
    const [formData, setFormData] = useState({
        userType: '',
        language: 'en',
        fullName: '',
        email: '',
        password: '',
        country: '',
    });

    // Loading states
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [stripeLoading, setStripeLoading] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);

    // Load saved data on mount
    useEffect(() => {
        const savedData = localStorage.getItem('onboardingData');
        const savedStep = localStorage.getItem('onboardingStep');

        if (savedData) {
            setFormData(prev => ({ ...prev, ...JSON.parse(savedData) }));
        }

        if (savedStep) {
            // Only restore step if it's feasible (e.g., user exists for step 3)
            // But for simplicity, we allow restoring.
            // CAUTION: If user refreshes on Step 3 but isn't logged in, we might have issues.
            // We'll handle that in the step render check or useEffect.
            setCurrentStep(parseInt(savedStep));
        }
    }, []);

    // Save data on change
    useEffect(() => {
        localStorage.setItem('onboardingData', JSON.stringify(formData));
        localStorage.setItem('onboardingStep', currentStep.toString());
    }, [formData, currentStep]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const nextStep = () => {
        setCurrentStep(prev => prev + 1);
    };

    const prevStep = () => {
        setCurrentStep(prev => prev - 1);
    };

    const handleStep1Submit = (e) => {
        e.preventDefault();
        if (!formData.userType) {
            setError('Please select a type.');
            return;
        }
        setError('');
        nextStep();
    };

    const handleStep2Submit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.country) {
            setError('Please select your country.');
            window.scrollTo(0, 0);
            return;
        }

        setLoading(true);

        try {
            // Sign up the user
            const { error: signUpError } = await signUp(
                formData.email,
                formData.password,
                formData.fullName,
                'photographer', // Use fixed 'photographer' role for this flow
                { // Additional metadata
                    provider_type: formData.userType,
                    preferred_language: formData.language,
                    country: formData.country,
                }
            );

            if (signUpError) throw signUpError;

            // If successful, move to next step
            // Note: signUp usually auto-logs in.
            nextStep();
        } catch (err) {
            console.error(err);
            if (err.message && (err.message.includes('already registered') || err.message.includes('already exists'))) {
                setShowLoginModal(true);
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleStripeConnect = async () => {
        setStripeLoading(true);
        try {
            // Ensure we have a user (should be logged in from Step 2)
            if (!user) {
                // Determine if we just signed up or lost session. 
                // Wait for AuthContext to sync? 
                // For now throw error, but in reality AuthContext updates fast.
                // A better approach might be to wait for 'user' to be non-null.
                throw new Error("User session not found. Please try refreshing.");
            }

            const account = await createConnectedAccount(user.id);
            const url = await createAccountLink(account.id);
            window.location.href = url;

            // Clear local storage since we are leaving
            // localStorage.removeItem('onboardingData');
            // localStorage.removeItem('onboardingStep');
        } catch (err) {
            alert('Error connecting Stripe: ' + err.message);
        } finally {
            setStripeLoading(false);
        }
    };

    const handleFinishLater = () => {
        // Clear storage
        localStorage.removeItem('onboardingData');
        localStorage.removeItem('onboardingStep');
        navigate('/photographer/dashboard');
    };

    // --- RENDER STEPS ---

    // STEP 1: General Information
    const renderStep1 = () => (
        <form onSubmit={handleStep1Submit} className="onboarding-form">
            <h3 className="step-title">General information</h3>

            <div className="form-section">
                <label className="section-label">You are?</label>
                <div className="radio-options-list">
                    {['Event', 'Club', 'Agency', 'Photographer', 'Federation', 'Club/Association', 'Other'].map((type) => (
                        <label key={type} className={`radio-option ${formData.userType === type ? 'selected' : ''}`}>
                            <div className="radio-circle">
                                {formData.userType === type && <div className="radio-dot" />}
                            </div>
                            <input
                                type="radio"
                                name="userType"
                                value={type}
                                checked={formData.userType === type}
                                onChange={handleInputChange}
                                className="hidden-radio"
                            />
                            <span className="radio-text">{type}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Language Selection Removed - Forced to English */}

            <Button type="submit" className="w-full action-btn step-btn">
                NEXT
            </Button>

            <div className="login-hint">
                Already registered? <Link to="/login">Log In</Link>
            </div>
        </form>
    );

    // STEP 2: Public Name (Registration)
    const renderStep2 = () => (
        <form onSubmit={handleStep2Submit} className="onboarding-form">
            <h3 className="step-title">Public name & Account</h3>

            <Input
                label="Public Name / Organization Name"
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="e.g. Acme Events or John Doe"
                required
            />

            <Input
                label="Email Address"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="yours@example.com"
                required
            />

            <Input
                label="Password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Create a strong password"
                required
            />

            <Select
                label="Country"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                options={countries}
                required
            />

            <div className="btn-group">
                <Button type="button" variant="outline" onClick={prevStep} className="step-back-btn">
                    Back
                </Button>
                <Button type="submit" className="action-btn step-btn" disabled={loading}>
                    {loading ? 'Creating Account...' : 'NEXT'}
                </Button>
            </div>
        </form>
    );

    // STEP 3: Billing Information
    const renderStep3 = () => (
        <div className="onboarding-form billing-step">
            <h3 className="step-title">Billing information</h3>
            <p className="step-desc">
                To receive payments from your photo sales, you need to connect a Stripe account.
            </p>

            <div className="billing-options">
                <div className="billing-card highlight">
                    <div className="billing-icon">
                        <CreditCard size={32} />
                    </div>
                    <h4>Set it up now</h4>
                    <p>Connect immediately to start selling.</p>
                    <Button
                        onClick={handleStripeConnect}
                        disabled={stripeLoading}
                        className="w-full stripe-btn"
                    >
                        {stripeLoading ? 'Connecting...' : 'Connect Stripe'}
                    </Button>
                </div>

                <div className="billing-card">
                    <h4>Set it up later</h4>
                    <p>You can skip this for now and configure it in your dashboard settings.</p>
                    <Button
                        variant="outline"
                        onClick={handleFinishLater}
                        className="w-full"
                    >
                        Finish & Go to Dashboard
                    </Button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="onboarding-container">
            {showLoginModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-icon-wrapper">
                            <User size={32} />
                        </div>
                        <h3>User already registered</h3>
                        <p>An account with this email address already exists. Please log in to continue your setup.</p>
                        <div className="modal-actions">
                            <Button
                                variant="outline"
                                onClick={() => setShowLoginModal(false)}
                            >
                                Cancel
                            </Button>
                            <Link to="/login" className="login-link-btn">
                                <Button className="w-full">
                                    Log In
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            <div className="onboarding-card">
                {/* Stepper */}
                <div className="stepper">
                    <div className={`step-item ${currentStep >= 1 ? 'active' : ''}`}>
                        <div className="step-circle">1</div>
                        <span className="step-label">General information</span>
                    </div>
                    <div className="step-line" />
                    <div className={`step-item ${currentStep >= 2 ? 'active' : ''}`}>
                        <div className="step-circle">2</div>
                        <span className="step-label">Public name</span>
                    </div>
                    <div className="step-line" />
                    <div className={`step-item ${currentStep >= 3 ? 'active' : ''}`}>
                        <div className="step-circle">3</div>
                        <span className="step-label">Billing information</span>
                    </div>
                </div>

                <div className="step-content">
                    {error && <div className="error-alert">{error}</div>}

                    {currentStep === 1 && renderStep1()}
                    {currentStep === 2 && renderStep2()}
                    {currentStep === 3 && renderStep3()}
                </div>
            </div>

            <style>{`
                .onboarding-container {
                    min-height: calc(100vh - 80px);
                    display: flex;
                    justify-content: center;
                    align-items: flex-start;
                    padding: 3rem 1rem;
                    background: #f8fafc;
                }

                .onboarding-card {
                    width: 100%;
                    max-width: 550px;
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
                    padding: 2.5rem;
                }

                /* Stepper */
                .stepper {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 3rem;
                    position: relative;
                }

                .step-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.5rem;
                    position: relative;
                    z-index: 2;
                }

                .step-circle {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: #e2e8f0;
                    color: #64748b;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    transition: all 0.3s ease;
                }

                .step-item.active .step-circle {
                    background: #0f172a;
                    color: white;
                }

                .step-label {
                    font-size: 0.8rem;
                    color: #94a3b8;
                    font-weight: 500;
                    text-align: center;
                    max-width: 80px;
                    line-height: 1.2;
                }
                
                .step-item.active .step-label {
                    color: #0f172a;
                    font-weight: 700;
                }

                .step-line {
                    flex: 1;
                    height: 2px;
                    background: #e2e8f0;
                    margin: 0 10px;
                    position: relative;
                    top: -14px; /* Align with circle center */
                    z-index: 1;
                }

                /* Form Styles */
                .step-title {
                    text-align: center;
                    color: #94a3b8;
                    margin-bottom: 2rem;
                    font-size: 1.1rem;
                    font-weight: 500;
                }

                .section-label {
                    display: block;
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: #334155;
                    margin-bottom: 1rem;
                    text-align: center;
                }

                .form-section {
                    margin-bottom: 2.5rem;
                }

                /* Custom Radio List */
                .radio-options-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    max-width: 300px;
                    margin: 0 auto;
                }

                .radio-option {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    cursor: pointer;
                    padding: 0.5rem;
                    border-radius: 8px;
                    transition: background 0.2s;
                }

                .radio-option:hover {
                    background: #f1f5f9;
                }

                .radio-circle {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    border: 2px solid #cbd5e1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }

                .radio-option.selected .radio-circle {
                    border-color: #0f172a;
                }

                .radio-dot {
                    width: 12px;
                    height: 12px;
                    background: #0f172a;
                    border-radius: 50%;
                }

                .radio-text {
                    font-size: 1rem;
                    color: #475569;
                }

                .hidden-radio {
                    display: none;
                }

                /* Language Options */
                .language-options {
                    display: flex;
                    justify-content: center;
                    gap: 2rem;
                }

                .lang-option {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    cursor: pointer;
                }

                .step-btn {
                    margin-top: 1rem;
                    height: 50px;
                }
                
                .btn-group {
                    display: flex;
                    gap: 1rem;
                    margin-top: 2rem;
                }
                
                .step-back-btn {
                    flex: 1;
                }

                .login-hint {
                    text-align: center;
                    margin-top: 2rem;
                    font-weight: 600;
                    color: #1f2937;
                }

                .login-hint a {
                    color: inherit;
                    text-decoration: none;
                }

                /* Billing Step */
                .billing-step {
                    text-align: center;
                }

                .step-desc {
                    color: #64748b;
                    margin-bottom: 2rem;
                }

                .billing-options {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                .billing-card {
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 1.5rem;
                    transition: all 0.3s;
                }

                .billing-card.highlight {
                    border-color: #635bff; /* Stripe Blurple */
                    background: #f5f6ff;
                }

                .billing-icon {
                    color: #635bff;
                    margin-bottom: 1rem;
                    display: flex;
                    justify-content: center;
                }

                .billing-card h4 {
                    font-size: 1.1rem;
                    font-weight: 700;
                    margin-bottom: 0.5rem;
                }
                
                .billing-card p {
                    color: #64748b;
                    font-size: 0.9rem;
                    margin-bottom: 1.5rem;
                }

                .stripe-btn {
                    background: #635bff !important;
                    color: white !important;
                }

                /* Modal Styles */
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 100;
                    backdrop-filter: blur(4px);
                    animation: fadeIn 0.2s ease;
                }

                .modal-content {
                    background: white;
                    padding: 2rem;
                    border-radius: 16px;
                    width: 90%;
                    max-width: 400px;
                    text-align: center;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                    animation: scaleUp 0.2s ease;
                }

                .modal-icon-wrapper {
                    width: 64px;
                    height: 64px;
                    background: #eff6ff;
                    border-radius: 50%;
                    color: #2563eb;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1.5rem;
                }

                .modal-content h3 {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #1e293b;
                    margin-bottom: 0.75rem;
                }

                .modal-content p {
                    color: #64748b;
                    margin-bottom: 2rem;
                    line-height: 1.5;
                }

                .modal-actions {
                    display: flex;
                    gap: 1rem;
                }
                
                .modal-actions > * {
                    flex: 1;
                }

                .login-link-btn {
                    text-decoration: none;
                    flex: 1;
                    display: block;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes scaleUp {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }

            `}</style>
        </div>
    );
};

export default Onboarding;
