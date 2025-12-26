
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from './ui/Button';
import './Navbar.css';

const Navbar = () => {
    const { user, profile, signOut } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link to="/" className="navbar-logo">
                    PhotoMarket
                </Link>

                <div className={`navbar-links ${isMenuOpen ? 'active' : ''}`}>
                    {/* Common Links */}
                    <Link to="/" className="nav-link">Marketplace</Link>

                    {/* Protected Links based on Role */}
                    {user && profile?.role === 'photographer' && (
                        <>
                            <Link to="/photographer/dashboard" className="nav-link">Dashboard</Link>
                            <Link to="/photographer/upload" className="nav-link">Upload</Link>
                        </>
                    )}

                    {user && profile?.role === 'admin' && (
                        <Link to="/admin" className="nav-link">Admin Panel</Link>
                    )}

                    {user && profile?.role === 'buyer' && (
                        <Link to="/my-purchases" className="nav-link">My Purchases</Link>
                    )}
                </div>

                <div className="navbar-auth">
                    {user ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span className="user-greeting">Hi, {profile?.full_name || 'User'}</span>
                            <Button variant="outline" onClick={handleLogout} style={{ padding: '0.5rem 1rem' }}>
                                Sign Out
                            </Button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <Link to="/login">
                                <Button variant="outline">Log In</Button>
                            </Link>
                            <Link to="/register">
                                <Button variant="primary">Sign Up</Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
