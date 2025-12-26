
import React from 'react';

const Input = ({ label, error, className = '', ...props }) => {
    return (
        <div className={`input-group ${className}`}>
            {label && <label className="input-label">{label}</label>}
            <input className={`input-field ${error ? 'input-error' : ''}`} {...props} />
            {error && <span className="input-error-msg">{error}</span>}
        </div>
    );
};

export default Input;
