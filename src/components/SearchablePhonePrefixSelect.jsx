import React, { useState, useEffect, useRef } from 'react';
import { stripeCountries } from '../utils/stripeCountries';

const SearchablePhonePrefixSelect = ({ value, onChange, padding = '0.75rem 1rem', fontSize = '0.95rem', standalone = false }) => {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Find the country object corresponding to the current code prefix or code itself
    // Note: value can be the prefix (e.g. '+212') or country code (e.g. 'MA')
    const selectedCountryObj = stripeCountries.find(c => c.code === value || c.prefix === value) || stripeCountries[0];

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filtered = stripeCountries.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase()) ||
        c.prefix.includes(search)
    );

    return (
        <div ref={containerRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', width: standalone ? '110px' : 'auto' }}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    background: '#f8fafc',
                    padding: padding,
                    border: standalone ? '1px solid #e2e8f0' : 'none',
                    borderRight: standalone ? '1px solid #e2e8f0' : '1px solid #cbd5e1',
                    borderRadius: standalone ? '8px' : '0px',
                    color: '#334155',
                    fontWeight: '600',
                    fontSize: fontSize,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    userSelect: 'none',
                    minWidth: standalone ? '100px' : '75px',
                    width: '100%',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box',
                    boxShadow: standalone ? 'inset 0 1px 2px rgba(0,0,0,0.02)' : 'none'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
            >
                <span>{selectedCountryObj ? selectedCountryObj.prefix : '+1'}</span>
                <span style={{ fontSize: '0.65rem', color: '#64748b', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
            </div>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    width: '280px',
                    marginTop: '6px',
                    background: 'white',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)',
                    zIndex: 99999,
                    maxHeight: '250px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    animation: 'slideDown 0.15s ease-out'
                }}>
                    <input
                        type="text"
                        placeholder="Search country or code..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            padding: '0.75rem',
                            border: 'none',
                            borderBottom: '1px solid #e2e8f0',
                            outline: 'none',
                            fontSize: '0.9rem',
                            width: '100%',
                            boxSizing: 'border-box',
                            background: '#f8fafc',
                            color: '#1e293b'
                        }}
                        autoFocus
                    />
                    <div style={{ overflowY: 'auto', flex: 1, maxHeight: '200px' }}>
                        {filtered.length === 0 ? (
                            <div style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#64748b', textAlign: 'center' }}>
                                No results match "{search}"
                            </div>
                        ) : (
                            filtered.map(c => (
                                <div
                                    key={c.code}
                                    onClick={() => {
                                        onChange(c.code);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                    style={{
                                        padding: '0.625rem 0.75rem',
                                        fontSize: '0.9rem',
                                        color: '#1e293b',
                                        cursor: 'pointer',
                                        background: (value === c.code || value === c.prefix) ? '#eff6ff' : 'transparent',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        transition: 'background 0.15s ease',
                                        borderBottom: '1px solid #f1f5f9'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = (value === c.code || value === c.prefix) ? '#eff6ff' : 'transparent'}
                                >
                                    <span style={{ marginRight: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: (value === c.code || value === c.prefix) ? '600' : 'normal' }}>
                                        {c.name} ({c.code})
                                    </span>
                                    <span style={{ fontSize: '0.85rem', color: '#3b82f6', fontWeight: '700', flexShrink: 0 }}>
                                        {c.prefix}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchablePhonePrefixSelect;
