
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { countries } from '../utils/countries';
import '../components/ui/ui.css';

const Register = () => {
    const [authMethod, setAuthMethod] = useState('email'); // 'email' or 'phone'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [countryCode, setCountryCode] = useState('+1');
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
                    <div className="provider-buttons">
                        <Button 
                            type="button" 
                            variant="outline" 
                            className="w-full google-btn" 
                            onClick={() => signInWithGoogle()}
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
                                    <select 
                                        className="country-code-select" 
                                        value={countryCode} 
                                        onChange={(e) => setCountryCode(e.target.value)}
                                    >
                                        <option value="+1">+1 (US/CA)</option>
                                        <option value="+44">+44 (UK)</option>
                                        <option value="+33">+33 (FR)</option>
                                        <option value="+49">+49 (DE)</option>
                                        <option value="+34">+34 (ES)</option>
                                        <option value="+39">+39 (IT)</option>
                                        <option value="+61">+61 (AU)</option>
                                        <option value="+81">+81 (JP)</option>
                                        <option value="+86">+86 (CN)</option>
                                        <option value="+91">+91 (IN)</option>
                                        <option value="+55">+55 (BR)</option>
                                        <option value="+52">+52 (MX)</option>
                                        <option value="+212">+212 (MA)</option>
                                    </select>
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

                    <div className="role-selection">
                        <label className="input-label">I am a...</label>
                        <div className="radio-options-list">
                            {['Runner', 'Photographer'].map((roleOption) => (
                                <label key={roleOption} className={`radio-option ${role === roleOption.toLowerCase() ? 'selected' : ''}`}>
                                    <div className="radio-circle">
                                        {role === roleOption.toLowerCase() && <div className="radio-dot" />}
                                    </div>
                                    <input
                                        type="radio"
                                        name="role"
                                        value={roleOption.toLowerCase()}
                                        checked={role === roleOption.toLowerCase()}
                                        onChange={(e) => setRole(e.target.value)}
                                        className="hidden-radio"
                                    />
                                    <span className="radio-text">{roleOption}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <Button type="submit" className="w-full action-btn" disabled={loading}>
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
                    max-width: 420px;
                    padding: 2.5rem;
                }

                .auth-title {
                    margin-bottom: 2rem;
                    text-align: center;
                    font-weight: 800;
                    letter-spacing: -0.02em;
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
                }

                .auth-method-toggle {
                    display: flex;
                    background: #f3f4f6;
                    border-radius: 8px;
                    padding: 0.25rem;
                    margin-bottom: 1.5rem;
                }

                .toggle-btn {
                    flex: 1;
                    padding: 0.5rem;
                    border: none;
                    background: transparent;
                    border-radius: 6px;
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: #6b7280;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .toggle-btn.active {
                    background: white;
                    color: #111827;
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

                .role-selection {
                    margin-bottom: 1.5rem;
                }

                /* Modern Radio Options List */
                .radio-options-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                    margin-top: 0.75rem;
                }

                .radio-option {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    cursor: pointer;
                    padding: 1rem;
                    border-radius: 8px;
                    transition: all 0.2s;
                    border: 2px solid #e2e8f0;
                    background: white;
                }

                .radio-option:hover {
                    background: #f8fafc;
                    border-color: #cbd5e1;
                }

                .radio-option.selected {
                    background: #f0f9ff;
                    border-color: #0f172a;
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
                    flex-shrink: 0;
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
                    font-weight: 500;
                }

                .radio-option.selected .radio-text {
                    color: #0f172a;
                    font-weight: 600;
                }

                .hidden-radio {
                    display: none;
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
                }
            `}</style>
        </div>
    );
};

export default Register;
