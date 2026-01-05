import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from './ui/Button';
import './Navbar.css';
import LogoImage from '../assets/LogoImage.png';
import { useCart } from '../context/CartContext';
import { ShoppingCart, User, Menu, LogOut, Home, Image, HelpCircle, LayoutDashboard, X } from 'lucide-react';

const Navbar = () => {
    const { user, profile, signOut } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const { getItemCount } = useCart();
    const cartCount = getItemCount();

    const isProvider = (role) => {
        const providerRoles = ['photographer', 'Event', 'Club', 'Agency', 'Federation', 'Club/Association', 'Other'];
        return providerRoles.includes(role);
    };

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

    const navigateToDashboard = () => {
        if (profile?.role === 'admin') navigate('/admin');
        else if (isProvider(profile?.role)) navigate('/photographer/dashboard');
        else navigate('/my-purchases');
        closeMenu();
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link to="/" className="navbar-logo" onClick={closeMenu}>
                    <div className="logo-text-container">
                        <span className="logo-capture">CAPTURE</span>
                        <span className="logo-run">RUN</span>
                        <div className="logo-square"></div>
                    </div>
                </Link>

                {/* Mobile Right Actions */}
                <div className="mobile-nav-actions-wrapper">
                    {!isMenuOpen && user && (
                        <button
                            className="mobile-nav-prominent-btn"
                            onClick={navigateToDashboard}
                        >
                            <LayoutDashboard size={20} />
                            <span>
                                {isProvider(profile?.role) || profile?.role === 'admin' ? 'DASHBOARD' : 'PURCHASES'}
                            </span>
                        </button>
                    )}

                    {!isMenuOpen && (
                        <button
                            className="hamburger-menu"
                            onClick={() => setIsMenuOpen(true)}
                            aria-label="Toggle menu"
                        >
                            <Menu size={24} />
                        </button>
                    )}
                </div>

                {/* Desktop Navigation */}
                <div className="navbar-links desktop-nav">
                    <Link to="/" className="nav-link">HOME</Link>
                    <Link to="/albums" className="nav-link">ALBUMS</Link>
                    <Link to="/how-it-works" className="nav-link">HOW IT WORKS</Link>
                </div>

                {/* Desktop Auth/Dashboard Buttons */}
                <div className="navbar-auth desktop-nav">
                    {user ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                            <Button
                                variant="primary"
                                className="dashboard-btn"
                                onClick={navigateToDashboard}
                            >
                                <span className="user-icon"><User size={18} /></span>
                                {isProvider(profile?.role) || profile?.role === 'admin' ? 'DASHBOARD' : 'MY PURCHASES'}
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
                                            <span className="profile-menu-name">{profile?.full_name || 'User'}</span>
                                            <span className="profile-menu-email">{user.email}</span>
                                            <span className="role-badge">
                                                {profile?.provider_type ?
                                                    `${profile.role} • ${profile.provider_type}` :
                                                    (profile?.role || 'Client')
                                                }
                                            </span>
                                        </div>

                                        {isProvider(profile?.role) && (
                                            <button
                                                className="profile-menu-item"
                                                onClick={() => {
                                                    navigate('/photographer/settings');
                                                    setIsProfileOpen(false);
                                                }}
                                            >
                                                <User size={18} /> Profile Info
                                            </button>
                                        )}

                                        <button className="profile-menu-item" onClick={navigateToDashboard}>
                                            <LayoutDashboard size={18} /> {isProvider(profile?.role) || profile?.role === 'admin' ? 'My Dashboard' : 'My Purchases'}
                                        </button>

                                        <button
                                            className="profile-menu-item"
                                            onClick={() => {
                                                navigate('/cart');
                                                setIsProfileOpen(false);
                                            }}
                                        >
                                            <ShoppingCart size={18} /> My Cart {cartCount > 0 && <span className="cart-badge-inline">{cartCount}</span>}
                                        </button>

                                        <button onClick={handleLogout} className="profile-menu-item logout-item">
                                            <LogOut size={18} /> Sign Out
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <Link to="/login">
                                <Button variant="outline" className="action-btn">Log In</Button>
                            </Link>
                            <Link to="/register">
                                <Button variant="primary" className="action-btn">Sign Up</Button>
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
                        <button onClick={closeMenu} className="close-menu"><X size={24} /></button>
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
                                <span className="mobile-nav-icon"><Home size={20} /></span> HOME
                            </Link>
                            <Link to="/albums" className="mobile-nav-link" onClick={closeMenu}>
                                <span className="mobile-nav-icon"><Image size={20} /></span> ALBUMS
                            </Link>
                            <Link to="/how-it-works" className="mobile-nav-link" onClick={closeMenu}>
                                <span className="mobile-nav-icon"><HelpCircle size={20} /></span> HELP
                            </Link>

                            {user && (
                                <button className="mobile-nav-link" onClick={navigateToDashboard} style={{ background: 'none', border: 'none', textAlign: 'left', font: 'inherit', padding: '1rem', width: '100%' }}>
                                    <span className="mobile-nav-icon"><LayoutDashboard size={20} /></span> DASHBOARD
                                </button>
                            )}

                            <Link to="/cart" className="mobile-nav-link" onClick={closeMenu}>
                                <span className="mobile-nav-icon"><ShoppingCart size={20} /></span> CART {cartCount > 0 && <span className="cart-badge-mobile">{cartCount}</span>}
                            </Link>
                        </div>

                        {/* Auth Buttons */}
                        <div className="mobile-auth-section">
                            {user ? (
                                <Button
                                    variant="outline"
                                    onClick={handleLogout}
                                    style={{ width: '100%', justifyContent: 'center' }}
                                >
                                    <LogOut size={18} /> Sign Out
                                </Button>
                            ) : (
                                <>
                                    <Link to="/login" onClick={closeMenu} style={{ width: '100%' }}>
                                        <Button variant="outline" className="action-btn" style={{ width: '100%' }}>Log In</Button>
                                    </Link>
                                    <Link to="/register" onClick={closeMenu} style={{ width: '100%' }}>
                                        <Button variant="primary" className="action-btn" style={{ width: '100%' }}>Sign Up</Button>
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
