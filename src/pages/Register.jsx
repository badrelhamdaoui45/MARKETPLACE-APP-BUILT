
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
        <div className="auth-container" style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh'
        }}>
            <div className="auth-card" style={{
                backgroundColor: 'var(--bg-secondary)',
                padding: '2rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                width: '100%',
                maxWidth: '400px'
            }}>
                <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Create Account</h2>
                {error && <div className="error-alert" style={{ color: '#ef4444', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
                <form onSubmit={handleRegister}>
                    <Input
                        label="Full Name"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                    />
                    <Input
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <Input
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    <div className="input-group" style={{ marginBottom: '1rem' }}>
                        <label className="input-label" style={{ marginBottom: '0.5rem', display: 'block' }}>I am a...</label>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="role"
                                    value="buyer"
                                    checked={role === 'buyer'}
                                    onChange={(e) => setRole(e.target.value)}
                                />
                                Buyer
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
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

                    <Button type="submit" className="w-full" disabled={loading} style={{ width: '100%', marginTop: '1rem' }}>
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </Button>
                </form>
                <p style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Already have an account? <Link to="/login" style={{ color: 'var(--accent-primary)' }}>Sign In</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
