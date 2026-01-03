import React from 'react';
import Button from './Button';

const Modal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'danger', showCancel = true }) => {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            animation: 'fadeIn 0.2s ease'
        }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'var(--bg-primary)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '2rem',
                    maxWidth: '500px',
                    width: '90%',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                    border: '1px solid var(--border-subtle)',
                    animation: 'slideUp 0.3s ease'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{
                        fontSize: '1.5rem',
                        marginBottom: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                    }}>
                        {variant === 'danger' && (
                            <span style={{
                                fontSize: '2rem',
                                color: '#ef4444'
                            }}>⚠️</span>
                        )}
                        {title}
                    </h2>
                </div>

                {/* Message */}
                <p style={{
                    color: 'var(--text-secondary)',
                    lineHeight: '1.6',
                    marginBottom: '2rem'
                }}>
                    {message}
                </p>

                {/* Actions */}
                <div style={{
                    display: 'flex',
                    gap: '1rem',
                    justifyContent: 'flex-end'
                }}>
                    {showCancel && (
                        <Button
                            variant="outline"
                            onClick={onClose}
                            style={{ minWidth: '100px' }}
                        >
                            {cancelText}
                        </Button>
                    )}
                    <Button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        style={{
                            minWidth: '100px',
                            background: variant === 'danger' ? '#ef4444' : 'var(--accent-primary)',
                            borderColor: variant === 'danger' ? '#ef4444' : 'var(--accent-primary)'
                        }}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { 
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to { 
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
};

export default Modal;
