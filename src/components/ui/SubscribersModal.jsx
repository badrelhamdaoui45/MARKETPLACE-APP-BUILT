import React, { useEffect, useState } from 'react';
import { X, Mail, Phone, Calendar, Copy, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Button from './Button';
import { format } from 'date-fns';

const SubscribersModal = ({ isOpen, onClose, albumId }) => {
    const [subscribers, setSubscribers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [copiedEmails, setCopiedEmails] = useState(false);

    useEffect(() => {
        if (isOpen && albumId) {
            fetchSubscribers();
        }
    }, [isOpen, albumId]);

    const fetchSubscribers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('pre_inscriptions')
                .select('*')
                .eq('album_id', albumId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSubscribers(data || []);
        } catch (error) {
            console.error('Error fetching subscribers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyAllEmails = () => {
        const emails = subscribers.map(s => s.email).filter(Boolean).join(', ');
        navigator.clipboard.writeText(emails).then(() => {
            setCopiedEmails(true);
            setTimeout(() => setCopiedEmails(false), 2000);
        });
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '600px', width: '90%' }}>
                <div className="modal-header">
                    <h2>Subscribers List ({subscribers.length})</h2>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="modal-body" style={{ padding: '0' }}>

                    {loading ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading...</div>
                    ) : subscribers.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                            Pas encore d'inscrits pour cet album.
                        </div>
                    ) : (
                        <div className="subscribers-list-container">
                            <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                                <Button size="sm" variant="outline" onClick={handleCopyAllEmails} style={{ gap: '0.5rem' }}>
                                    {copiedEmails ? <Check size={14} /> : <Copy size={14} />}
                                    {copiedEmails ? 'Emails Copied!' : 'Copy All Emails'}
                                </Button>
                            </div>
                            <div className="subscribers-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                {subscribers.map((sub) => (
                                    <div key={sub.id} className="subscriber-item">
                                        <div className="sub-info">
                                            <div className="sub-email">
                                                <Mail size={14} className="sub-icon" />
                                                <span>{sub.email || 'No Email'}</span>
                                            </div>
                                            {sub.phone && (
                                                <div className="sub-meta">
                                                    <Phone size={12} className="sub-icon" />
                                                    <span>{sub.phone}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="sub-date">
                                            <Calendar size={12} className="sub-icon" />
                                            <span>{format(new Date(sub.created_at), 'MMM dd, yyyy')}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <style>{`
                    .modal-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0, 0, 0, 0.5);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        z-index: 1000;
                        backdrop-filter: blur(4px);
                    }
                    .modal-content {
                        background: white;
                        border-radius: 12px;
                        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                        overflow: hidden;
                        animation: modalSlideIn 0.2s ease-out;
                    }
                    .modal-header {
                        padding: 1.5rem;
                        border-bottom: 1px solid #e2e8f0;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .modal-header h2 {
                        font-size: 1.25rem;
                        font-weight: 600;
                        color: #1e293b;
                        margin: 0;
                    }
                    .close-btn {
                        background: none;
                        border: none;
                        color: #64748b;
                        cursor: pointer;
                        padding: 0.5rem;
                        border-radius: 6px;
                        transition: all 0.2s;
                    }
                    .close-btn:hover {
                        background: #f1f5f9;
                        color: #0f172a;
                    }
                    
                    .subscriber-item {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 1rem 1.5rem;
                        border-bottom: 1px solid #f1f5f9;
                        transition: background 0.2s;
                    }
                    .subscriber-item:last-child {
                        border-bottom: none;
                    }
                    .subscriber-item:hover {
                        background: #f8fafc;
                    }
                    .sub-info {
                        display: flex;
                        flex-direction: column;
                        gap: 0.25rem;
                    }
                    .sub-email {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        font-weight: 500;
                        color: #334155;
                    }
                    .sub-meta {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        font-size: 0.85rem;
                        color: #64748b;
                    }
                    .sub-date {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        font-size: 0.85rem;
                        color: #94a3b8;
                    }
                    .sub-icon {
                        color: #94a3b8;
                    }
                    @keyframes modalSlideIn {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}</style>
            </div>
        </div>
    );
};

export default SubscribersModal;
