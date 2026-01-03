
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, ExternalLink, Sparkles } from 'lucide-react';
import Button from './ui/Button';

/**
 * DynamicPopup Component
 * Fetches popup content from the 'popups' table based on the specified type.
 * Supports placeholder replacement like {{album_title}}.
 */
const DynamicPopup = ({ type = 'announcement', placeholders = {} }) => {
    const [popupContent, setPopupContent] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isClosed, setIsClosed] = useState(false);

    useEffect(() => {
        const fetchPopup = async () => {
            // Priority Check: If recently closed in this session (only if show_once is true in DB)
            const sessionKey = `popup-seen-${type}`;
            const hasBeenSeen = sessionStorage.getItem(sessionKey);

            try {
                const { data, error } = await supabase
                    .from('popups')
                    .select('*')
                    .eq('is_active', true)
                    .eq('type', type)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (error || !data) return;

                // Stop if already seen this session and show_once is enabled
                if (data.show_once && hasBeenSeen) return;

                // Replace placeholders in title and message
                let processedTitle = data.title;
                let processedMessage = data.message;

                Object.keys(placeholders).forEach(key => {
                    const regex = new RegExp(`{{${key}}}`, 'g');
                    processedTitle = processedTitle.replace(regex, placeholders[key]);
                    processedMessage = processedMessage.replace(regex, placeholders[key]);
                });

                setPopupContent({
                    ...data,
                    title: processedTitle,
                    message: processedMessage
                });

                // Show after the specified delay
                setTimeout(() => {
                    setIsVisible(true);
                }, data.display_delay || 1500);

            } catch (err) {
                console.error('Error fetching dynamic popup:', err);
            }
        };

        fetchPopup();
    }, [type, JSON.stringify(placeholders)]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => {
            setIsClosed(true);
            if (popupContent?.show_once) {
                sessionStorage.setItem(`popup-seen-${type}`, 'true');
            }
        }, 500);
    };

    if (isClosed || !popupContent) return null;

    return (
        <div className={`dynamic-popup-overlay ${isVisible ? 'visible' : ''}`} onClick={handleClose}>
            <div
                className={`dynamic-popup-content ${isVisible ? 'reveal' : ''}`}
                onClick={(e) => e.stopPropagation()}
            >
                <button className="popup-close-trigger" onClick={handleClose}>
                    <X size={20} />
                </button>

                <div className="popup-flex-layout">
                    {popupContent.image_url && (
                        <div className="popup-visual-side">
                            <img src={popupContent.image_url} alt={popupContent.title} loading="lazy" />
                            <div className="floating-badge">
                                <Sparkles size={14} /> New
                            </div>
                        </div>
                    )}

                    <div className="popup-text-side">
                        {popupContent.coupon_code && (
                            <div className="special-offer-tag">Special Offer</div>
                        )}
                        <h2 className="popup-headline">{popupContent.title}</h2>
                        <p className="popup-description">{popupContent.message}</p>

                        {popupContent.coupon_code && (
                            <div className="exclusive-coupon-box">
                                <span className="label">COUPON CODE:</span>
                                <span className="code">{popupContent.coupon_code}</span>
                            </div>
                        )}

                        <div className="popup-main-actions">
                            {popupContent.button_link && (
                                <Button
                                    className="popup-cta-btn action-btn"
                                    onClick={() => {
                                        if (popupContent.button_link.startsWith('http')) {
                                            window.open(popupContent.button_link, '_blank');
                                        } else {
                                            window.location.href = popupContent.button_link;
                                        }
                                        handleClose();
                                    }}
                                >
                                    {popupContent.button_text || 'View Details'}
                                    <ExternalLink size={16} />
                                </Button>
                            )}
                            <button className="popup-dismiss" onClick={handleClose}>
                                Maybe later
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .dynamic-popup-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(10px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 99999;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.5s ease;
                }

                .dynamic-popup-overlay.visible {
                    opacity: 1;
                    pointer-events: auto;
                }

                .dynamic-popup-content {
                    background: white;
                    width: 90%;
                    max-width: 800px;
                    border-radius: 32px;
                    overflow: hidden;
                    position: relative;
                    box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.4);
                    transform: scale(0.9) translateY(30px);
                    transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
                }

                .dynamic-popup-content.reveal {
                    transform: scale(1) translateY(0);
                }

                .popup-close-trigger {
                    position: absolute;
                    top: 1.5rem;
                    right: 1.5rem;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: white;
                    border: 1px solid #e2e8f0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    z-index: 50;
                    color: #64748b;
                    transition: all 0.3s ease;
                }

                .popup-close-trigger:hover {
                    background: #f8fafc;
                    transform: rotate(90deg);
                    color: #1e293b;
                }

                .popup-flex-layout {
                    display: grid;
                    grid-template-columns: 1.1fr 1fr;
                    min-height: 450px;
                }

                .popup-visual-side {
                    position: relative;
                    background: #f1f5f9;
                }

                .popup-visual-side img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .floating-badge {
                    position: absolute;
                    top: 1.5rem;
                    left: 1.5rem;
                    background: var(--primary-blue);
                    color: white;
                    padding: 0.5rem 1rem;
                    border-radius: 99px;
                    font-size: 0.75rem;
                    font-weight: 800;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    text-transform: uppercase;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                }

                .popup-text-side {
                    padding: 3.5rem 2.5rem;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }

                .special-offer-tag {
                    color: #d97706;
                    background: #fef3c7;
                    display: inline-block;
                    padding: 0.25rem 0.75rem;
                    border-radius: 99px;
                    font-size: 0.7rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    margin-bottom: 1rem;
                    width: fit-content;
                }

                .popup-headline {
                    font-size: 2.2rem;
                    font-weight: 900;
                    line-height: 1.1;
                    color: #0f172a;
                    margin-bottom: 1.25rem;
                }

                .popup-description {
                    font-size: 1rem;
                    line-height: 1.6;
                    color: #475569;
                    margin-bottom: 2rem;
                }

                .exclusive-coupon-box {
                    background: #f8fafc;
                    border: 2px dashed #cbd5e1;
                    padding: 1.25rem;
                    border-radius: 16px;
                    margin-bottom: 2rem;
                    text-align: center;
                }

                .exclusive-coupon-box .label {
                    display: block;
                    font-size: 0.7rem;
                    color: #94a3b8;
                    font-weight: 800;
                    text-transform: uppercase;
                    margin-bottom: 0.25rem;
                }

                .exclusive-coupon-box .code {
                    font-size: 1.75rem;
                    font-weight: 900;
                    color: #1e293b;
                    letter-spacing: 0.1em;
                }

                .popup-main-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .popup-cta-btn {
                    height: 56px !important;
                    font-size: 1.05rem !important;
                    font-weight: 800 !important;
                }

                .popup-dismiss {
                    background: none;
                    border: none;
                    color: #94a3b8;
                    font-size: 0.9rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: color 0.2s;
                }

                .popup-dismiss:hover {
                    color: #64748b;
                    text-decoration: underline;
                }

                @media (max-width: 800px) {
                    .popup-flex-layout { grid-template-columns: 1fr; }
                    .popup-visual-side { height: 200px; }
                    .popup-text-side { padding: 2.5rem 2rem; text-align: center; }
                    .special-offer-tag { margin: 0 auto 1rem; }
                    .popup-headline { font-size: 1.75rem; }
                }
            `}</style>
        </div>
    );
};

export default DynamicPopup;
