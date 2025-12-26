
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import ConnectStripe from '../components/stripe/ConnectStripe';
import '../components/ui/ui.css';

const PhotographerDashboard = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('albums'); // 'albums' or 'sales'

    // Albums State
    const [albums, setAlbums] = useState([]);
    const [loadingAlbums, setLoadingAlbums] = useState(true);

    // Sales State
    const [sales, setSales] = useState([]);
    const [loadingSales, setLoadingSales] = useState(false);
    const [salesStats, setSalesStats] = useState({ total: 0, net: 0, count: 0 });

    useEffect(() => {
        if (user) {
            fetchAlbums();
            fetchSales();
        }
    }, [user]);

    const fetchAlbums = async () => {
        try {
            const { data, error } = await supabase
                .from('albums')
                .select('*')
                .eq('photographer_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAlbums(data);
        } catch (error) {
            console.error('Error fetching albums:', error);
        } finally {
            setLoadingAlbums(false);
        }
    };

    const fetchSales = async () => {
        setLoadingSales(true);
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select(`
                    *,
                    albums:album_id (title),
                    profiles:buyer_id (full_name, email)
                `)
                .eq('photographer_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Supabase Sales Fetch Error:", error);
                throw error;
            }
            console.log("Sales Data Fetched:", data);
            setSales(data);

            // Calculate Stats
            const total = data.reduce((sum, t) => sum + Number(t.amount || 0), 0);
            const net = data.reduce((sum, t) => sum + (Number(t.amount || 0) - Number(t.commission_amount || 0)), 0);
            setSalesStats({
                total,
                net,
                count: data.length
            });

        } catch (error) {
            console.error('Error fetching sales:', error);
        } finally {
            setLoadingSales(false);
        }
    };

    return (
        <div className="dashboard-container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>Photographer Dashboard</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <Link to="/photographer/packages">
                        <Button variant="secondary">Pricing Settings</Button>
                    </Link>
                    <Link to="/photographer/albums/new">
                        <Button>+ Create Album</Button>
                    </Link>
                </div>
            </div>

            <ConnectStripe />

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: '2rem' }}>
                <button
                    onClick={() => setActiveTab('albums')}
                    style={{
                        padding: '1rem 2rem',
                        cursor: 'pointer',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'albums' ? '2px solid var(--accent-primary)' : 'none',
                        fontWeight: activeTab === 'albums' ? 'bold' : 'normal',
                        color: activeTab === 'albums' ? 'var(--text-primary)' : 'var(--text-secondary)'
                    }}
                >
                    My Albums
                </button>
                <button
                    onClick={() => setActiveTab('sales')}
                    style={{
                        padding: '1rem 2rem',
                        cursor: 'pointer',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'sales' ? '2px solid var(--accent-primary)' : 'none',
                        fontWeight: activeTab === 'sales' ? 'bold' : 'normal',
                        color: activeTab === 'sales' ? 'var(--text-primary)' : 'var(--text-secondary)'
                    }}
                >
                    Sales & Earnings
                </button>
            </div>

            {/* TAB CONTENT: ALBUMS */}
            {activeTab === 'albums' && (
                <>
                    {loadingAlbums ? (
                        <p>Loading albums...</p>
                    ) : albums.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>You haven't created any albums yet.</p>
                            <Link to="/photographer/albums/new">
                                <Button variant="outline">Create Your First Album</Button>
                            </Link>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                            {albums.map((album) => (
                                <div key={album.id} className="album-card" style={{
                                    background: 'var(--bg-secondary)',
                                    borderRadius: 'var(--radius-md)',
                                    overflow: 'hidden',
                                    border: '1px solid var(--border-subtle)'
                                }}>
                                    <div style={{ height: '180px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                        {album.cover_image_url ? (
                                            <img src={album.cover_image_url} alt={album.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <span style={{ color: 'var(--text-muted)' }}>No Cover</span>
                                        )}
                                    </div>
                                    <div style={{ padding: '1rem' }}>
                                        <h3 style={{ marginBottom: '0.5rem' }}>{album.title}</h3>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                                            {album.is_published ? 'Published' : 'Draft'} • ${album.price}
                                        </p>
                                        <Link to={`/photographer/albums/${album.id}`}>
                                            <Button variant="outline" style={{ width: '100%' }}>Manage Album</Button>
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* TAB CONTENT: SALES */}
            {activeTab === 'sales' && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    {/* Stats Overview */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                        <div style={statCardStyle}>
                            <div style={statLabelStyle}>Total Sales Volume</div>
                            <div style={statValueStyle}>${salesStats.total.toFixed(2)}</div>
                        </div>
                        <div style={statCardStyle}>
                            <div style={statLabelStyle}>Net Earnings</div>
                            <div style={statValueStyle}>${salesStats.net.toFixed(2)}</div>
                            <div style={{ fontSize: '0.8rem', color: '#10b981' }}>Payouts via Stripe</div>
                        </div>
                        <div style={statCardStyle}>
                            <div style={statLabelStyle}>Total Orders</div>
                            <div style={statValueStyle}>{salesStats.count}</div>
                        </div>
                    </div>

                    {/* Transactions Table */}
                    <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: 'var(--bg-tertiary)' }}>
                                <tr style={{ textAlign: 'left' }}>
                                    <th style={thStyle}>Date</th>
                                    <th style={thStyle}>Album</th>
                                    <th style={thStyle}>Buyer</th>
                                    <th style={thStyle}>Gross</th>
                                    <th style={thStyle}>Platform Fee</th>
                                    <th style={thStyle}>Net</th>
                                    <th style={thStyle}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                            No sales recorded yet.
                                        </td>
                                    </tr>
                                ) : (
                                    sales.map(tx => (
                                        <tr key={tx.id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                                            <td style={tdStyle}>{new Date(tx.created_at).toLocaleDateString()}</td>
                                            <td style={tdStyle}>{tx.albums?.title || 'Unknown Album'}</td>
                                            <td style={tdStyle}>{tx.profiles?.full_name || 'Guest'}</td>
                                            <td style={tdStyle}>${Number(tx.amount).toFixed(2)}</td>
                                            <td style={tdStyle} className="text-red-500">-${Number(tx.commission_amount).toFixed(2)}</td>
                                            <td style={{ ...tdStyle, fontWeight: 'bold', color: '#10b981' }}>
                                                ${(Number(tx.amount) - Number(tx.commission_amount)).toFixed(2)}
                                            </td>
                                            <td style={tdStyle}>
                                                <span style={{
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: '999px',
                                                    fontSize: '0.75rem',
                                                    background: tx.status === 'paid' ? '#dcfce7' : '#fef9c3',
                                                    color: tx.status === 'paid' ? '#15803d' : '#854d0e'
                                                }}>
                                                    {tx.status?.toUpperCase()}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

// Styles
const statCardStyle = {
    background: 'var(--bg-secondary)',
    padding: '1.5rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-subtle)'
};
const statLabelStyle = { color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' };
const statValueStyle = { fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--text-primary)' };

const thStyle = { padding: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' };
const tdStyle = { padding: '1rem', fontSize: '0.9rem' };

export default PhotographerDashboard;
