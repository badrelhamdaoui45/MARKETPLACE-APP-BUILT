import React, { useEffect } from 'react';
import Button from './Button';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'danger', showCancel = true, showFooter = true, children }) => {

    // Lock scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-container"
                onClick={(e) => e.stopPropagation()}
                style={{
                    variant: variant // for dynamic reference if needed
                }}
            >
                {/* Header */}
                <div className="modal-header">
                    <h2 className="modal-title">
                        {variant === 'danger' && (
                            <span className="modal-title-icon">⚠️</span>
                        )}
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="modal-close-btn"
                        aria-label="Close modal"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="modal-body">
                    {message && (
                        <p className="modal-message">
                            {message}
                        </p>
                    )}
                    {children}
                </div>

                {/* Footer */}
                {showFooter && (
                    <div className="modal-footer">
                        {showCancel && (
                            <Button
                                variant="outline"
                                onClick={onClose}
                                className="modal-btn-cancel"
                            >
                                {cancelText}
                            </Button>
                        )}
                        <Button
                            onClick={() => {
                                if (onConfirm) {
                                    onConfirm();
                                    onClose();
                                }
                            }}
                            className="modal-btn-confirm"
                            style={{
                                background: variant === 'danger' ? '#ef4444' : 'var(--accent-primary)',
                                borderColor: variant === 'danger' ? '#ef4444' : 'var(--accent-primary)'
                            }}
                        >
                            {confirmText}
                        </Button>
                    </div>
                )}
            </div>

            <style>{`
                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.65);
                    backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    padding: 20px;
                    animation: modalFadeIn 0.2s ease-out;
                }

                .modal-container {
                    background: white;
                    border-radius: 20px;
                    width: 100%;
                    max-width: 480px;
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    position: relative;
                    animation: modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    overflow: hidden;
                }

                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1.25rem 1.5rem;
                    border-bottom: 1px solid #f1f5f9;
                }

                .modal-title {
                    font-size: 1.25rem;
                    font-weight: 800;
                    color: #0f172a;
                    margin: 0;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .modal-title-icon {
                    font-size: 1.5rem;
                }

                .modal-close-btn {
                    background: #f1f5f9;
                    border: none;
                    cursor: pointer;
                    color: #64748b;
                    padding: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 10px;
                    transition: all 0.2s;
                }

                .modal-close-btn:hover {
                    background: #e2e8f0;
                    color: #0f172a;
                    transform: rotate(90deg);
                }

                .modal-body {
                    padding: 1.5rem;
                    overflow-y: auto;
                    flex: 1;
                    scrollbar-width: thin;
                    scrollbar-color: #cbd5e1 transparent;
                }

                .modal-message {
                    color: #475569;
                    line-height: 1.6;
                    margin-bottom: 1rem;
                    font-size: 0.95rem;
                }

                .modal-footer {
                    display: flex;
                    gap: 1rem;
                    justify-content: flex-end;
                    padding: 1.25rem 1.5rem;
                    background: #f8fafc;
                    border-top: 1px solid #f1f5f9;
                }

                .modal-btn-cancel, .modal-btn-confirm {
                    min-width: 100px;
                    border-radius: 12px !important;
                    font-weight: 700 !important;
                }

                @keyframes modalFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes modalSlideUp {
                    from { 
                        opacity: 0;
                        transform: translateY(20px) scale(0.98);
                    }
                    to { 
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }

                /* Mobile Optimization */
                @media (max-width: 640px) {
                    .modal-overlay {
                        padding: 0;
                        align-items: flex-end;
                    }

                    .modal-container {
                        max-width: 100%;
                        max-height: 92vh;
                        border-radius: 24px 24px 0 0;
                        animation: modalSlideUpMobile 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                    }

                    .modal-header {
                        padding: 1rem 1.25rem;
                    }

                    .modal-body {
                        padding: 1.25rem;
                    }

                    .modal-footer {
                        padding: 1rem 1.25rem;
                        padding-bottom: calc(1rem + env(safe-area-inset-bottom));
                    }
                }

                @keyframes modalSlideUpMobile {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default Modal;
