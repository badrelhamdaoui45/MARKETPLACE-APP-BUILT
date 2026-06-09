import React, { useState, useEffect, useRef } from 'react';
import { stripeCountries } from '../utils/stripeCountries';

const SearchableCountrySelect = ({ value, onChange }) => {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    const selectedCountryObj = stripeCountries.find(c => c.code === value) || stripeCountries.find(c => c.code === 'US') || stripeCountries[0];

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
        <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: 'white',
                    fontSize: '0.95rem',
                    color: '#1e293b',
                    cursor: 'pointer',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
                }}
            >
                <span style={{ fontWeight: '500' }}>
                    {selectedCountryObj ? `${selectedCountryObj.name} (${selectedCountryObj.code})` : 'Select Payout Country'}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '8px' }}>
                    {isOpen ? '▲' : '▼'}
                </span>
            </div>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    background: 'white',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                    zIndex: 9999, // Ensure it floats on top of other content
                    maxHeight: '220px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    <input
                        type="text"
                        placeholder="Type to search country..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            padding: '0.625rem 0.75rem',
                            border: 'none',
                            borderBottom: '1px solid #cbd5e1',
                            outline: 'none',
                            fontSize: '0.9rem',
                            width: '100%',
                            boxSizing: 'border-box',
                            background: '#f8fafc'
                        }}
                        autoFocus
                    />
                    <div style={{ overflowY: 'auto', flex: 1, maxHeight: '180px' }}>
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
                                        background: value === c.code ? '#f1f5f9' : 'transparent',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        transition: 'background 0.15s ease'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = value === c.code ? '#f1f5f9' : 'transparent'}
                                >
                                    <span>{c.name} ({c.code})</span>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>{c.prefix}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchableCountrySelect;
