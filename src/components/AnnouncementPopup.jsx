
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, ExternalLink, Sparkles } from 'lucide-react';
import Button from './ui/Button';

const AnnouncementPopup = () => {
    const [popupContent, setPopupContent] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isClosed, setIsClosed] = useState(false);

    useEffect(() => {
        // Check if recently closed in this session
        const hasBeenSeen = sessionStorage.getItem('announcement-seen');
        if (hasBeenSeen) return;

        fetchActivePopup();
    }, []);

    const fetchActivePopup = async () => {
        try {
            const { data, error } = await supabase
                .from('popups')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (data) {
                setPopupContent(data);

                // Show after the specified delay
                setTimeout(() => {
                    setIsVisible(true);
                }, data.display_delay || 2000);
            }
        } catch (error) {
            console.error('Error fetching popup:', error);
        }
    };

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => {
            setIsClosed(true);
            sessionStorage.setItem('announcement-seen', 'true');
        }, 500); // Wait for fade-out animation
    };

    if (isClosed || !popupContent) return null;

    return (
        <div className={`popup-overlay ${isVisible ? 'visible' : ''}`} onClick={handleClose}>
            <div
                className={`popup-content ${isVisible ? 'slide-in' : ''}`}
                onClick={(e) => e.stopPropagation()}
            >
                <button className="popup-close" onClick={handleClose}>
                    <X size={20} />
                </button>

                <div className="popup-layout">
                    {popupContent.image_url && (
                        <div className="popup-image-container">
                            <img src={popupContent.image_url} alt={popupContent.title} />
                            <div className="popup-badge">
                                <Sparkles size={14} /> New
                            </div>
                        </div>
                    )}

                    <div className="popup-text-content">
                        <h2 className="popup-title">{popupContent.title}</h2>
                        <p className="popup-message">{popupContent.message}</p>

                        <div className="popup-actions">
                            {popupContent.button_link && (
                                <Button
                                    className="popup-cta-btn action-btn"
                                    onClick={() => {
                                        window.location.href = popupContent.button_link;
                                        handleClose();
                                    }}
                                >
                                    {popupContent.button_text}
                                    <ExternalLink size={16} />
                                </Button>
                            )}
                            <button className="popup-skip" onClick={handleClose}>
                                Maybe later
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .popup-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.4);
                    backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .popup-overlay.visible {
                    opacity: 1;
                    pointer-events: auto;
                }

                .popup-content {
                    background: white;
                    width: 90%;
                    max-width: 850px;
                    border-radius: 24px;
                    overflow: hidden;
                    position: relative;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    transform: scale(0.9) translateY(40px);
                    transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
                }

                .popup-content.slide-in {
                    transform: scale(1) translateY(0);
                }

                .popup-close {
                    position: absolute;
                    top: 1.5rem;
                    right: 1.5rem;
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: white;
                    border: 1px solid var(--border-light);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    z-index: 10;
                    color: var(--text-secondary);
                    transition: all 0.2s ease;
                }

                .popup-close:hover {
                    background: var(--bg-secondary);
                    color: var(--text-primary);
                    transform: rotate(90deg);
                }

                .popup-layout {
                    display: grid;
                    grid-template-columns: 1.2fr 1fr;
                    min-height: 480px;
                }

                .popup-image-container {
                    position: relative;
                    overflow: hidden;
                }

                .popup-image-container img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .popup-badge {
                    position: absolute;
                    top: 1.5rem;
                    left: 1.5rem;
                    background: var(--primary-blue);
                    color: white;
                    padding: 0.5rem 1rem;
                    border-radius: 99px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                }

                .popup-text-content {
                    padding: 3.5rem 3rem;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }

                .popup-title {
                    font-family: 'Montserrat', sans-serif;
                    font-size: 2.25rem;
                    font-weight: 900;
                    margin-bottom: 1.5rem;
                    color: var(--text-primary);
                    line-height: 1.1;
                }

                .popup-message {
                    font-size: 1.1rem;
                    line-height: 1.6;
                    color: var(--text-secondary);
                    margin-bottom: 2.5rem;
                }

                .popup-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .popup-cta-btn {
                    height: 56px !important;
                    font-size: 1rem !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    gap: 0.75rem !important;
                }

                .popup-skip {
                    background: none;
                    border: none;
                    color: var(--text-tertiary);
                    font-size: 0.9rem;
                    font-weight: 600;
                    cursor: pointer;
                    padding: 0.5rem;
                    transition: color 0.2s ease;
                }

                .popup-skip:hover {
                    color: var(--text-secondary);
                    text-decoration: underline;
                }

                @media (max-width: 900px) {
                    .popup-layout {
                        grid-template-columns: 1fr;
                    }

                    .popup-image-container {
                        height: 200px;
                    }

                    .popup-text-content {
                        padding: 2rem;
                        text-align: center;
                    }

                    .popup-title {
                        font-size: 1.75rem;
                        margin-bottom: 1rem;
                    }

                    .popup-message {
                        font-size: 0.95rem;
                        margin-bottom: 1.5rem;
                    }

                    .popup-close {
                        background: white;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    }
                }
            `}</style>
        </div>
    );
};

export default AnnouncementPopup;
