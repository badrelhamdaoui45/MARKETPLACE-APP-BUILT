import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Twitter, Facebook, Mail, ExternalLink } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import './Footer.css';

const Footer = () => {
    const { t } = useLanguage();
    const currentYear = new Date().getFullYear();

    return (
        <footer className="site-footer">
            <div className="footer-container">
                <div className="footer-top">
                    <div className="footer-brand">
                        <Link to="/" className="footer-logo">
                            <div className="logo-text-container">
                                <span className="logo-capture">RUN</span>
                                <span className="logo-run">CAPTURES</span>
                                <div className="logo-square"></div>
                            </div>
                        </Link>
                        <p className="footer-description">
                            The premium marketplace for photographers and event participants.
                            Capture every moment, preserve every memory.
                        </p>
                        <div className="footer-socials">
                            <a href="#" className="social-icon" aria-label="Instagram"><Instagram size={20} /></a>
                            <a href="#" className="social-icon" aria-label="Twitter"><Twitter size={20} /></a>
                            <a href="#" className="social-icon" aria-label="Facebook"><Facebook size={20} /></a>
                        </div>
                    </div>

                    <div className="footer-links-grid">
                        <div className="footer-link-group">
                            <h4>Platform</h4>
                            <Link to="/albums">Browse Albums</Link>
                            <Link to="/how-it-works">How it Works</Link>
                            <Link to="/pricing">Pricing</Link>
                        </div>
                        <div className="footer-link-group">
                            <h4>Support</h4>
                            <Link to="/contact">Contact Us</Link>
                            <Link to="/faq">FAQ</Link>
                            <Link to="/help">Help Center</Link>
                        </div>
                        <div className="footer-link-group">
                            <h4>{t('footer_terms')}</h4>
                            <Link to="/terms">{t('footer_terms')}</Link>
                            <Link to="/privacy">{t('footer_privacy')}</Link>
                            <Link to="/cookies">{t('footer_cookies')}</Link>
                        </div>
                    </div>
                </div>

                <div className="footer-bottom">
                    <div className="footer-copyright">
                        © {currentYear} CAPTURE RUN. {t('footer_rights')}
                    </div>
                    <div className="footer-bottom-links">
                        <span className="built-with">
                            Built for Photographers <ExternalLink size={14} />
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
