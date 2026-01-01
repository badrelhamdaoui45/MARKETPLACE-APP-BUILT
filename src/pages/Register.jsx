
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import '../components/ui/ui.css';

const Register = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState('buyer');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signUp } = useAuth();
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const { error } = await signUp(email, password, fullName, role);
        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            navigate('/');
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

                    <div className="role-selection">
                        <label className="input-label">I am a...</label>
                        <div className="radio-group">
                            <label className="radio-label">
                                <input
                                    type="radio"
                                    name="role"
                                    value="buyer"
                                    checked={role === 'buyer'}
                                    onChange={(e) => setRole(e.target.value)}
                                />
                                Buyer
                            </label>
                            <label className="radio-label">
                                <input
                                    type="radio"
                                    name="role"
                                    value="photographer"
                                    checked={role === 'photographer'}
                                    onChange={(e) => setRole(e.target.value)}
                                />
                                Photographer
                            </label>
                        </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Creating...' : 'Sign Up'}
                    </Button>
                </form>
                <p className="auth-footer">
                    Already have an account? <Link to="/login">Log In</Link>
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

                .radio-group {
                    display: flex;
                    gap: 1.5rem;
                    margin-top: 0.5rem;
                }

                .radio-label {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    cursor: pointer;
                    font-size: 0.95rem;
                    font-weight: 500;
                    color: var(--text-primary);
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
