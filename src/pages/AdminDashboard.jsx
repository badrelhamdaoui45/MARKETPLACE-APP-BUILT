
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';

const AdminDashboard = () => {
    const [photographers, setPhotographers] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [albums, setAlbums] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPhotographer, setSelectedPhotographer] = useState(null);

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            // 1. Fetch Photographers
            const { data: pros, error: prosError } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'photographer');

            if (prosError) throw prosError;

            // 2. Fetch All Transactions
            const { data: txs, error: txsError } = await supabase
                .from('transactions')
                .select('*');

            if (txsError) throw txsError;
            setTransactions(txs);

            // 3. Fetch All Albums
            const { data: albs, error: albsError } = await supabase
                .from('albums')
                .select('*');

            if (albsError) throw albsError;
            setAlbums(albs);

            // Process Data: Attach basic stats to photographers
            const prosWithStats = pros.map(p => {
                const myAlbs = albs.filter(a => a.photographer_id === p.id);
                const mySales = txs.filter(t => t.photographer_id === p.id);
                const totalSalesAmount = mySales.reduce((sum, t) => sum + Number(t.amount), 0);
                const totalCommission = mySales.reduce((sum, t) => sum + Number(t.commission_amount), 0);

                return {
                    ...p,
                    albumCount: myAlbs.length,
                    salesCount: mySales.length,
                    totalRevenue: totalSalesAmount,
                    platformFees: totalCommission,
                    netEarnings: totalSalesAmount - totalCommission
                };
            });

            setPhotographers(prosWithStats);

        } catch (error) {
            console.error(error);
            alert('Error fetching admin data');
        } finally {
            setLoading(false);
        }
    };

    const getPhotographerDetails = (photographer) => {
        const myAlbums = albums.filter(a => a.photographer_id === photographer.id);
        const myTransactions = transactions.filter(t => t.photographer_id === photographer.id);

        return (
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <h4 style={{ marginBottom: '0.5rem' }}>Albums ({myAlbums.length})</h4>
                <ul style={{ marginBottom: '1rem', paddingLeft: '1.2rem' }}>
                    {myAlbums.map(a => (
                        <li key={a.id}>
                            <strong>{a.title}</strong> - {a.is_published ? 'Published' : 'Draft'} - ${a.price}
                        </li>
                    ))}
                    {myAlbums.length === 0 && <li>No albums yet.</li>}
                </ul>

                <h4 style={{ marginBottom: '0.5rem' }}>Recent Sales</h4>
                {myTransactions.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                                <th style={{ padding: '0.5rem' }}>Date</th>
                                <th style={{ padding: '0.5rem' }}>Amount</th>
                                <th style={{ padding: '0.5rem' }}>Commission</th>
                                <th style={{ padding: '0.5rem' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {myTransactions.slice(0, 5).map(t => (
                                <tr key={t.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '0.5rem' }}>{new Date(t.created_at).toLocaleDateString()}</td>
                                    <td style={{ padding: '0.5rem' }}>${t.amount}</td>
                                    <td style={{ padding: '0.5rem' }}>${t.commission_amount}</td>
                                    <td style={{ padding: '0.5rem' }}>{t.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>No sales yet.</p>
                )}
            </div>
        );
    };

    if (loading) return <div style={{ padding: '2rem' }}>Loading Admin Panel...</div>;

    const totalPlatformRevenue = transactions.reduce((sum, t) => sum + Number(t.commission_amount), 0);
    const totalSalesVolume = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '2rem' }}>Admin Dashboard</h1>

            {/* Overview Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                <div style={cardStyle}>
                    <h3 style={cardLabelStyle}>Total Revenue</h3>
                    <p style={cardValueStyle}>${totalSalesVolume.toFixed(2)}</p>
                </div>
                <div style={cardStyle}>
                    <h3 style={cardLabelStyle}>Platform Commission</h3>
                    <p style={cardValueStyle}>${totalPlatformRevenue.toFixed(2)}</p>
                </div>
                <div style={cardStyle}>
                    <h3 style={cardLabelStyle}>Total Photographers</h3>
                    <p style={cardValueStyle}>{photographers.length}</p>
                </div>
                <div style={cardStyle}>
                    <h3 style={cardLabelStyle}>Active Albums</h3>
                    <p style={cardValueStyle}>{albums.filter(a => a.is_published).length}</p>
                </div>
            </div>

            {/* Photographers List */}
            <h2 style={{ marginBottom: '1.5rem' }}>Photographer Management</h2>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f1f5f9' }}>
                        <tr style={{ textAlign: 'left' }}>
                            <th style={thStyle}>Name / Email</th>
                            <th style={thStyle}>Stripe Status</th>
                            <th style={thStyle}>Albums</th>
                            <th style={thStyle}>Total Sales</th>
                            <th style={thStyle}>Net Earnings</th>
                            <th style={thStyle}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {photographers.map(p => (
                            <React.Fragment key={p.id}>
                                <tr style={{ borderTop: '1px solid var(--border-subtle)' }}>
                                    <td style={tdStyle}>
                                        <div style={{ fontWeight: 'bold' }}>{p.full_name || 'No Name'}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{p.email}</div>
                                    </td>
                                    <td style={tdStyle}>
                                        {p.stripe_account_id ? (
                                            <span style={{ color: 'green', fontSize: '0.85rem' }}>Linked</span>
                                        ) : (
                                            <span style={{ color: 'orange', fontSize: '0.85rem' }}>Not Linked</span>
                                        )}
                                    </td>
                                    <td style={tdStyle}>{p.albumCount}</td>
                                    <td style={tdStyle}>${p.totalRevenue.toFixed(2)}</td>
                                    <td style={tdStyle}>${p.netEarnings.toFixed(2)}</td>
                                    <td style={tdStyle}>
                                        <Button
                                            variant="secondary"
                                            onClick={() => setSelectedPhotographer(selectedPhotographer === p.id ? null : p.id)}
                                            style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
                                        >
                                            {selectedPhotographer === p.id ? 'Close' : 'View Details'}
                                        </Button>
                                    </td>
                                </tr>
                                {selectedPhotographer === p.id && (
                                    <tr>
                                        <td colSpan="6" style={{ padding: '0 1.5rem 1.5rem 1.5rem' }}>
                                            {getPhotographerDetails(p)}
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// Styles
const cardStyle = {
    background: 'var(--bg-secondary)',
    padding: '1.5rem',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-subtle)',
    textAlign: 'center'
};
const cardLabelStyle = { fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' };
const cardValueStyle = { fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-primary)' };
const thStyle = { padding: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600' };
const tdStyle = { padding: '1rem', verticalAlign: 'middle' };

export default AdminDashboard;
