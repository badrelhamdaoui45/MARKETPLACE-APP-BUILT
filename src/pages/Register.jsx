
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { countries } from '../utils/countries';
import { stripeCountries } from '../utils/stripeCountries';
import SearchablePhonePrefixSelect from '../components/SearchablePhonePrefixSelect';
import '../components/ui/ui.css';

const Register = () => {
    const [authMethod, setAuthMethod] = useState('email'); // 'email' or 'phone'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [countryCode, setCountryCode] = useState('+1');
    const [phoneCountry, setPhoneCountry] = useState('US');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState('runner');
    const [country, setCountry] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signUp, signInWithGoogle, signUpWithPhone } = useAuth();
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');

        if (role === 'photographer' && !country) {
            setError('Please select your country.');
            return;
        }

        setLoading(true);

        if (authMethod === 'phone') {
            const fullPhoneNumber = countryCode + phone.replace(/^0+/, '');
            const { error: phoneError } = await signUpWithPhone(fullPhoneNumber, password, fullName, role, {
                country: role === 'photographer' ? country : null
            });
            
            if (phoneError) {
                setError(phoneError.message);
                setLoading(false);
            } else {
                const params = new URLSearchParams(window.location.search);
                const redirect = params.get('redirect');
                const action = params.get('action');

                if (redirect) {
                    const target = action ? `${redirect}?action=${action}` : redirect;
                    navigate(target);
                } else {
                    if (role === 'photographer') {
                        navigate('/photographer/dashboard');
                    } else {
                        navigate('/albums');
                    }
                }
            }
            return;
        }

        const { error } = await signUp(email, password, fullName, role, { country });
        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            const params = new URLSearchParams(window.location.search);
            const redirect = params.get('redirect');
            const action = params.get('action');

            if (redirect) {
                const target = action ? `${redirect}?action=${action}` : redirect;
                navigate(target);
            } else {
                if (role === 'photographer') {
                    navigate('/photographer/dashboard');
                } else {
                    navigate('/albums');
                }
            }
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2 className="auth-title">Create Account</h2>
                {error && <div className="error-alert">{error}</div>}
                <form onSubmit={handleRegister}>
                    
                    {/* Role Switcher Cards */}
                    <div className="role-cards-container">
                        <button
                            type="button"
                            className={`role-card ${role === 'runner' ? 'active' : ''}`}
                            onClick={() => setRole('runner')}
                        >
                            <div className="role-card-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                            </div>
                            <span className="role-card-text">Find My Photos</span>
                        </button>
                        <button
                            type="button"
                            className={`role-card ${role === 'photographer' ? 'active' : ''}`}
                            onClick={() => setRole('photographer')}
                        >
                            <div className="role-card-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                    <circle cx="12" cy="13" r="4"></circle>
                                </svg>
                            </div>
                            <span className="role-card-text">Sell My Photos</span>
                        </button>
                    </div>

                    <div className="provider-buttons">
                        <Button 
                            type="button" 
                            variant="outline" 
                            className="w-full google-btn" 
                            onClick={() => {
                                localStorage.setItem('oauth_pending_role', role);
                                if (role === 'photographer' && country) {
                                    localStorage.setItem('oauth_pending_country', country);
                                }
                                signInWithGoogle();
                            }}
                        >
                            <svg className="google-icon" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                <path d="M1 1h22v22H1z" fill="none"/>
                            </svg>
                            Sign up with Google
                        </Button>
                    </div>

                    <div className="divider">
                        <span>or continue with</span>
                    </div>

                    <div className="auth-method-toggle">
                        <button 
                            type="button" 
                            className={`toggle-btn ${authMethod === 'email' ? 'active' : ''}`}
                            onClick={() => setAuthMethod('email')}
                        >
                            Email
                        </button>
                        <button 
                            type="button" 
                            className={`toggle-btn ${authMethod === 'phone' ? 'active' : ''}`}
                            onClick={() => setAuthMethod('phone')}
                        >
                            Phone
                        </button>
                    </div>

                    <Input
                        label="Full Name"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        required
                    />

                    {authMethod === 'email' ? (
                        <>
                            <Input
                                label="Email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                required
                            />
                            <Input
                                label="Password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </>
                    ) : (
                        <>
                            <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                                <label className="input-label">Phone Number</label>
                                <div className="phone-input-container">
                                    <SearchablePhonePrefixSelect 
                                        value={phoneCountry} 
                                        onChange={(code) => {
                                            setPhoneCountry(code);
                                            const matched = stripeCountries.find(c => c.code === code);
                                            if (matched) {
                                                setCountryCode(matched.prefix);
                                            }
                                        }}
                                        padding="0.75rem"
                                        fontSize="0.95rem"
                                        standalone={true}
                                    />
                                    <input
                                        className="input-field phone-field"
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="234 567 8900"
                                        required
                                    />
                                </div>
                            </div>
                            <Input
                                label="Password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </>
                    )}

                    {role === 'photographer' && (
                        <Select
                            label="Country"
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            options={countries}
                            required
                        />
                    )}

                    <Button type="submit" className="w-full action-btn mt-4" disabled={loading}>
                        {loading ? 'Creating...' : 'Sign Up'}
                    </Button>
                </form>
                <p className="auth-footer">
                    Already have an account? <Link to={`/login${window.location.search}`}>Log In</Link>
                </p>
            </div>

            <style>{`
                .auth-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: calc(100vh - 80px);
                    padding: 1.5rem;
                    background: var(--bg-primary);
                }

                .auth-card {
                    width: 100%;
                    max-width: 460px;
                    padding: 2.5rem;
                }

                .auth-title {
                    margin-bottom: 2rem;
                    text-align: center;
                    font-weight: 800;
                    letter-spacing: -0.02em;
                    font-size: 1.75rem;
                }

                /* Role Switcher Cards */
                .role-cards-container {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                    margin-bottom: 2rem;
                }

                .role-card {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 0.75rem;
                    padding: 1.5rem 1rem;
                    background: white;
                    border: 2px solid #e2e8f0;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .role-card:hover {
                    border-color: #cbd5e1;
                    background: #f8fafc;
                    transform: translateY(-2px);
                }

                .role-card.active {
                    border-color: #0f172a;
                    background: #f8fafc;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                }

                .role-card-icon {
                    width: 32px;
                    height: 32px;
                    color: #64748b;
                    transition: color 0.2s;
                }

                .role-card.active .role-card-icon {
                    color: #0f172a;
                }

                .role-card-text {
                    font-weight: 600;
                    color: #475569;
                    font-size: 0.95rem;
                    transition: color 0.2s;
                }

                .role-card.active .role-card-text {
                    color: #0f172a;
                }

                .provider-buttons {
                    margin-bottom: 1.5rem;
                }

                .google-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.75rem;
                    background: white;
                    color: #374151;
                    border: 1px solid #d1d5db;
                    font-weight: 600;
                }

                .google-btn:hover {
                    background: #f9fafb;
                }

                .google-icon {
                    width: 20px;
                    height: 20px;
                }

                .divider {
                    position: relative;
                    text-align: center;
                    margin: 1.5rem 0;
                }

                .divider::before {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 0;
                    right: 0;
                    height: 1px;
                    background: #e5e7eb;
                    z-index: 1;
                }

                .divider span {
                    position: relative;
                    z-index: 2;
                    background: white;
                    padding: 0 0.75rem;
                    color: #6b7280;
                    font-size: 0.875rem;
                    font-weight: 500;
                }

                .auth-method-toggle {
                    display: flex;
                    background: #f1f5f9;
                    border-radius: 8px;
                    padding: 0.25rem;
                    margin-bottom: 1.5rem;
                }

                .toggle-btn {
                    flex: 1;
                    padding: 0.6rem;
                    border: none;
                    background: transparent;
                    border-radius: 6px;
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: #64748b;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .toggle-btn.active {
                    background: white;
                    color: #0f172a;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }

                .phone-input-container {
                    display: flex;
                    gap: 0.5rem;
                }

                .country-code-select {
                    width: 110px;
                    padding: 0.75rem;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    background: #f8fafc;
                    color: #334155;
                    font-size: 0.95rem;
                    outline: none;
                    transition: all 0.2s;
                }

                .country-code-select:focus {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                    background: white;
                }

                .phone-field {
                    flex: 1;
                }

                .error-alert {
                    color: #ef4444;
                    background: #fef2f2;
                    padding: 0.75rem;
                    border-radius: 6px;
                    margin-bottom: 1.5rem;
                    font-size: 0.875rem;
                    text-align: center;
                    border: 1px solid #fee2e2;
                }
                
                .mt-4 {
                    margin-top: 1rem;
                }

                .auth-footer {
                    margin-top: 2rem;
                    text-align: center;
                    color: var(--text-secondary);
                    font-size: 0.95rem;
                }

                .auth-footer a {
                    color: var(--primary-blue);
                    font-weight: 700;
                    text-decoration: none;
                }

                @media (max-width: 480px) {
                    .auth-card {
                        padding: 1.5rem;
                    }
                    .role-cards-container {
                        gap: 0.5rem;
                    }
                    .role-card {
                        padding: 1rem 0.5rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default Register;
