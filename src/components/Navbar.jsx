import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from './ui/Button';
import './Navbar.css';
import LogoImage from '../assets/LogoImage.png';
import { useCart } from '../context/CartContext';

const Navbar = () => {
    const { user, profile, signOut } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const { getItemCount } = useCart();
    const cartCount = getItemCount();

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
        setIsMenuOpen(false);
        setIsProfileOpen(false);
    };

    const closeMenu = () => {
        setIsMenuOpen(false);
        setIsProfileOpen(false);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isProfileOpen && !event.target.closest('.profile-dropdown-container')) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isProfileOpen]);

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link to="/" className="navbar-logo" onClick={closeMenu}>
                    <img src={LogoImage} alt="Logo" />
                </Link>

                {/* Hamburger Menu Button - Mobile Only */}
                <button
                    className="hamburger-menu"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    aria-label="Toggle menu"
                >
                    <span className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></span>
                    <span className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></span>
                    <span className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></span>
                </button>

                {/* Desktop Navigation */}
                <div className="navbar-links desktop-nav">
                    <Link to="/" className="nav-link">ACCUEIL</Link>
                    <Link to="/albums" className="nav-link">ALBUMS</Link>
                    <Link to="/how-it-works" className="nav-link">COMMENT ÇA MARCHE ?</Link>
                </div>

                {/* Desktop Auth/Dashboard Buttons */}
                <div className="navbar-auth desktop-nav">
                    {user ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                            <Button
                                variant="outline"
                                className="dashboard-btn"
                                onClick={() => {
                                    if (profile?.role === 'admin') navigate('/admin');
                                    else if (profile?.role === 'photographer') navigate('/photographer/dashboard');
                                    else navigate('/my-purchases');
                                }}
                            >
                                <span className="user-icon">👤</span> {profile?.role === 'photographer' || profile?.role === 'admin' ? 'DASHBOARD' : 'MY PURCHASES'}
                            </Button>

                            {/* Profile Dropdown */}
                            <div className="profile-dropdown-container">
                                <button
                                    className="profile-trigger"
                                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                                >
                                    <div className="navbar-user-avatar">
                                        {profile?.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                                    </div>
                                </button>

                                {isProfileOpen && (
                                    <div className="profile-dropdown-menu">
                                        <div className="profile-menu-header">
                                            <span className="profile-menu-name">{profile?.full_name || 'Utilisateur'}</span>
                                            <span className="profile-menu-email">{user.email}</span>
                                            <span className="role-badge">{profile?.role || 'Client'}</span>
                                        </div>

                                        <button
                                            className="profile-menu-item"
                                            onClick={() => {
                                                if (profile?.role === 'admin') navigate('/admin');
                                                else if (profile?.role === 'photographer') navigate('/photographer/dashboard');
                                                else navigate('/my-purchases');
                                                setIsProfileOpen(false);
                                            }}
                                        >
                                            📁 {profile?.role === 'photographer' || profile?.role === 'admin' ? 'Mon Dashboard' : 'My Purchases'}
                                        </button>

                                        {profile?.role === 'photographer' && (
                                            <button
                                                className="profile-menu-item"
                                                onClick={() => {
                                                    navigate('/photographer/packages');
                                                    setIsProfileOpen(false);
                                                }}
                                            >
                                                ⚙️ Mes Tarifs
                                            </button>
                                        )}

                                        <button
                                            className="profile-menu-item"
                                            onClick={() => {
                                                navigate('/cart');
                                                setIsProfileOpen(false);
                                            }}
                                        >
                                            🛒 Mon Panier {cartCount > 0 && <span className="cart-badge-inline">{cartCount}</span>}
                                        </button>

                                        <button onClick={handleLogout} className="profile-menu-item logout-item">
                                            🚪 Se déconnecter
                                        </button>
                                    </div>
                                )}
                            </div>
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

                {/* Mobile Menu Overlay */}
                {isMenuOpen && (
                    <div className="mobile-menu-overlay open" onClick={closeMenu}></div>
                )}

                {/* Mobile Slide-out Menu */}
                <div className={`mobile-menu ${isMenuOpen ? 'open' : ''}`}>
                    <div className="mobile-menu-header">
                        <span className="mobile-menu-title">Menu</span>
                    </div>

                    <div className="mobile-menu-content">
                        {/* User Info */}
                        {user && (
                            <div className="mobile-user-info">
                                <div className="mobile-user-avatar">
                                    {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div>
                                    <div className="mobile-user-name">{profile?.full_name || 'User'}</div>
                                    <div className="mobile-user-role">{profile?.role || 'Guest'}</div>
                                </div>
                            </div>
                        )}

                        {/* Navigation Links */}
                        <div className="mobile-nav-links">
                            <Link to="/" className="mobile-nav-link" onClick={closeMenu}>
                                <span className="mobile-nav-icon">🏠</span>
                                ACCUEIL
                            </Link>
                            <Link to="/albums" className="mobile-nav-link" onClick={closeMenu}>
                                <span className="mobile-nav-icon">🖼️</span>
                                ALBUMS
                            </Link>
                            <Link to="/how-it-works" className="mobile-nav-link" onClick={closeMenu}>
                                <span className="mobile-nav-icon">❓</span>
                                COMMENT ÇA MARCHE ?
                            </Link>

                            {user && (
                                <Link
                                    to={profile?.role === 'admin' ? '/admin' : (profile?.role === 'photographer' ? '/photographer/dashboard' : '/my-purchases')}
                                    className="mobile-nav-link"
                                    onClick={closeMenu}
                                >
                                    <span className="mobile-nav-icon">👤</span>
                                    DASHBOARD
                                </Link>
                            )}

                            <Link to="/cart" className="mobile-nav-link" onClick={closeMenu}>
                                <span className="mobile-nav-icon">🛒</span>
                                PANIER {cartCount > 0 && <span className="cart-badge-mobile">{cartCount}</span>}
                            </Link>
                        </div>

                        {/* Auth Buttons */}
                        <div className="mobile-auth-section">
                            {user ? (
                                <Button
                                    variant="outline"
                                    onClick={handleLogout}
                                    style={{ width: '100%' }}
                                >
                                    Sign Out
                                </Button>
                            ) : (
                                <>
                                    <Link to="/login" onClick={closeMenu} style={{ width: '100%' }}>
                                        <Button variant="outline" style={{ width: '100%' }}>Log In</Button>
                                    </Link>
                                    <Link to="/register" onClick={closeMenu} style={{ width: '100%' }}>
                                        <Button variant="primary" style={{ width: '100%' }}>Sign Up</Button>
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
