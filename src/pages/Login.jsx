import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import '../components/ui/ui.css';
import { supabase } from '../lib/supabase';

const Login = () => {
    const [authMethod, setAuthMethod] = useState('email'); // 'email' or 'phone'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [countryCode, setCountryCode] = useState('+1');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn, signInWithGoogle, signInWithPhonePassword } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        let loginData, loginError;

        if (authMethod === 'phone') {
            const fullPhoneNumber = countryCode + phone.replace(/^0+/, '');
            const { data, error } = await signInWithPhonePassword(fullPhoneNumber, password);
            loginData = data;
            loginError = error;
        } else {
            const { data, error } = await signIn(email, password);
            loginData = data;
            loginError = error;
        }

        if (loginError) {
            setError(loginError.message);
            setLoading(false);
        } else if (loginData?.user) {
            const params = new URLSearchParams(window.location.search);
            const redirect = params.get('redirect');
            const action = params.get('action');

            if (redirect) {
                const target = action ? `${redirect}?action=${action}` : redirect;
                navigate(target);
            } else {
                // Fetch user role for specific redirection
                try {
                    const { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', loginData.user.id)
                        .single();

                    if (profileError) throw profileError;

                    if (profile.role === 'admin') {
                        navigate('/admin');
                    } else if (profile.role === 'photographer') {
                        navigate('/photographer/dashboard');
                    } else {
                        navigate('/albums');
                    }
                } catch (err) {
                    console.error("Error fetching role for redirect:", err);
                    navigate('/'); // Fallback to home
                }
            }
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2 className="auth-title">Log In</h2>
                {error && <div className="error-alert">{error}</div>}

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
                        Continue with Google
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

                <form onSubmit={handleLogin}>
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
                    <Button type="submit" className="w-full action-btn" disabled={loading}>
                        {loading ? 'Processing...' : 'Log In'}
                    </Button>
                </form>
                <p className="auth-footer">
                    Don't have an account? <Link to={`/register${window.location.search}`}>Sign Up</Link>
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

export default Login;
