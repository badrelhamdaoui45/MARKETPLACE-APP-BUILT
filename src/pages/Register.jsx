
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { countries } from '../utils/countries';
import '../components/ui/ui.css';

const Register = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState('runner');
    const [country, setCountry] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signUp } = useAuth();
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');

        if (role === 'photographer' && !country) {
            setError('Please select your country.');
            return;
        }

        setLoading(true);
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
                navigate('/');
            }
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2 className="auth-title">Create Account</h2>
                {error && <div className="error-alert">{error}</div>}
                <form onSubmit={handleRegister}>
                    <Input
                        label="Full Name"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        required
                    />
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
