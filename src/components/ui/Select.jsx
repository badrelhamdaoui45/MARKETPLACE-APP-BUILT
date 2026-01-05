
import React from 'react';

const Select = ({ label, options, error, className = '', ...props }) => {
    return (
        <div className={`input-group ${className}`}>
            {label && <label className="input-label">{label}</label>}
            <select
                className={`input-field ${error ? 'input-error' : ''}`}
                {...props}
            >
                <option value="">Select an option</option>
                {options.map((option) => (
                    <option key={option} value={option}>
                        {option}
                    </option>
                ))}
            </select>
            {error && <span className="input-error-msg">{error}</span>}
        </div>
    );
};

export default Select;
