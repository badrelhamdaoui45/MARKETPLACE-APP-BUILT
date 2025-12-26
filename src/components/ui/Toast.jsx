
import React, { useEffect } from 'react';
import './ui.css';

const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [onClose, duration]);

    return (
        <div className={`toast toast-${type}`}>
            <div className="toast-icon">
                {type === 'success' ? '✓' : 'ℹ'}
            </div>
            <span className="toast-message">{message}</span>
            <button onClick={onClose} className="toast-close">×</button>
        </div>
    );
};

export default Toast;
