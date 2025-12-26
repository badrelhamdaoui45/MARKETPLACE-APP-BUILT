
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import '../components/ui/ui.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const { error } = await signIn(email, password);
        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            // Navigation will be handled by the route protection logic or we navigate to dashboard
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
                <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Welcome Back</h2>
                {error && <div className="error-alert" style={{ color: '#ef4444', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
                <form onSubmit={handleLogin}>
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
                    <Button type="submit" className="w-full" disabled={loading} style={{ width: '100%', marginTop: '1rem' }}>
                        {loading ? 'Signing In...' : 'Sign In'}
                    </Button>
                </form>
                <p style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Don't have an account? <Link to="/register" style={{ color: 'var(--accent-primary)' }}>Sign Up</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
