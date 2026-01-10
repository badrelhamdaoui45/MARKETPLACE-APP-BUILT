
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import { Copy, Check, MessageSquare, Eye, FileCheck, Image as ImageIcon, Share2, HelpCircle, Wallet } from 'lucide-react';
import ConnectStripe from '../components/stripe/ConnectStripe';
import Toast from '../components/ui/Toast';
import PaymentSettingsModal from '../components/PaymentSettingsModal';
import ShareModal from '../components/ShareModal';
import DashboardSetupModal from '../components/DashboardSetupModal';
import WithdrawalModal from '../components/WithdrawalModal';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import '../components/ui/ui.css';

const PhotographerDashboard = () => {
    const { user, profile } = useAuth();
    const [activeTab, setActiveTab] = useState('albums'); // 'albums' or 'sales'
    const [toast, setToast] = useState(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [inspectingTx, setInspectingTx] = useState(null);
    const [photogMsg, setPhotogMsg] = useState('');
    const [savingMsg, setSavingMsg] = useState(false);

    // Share Modal State
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [shareModalAlbum, setShareModalAlbum] = useState(null);
    const [setupModalOpen, setSetupModalOpen] = useState(false);
    const [withdrawalModalOpen, setWithdrawalModalOpen] = useState(false);

    // Albums State
    const [albums, setAlbums] = useState([]);
    const [loadingAlbums, setLoadingAlbums] = useState(true);

    // Sales State
    const [sales, setSales] = useState([]);
    const [loadingSales, setLoadingSales] = useState(false);
    const [salesStats, setSalesStats] = useState({ total: 0, net: 0, count: 0 });
    const [copiedAlbumId, setCopiedAlbumId] = useState(null);
    const [paymentFilter, setPaymentFilter] = useState('all'); // 'all', 'stripe', 'bank_transfer'
    const [dateFilter, setDateFilter] = useState('all'); // 'all', '7days', '30days', '90days'
    const [albumFilter, setAlbumFilter] = useState('all'); // 'all' or album_id

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

    const handleShare = (album) => {
        setShareModalAlbum(album);
        setShareModalOpen(true);
    };

    const handleApprovePayment = async (txId) => {
        try {
            const { error } = await supabase
                .from('transactions')
                .update({ status: 'paid' })
                .eq('id', txId);

            if (error) throw error;
            setToast({ message: 'Payment approved! Photos unlocked.', type: 'success' });
            fetchSales(); // Refresh the list
        } catch (error) {
            console.error('Error approving payment:', error);
            setToast({ message: 'Error approving payment.', type: 'error' });
        }
    };

    const handleSaveMessage = async () => {
        if (!inspectingTx) return;
        setSavingMsg(true);
        try {
            const { error } = await supabase
                .from('transactions')
                .update({ photographer_message: photogMsg })
                .eq('id', inspectingTx.id);

            if (error) throw error;

            setToast({ message: 'Message saved!', type: 'success' });
            fetchSales(); // Refresh list
        } catch (error) {
            console.error("Error saving message:", error);
            setToast({ message: 'Error saving message', type: 'error' });
        } finally {
            setSavingMsg(false);
        }
    };

    // Filter sales based on payment method, date, and album
    const filteredSales = sales.filter(sale => {
        // Payment method filter
        if (paymentFilter === 'stripe' && sale.payment_method === 'bank_transfer') return false;
        if (paymentFilter === 'bank_transfer' && sale.payment_method !== 'bank_transfer') return false;

        // Date filter
        if (dateFilter !== 'all') {
            const saleDate = new Date(sale.created_at);
            const now = new Date();
            const daysDiff = Math.floor((now - saleDate) / (1000 * 60 * 60 * 24));

            if (dateFilter === '7days' && daysDiff > 7) return false;
            if (dateFilter === '30days' && daysDiff > 30) return false;
            if (dateFilter === '90days' && daysDiff > 90) return false;
        }

        // Album filter
        if (albumFilter !== 'all' && sale.album_id !== albumFilter) return false;

        return true;
    });

    // Calculate filtered stats
    const filteredStats = {
        total: filteredSales.reduce((sum, t) => sum + Number(t.amount || 0), 0),
        net: filteredSales.reduce((sum, t) => sum + (Number(t.amount || 0) - Number(t.commission_amount || 0)), 0),
        count: filteredSales.length
    };

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>{profile?.role === 'admin' ? 'Admin Console' : 'Photographer Dashboard'}</h1>
                <div className="dashboard-actions">
                    <Button
                        variant="secondary"
                        onClick={() => setSetupModalOpen(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#F5A623', color: 'white', border: 'none' }}
                    >
                        <HelpCircle size={18} />
                        SETUP GUIDE
                    </Button>
                    <Button className="action-btn" onClick={() => setIsSettingsOpen(true)}>OPTIONS DE PAIEMENT</Button>
                    <Link to="/photographer/packages">
                        <Button className="action-btn">Pricing Settings</Button>
                    </Link>
                    <Link to="/photographer/albums/new">
                        <Button className="action-btn">+ Create Album</Button>
                    </Link>
                </div>
            </header>

            <PaymentSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                profile={profile}
                onSave={() => {
                    setToast({ message: 'Payment settings saved!', type: 'success' });
                    // Refresh profile if needed, or just let context handle it on next fetch
                }}
            />

            <ConnectStripe />

            {/* Tabs */}
            <div className="dashboard-tabs">
                <button
                    onClick={() => setActiveTab('albums')}
                    className={`tab-button ${activeTab === 'albums' ? 'active' : ''}`}
                >
                    My Albums
                </button>
                <button
                    onClick={() => setActiveTab('sales')}
                    className={`tab-button ${activeTab === 'sales' ? 'active' : ''}`}
                >
                    Sales
                </button>
            </div>

            {/* TAB CONTENT: ALBUMS */}
            {
                activeTab === 'albums' && (
                    <div className="tab-content">
                        {loadingAlbums ? (
                            <p className="loading-text">Loading albums...</p>
                        ) : albums.length === 0 ? (
                            <div className="empty-dashboard-state">
                                <p>You haven't created any albums yet.</p>
                                <Link to="/photographer/albums/new">
                                    <Button variant="outline">Create your first album</Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="dashboard-albums-grid">
                                {albums.map((album) => (
                                    <div key={album.id} className="album-card-mini">
                                        <div className="album-card-mini-image">
                                            {album.cover_image_url ? (
                                                <img src={album.cover_image_url} alt={album.title} />
                                            ) : (
                                                <div className="no-cover-placeholder">
                                                    <div className="placeholder-logo">RUN CAPTURE</div>
                                                    <span className="no-cover-badge">No Cover Image</span>
                                                </div>
                                            )}
                                            {album.pre_inscription_enabled && (
                                                <div className="pre-inscription-label">PRE-REGISTRATION</div>
                                            )}
                                            {album.is_free && (
                                                <div className="free-album-label">FREE ALBUM</div>
                                            )}
                                        </div>
                                        <div className="album-card-mini-body">
                                            <h3>{album.title}</h3>
                                            <p className="album-meta">
                                                {album.is_published ? 'Published' : 'Draft'} • {album.is_free ? <span style={{ color: '#10b981', fontWeight: 800 }}>FREE</span> : `$${album.price}`}
                                            </p>
                                            <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto' }}>
                                                <Link to={`/photographer/albums/${encodeURIComponent(album.slug || album.title)}/edit`} style={{ flex: 1 }}>
                                                    <Button className="w-full action-btn">Edit</Button>
                                                </Link>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => handleShare(album)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', padding: '0 1rem' }}
                                                    title="Share Album"
                                                >
                                                    <Share2 size={16} />
                                                    Share
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )
            }

            {/* TAB CONTENT: SALES */}
            {
                activeTab === 'sales' && (
                    <div className="tab-content sales-content">
                        {/* Enhanced Filters Section */}
                        <div className="filters-section">
                            {/* Payment Method Filter */}
                            <div className="filter-group">
                                <label className="filter-label">Payment Method</label>
                                <div className="filter-buttons">
                                    <button
                                        className={`filter-btn ${paymentFilter === 'all' ? 'active' : ''}`}
                                        onClick={() => setPaymentFilter('all')}
                                    >
                                        All
                                    </button>
                                    <button
                                        className={`filter-btn ${paymentFilter === 'stripe' ? 'active' : ''}`}
                                        onClick={() => setPaymentFilter('stripe')}
                                    >
                                        Stripe
                                    </button>
                                    <button
                                        className={`filter-btn ${paymentFilter === 'bank_transfer' ? 'active' : ''}`}
                                        onClick={() => setPaymentFilter('bank_transfer')}
                                    >
                                        Bank Transfer
                                    </button>
                                </div>
                            </div>

                            {/* Date Range Filter */}
                            <div className="filter-group">
                                <label className="filter-label">Date Range</label>
                                <div className="filter-buttons">
                                    <button
                                        className={`filter-btn ${dateFilter === 'all' ? 'active' : ''}`}
                                        onClick={() => setDateFilter('all')}
                                    >
                                        All Time
                                    </button>
                                    <button
                                        className={`filter-btn ${dateFilter === '7days' ? 'active' : ''}`}
                                        onClick={() => setDateFilter('7days')}
                                    >
                                        Last 7 Days
                                    </button>
                                    <button
                                        className={`filter-btn ${dateFilter === '30days' ? 'active' : ''}`}
                                        onClick={() => setDateFilter('30days')}
                                    >
                                        Last 30 Days
                                    </button>
                                    <button
                                        className={`filter-btn ${dateFilter === '90days' ? 'active' : ''}`}
                                        onClick={() => setDateFilter('90days')}
                                    >
                                        Last 90 Days
                                    </button>
                                </div>
                            </div>

                            {/* Album Filter */}
                            <div className="filter-group">
                                <label className="filter-label">Album</label>
                                <select
                                    className="album-filter-select"
                                    value={albumFilter}
                                    onChange={(e) => setAlbumFilter(e.target.value)}
                                >
                                    <option value="all">All Albums</option>
                                    {albums.map(album => (
                                        <option key={album.id} value={album.id}>
                                            {album.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Sales Chart */}
                        <div className="sales-chart-container">
                            <h3 className="chart-title">Revenue Trend</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={(() => {
                                    // Group sales by date for chart
                                    const salesByDate = {};
                                    filteredSales.forEach(sale => {
                                        const date = new Date(sale.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                        if (!salesByDate[date]) {
                                            salesByDate[date] = 0;
                                        }
                                        salesByDate[date] += Number(sale.amount || 0);
                                    });
                                    return Object.entries(salesByDate).map(([date, amount]) => ({ date, amount })).slice(-10);
                                })()}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#F5A623" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#F5A623" stopOpacity={0.1} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#64748b"
                                        style={{ fontSize: '0.75rem' }}
                                    />
                                    <YAxis
                                        stroke="#64748b"
                                        style={{ fontSize: '0.75rem' }}
                                        tickFormatter={(value) => `$${value}`}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'white',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                        }}
                                        formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Revenue']}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="amount"
                                        stroke="#F5A623"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorRevenue)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Stats Overview */}
                        <div className="stats-grid">
                            <div className="stat-card">
                                <div className="stat-label">Total Sales Volume</div>
                                <div className="stat-value">${filteredStats.total.toFixed(2)}</div>
                            </div>
                            <div className="stat-card highlight">
                                <div className="stat-label">Net Revenue</div>
                                <div className="stat-value">${filteredStats.net.toFixed(2)}</div>
                                <div className="stat-note">Payments via Stripe</div>
                                {profile?.stripe_account_id && (
                                    <Button
                                        onClick={() => setWithdrawalModalOpen(true)}
                                        style={{
                                            marginTop: '1rem',
                                            width: '100%',
                                            background: '#059669',
                                            color: 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem',
                                            fontWeight: 700,
                                            border: 'none'
                                        }}
                                    >
                                        <Wallet size={18} />
                                        Withdraw Funds
                                    </Button>
                                )}
                            </div>
                            <div className="stat-card">
                                <div className="stat-label">Total Orders</div>
                                <div className="stat-value">{filteredStats.count}</div>
                            </div>
                        </div>

                        {/* Desktop Transactions Table */}
                        <div className="transactions-table-wrapper hide-mobile">
                            <table className="transactions-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Album</th>
                                        <th>Runner</th>
                                        <th style={{ textAlign: 'right' }}>Brut</th>
                                        <th style={{ textAlign: 'right' }}>Commission</th>
                                        <th style={{ textAlign: 'right' }}>Net</th>
                                        <th style={{ textAlign: 'center' }}>Statut</th>
                                        <th style={{ textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSales.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="empty-table-cell">
                                                No sales recorded yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredSales.map(tx => (
                                            <tr key={tx.id}>
                                                <td>{new Date(tx.created_at).toLocaleDateString()}</td>
                                                <td>{tx.albums?.title || 'Unknown Album'}</td>
                                                <td>{tx.profiles?.full_name || 'Guest'}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 700 }}>${Number(tx.amount).toFixed(2)}</td>
                                                <td className="commission-text" style={{ textAlign: 'right' }}>-${Number(tx.commission_amount).toFixed(2)}</td>
                                                <td className="net-text" style={{ textAlign: 'right' }}>
                                                    ${(Number(tx.amount) - Number(tx.commission_amount)).toFixed(2)}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                                                        <span className={`status-badge ${tx.status}`}>
                                                            {tx.status?.toUpperCase()}
                                                        </span>
                                                        {tx.payment_method === 'bank_transfer' && (
                                                            <span style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8' }}>BANK</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ minWidth: '240px' }}>
                                                    {tx.status === 'manual_pending' ? (
                                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center' }}>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => {
                                                                    setInspectingTx(tx);
                                                                    setPhotogMsg(tx.photographer_message || '');
                                                                }}
                                                                className="verify-btn"
                                                                style={{ height: '32px', padding: '0 8px', fontSize: '12px' }}
                                                            >
                                                                <Eye size={13} />
                                                                Verify
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                className="approve-btn"
                                                                onClick={() => handleApprovePayment(tx.id)}
                                                                style={{ height: '32px', padding: '0 8px', fontSize: '12px' }}
                                                            >
                                                                Approve
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div style={{ textAlign: 'center', color: '#cbd5e1' }}>—</div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Transactions List */}
                        <div className="transactions-mobile-list hide-desktop">
                            {filteredSales.length === 0 ? (
                                <p className="empty-text">No sales recorded.</p>
                            ) : (
                                filteredSales.map(tx => (
                                    <div key={tx.id} className="transaction-card">
                                        <div className="tx-header">
                                            <span className="tx-date">{new Date(tx.created_at).toLocaleDateString()}</span>
                                            <span className={`status-badge ${tx.status}`}>
                                                {tx.status} {tx.payment_method === 'bank_transfer' ? '(Bank)' : ''}
                                            </span>
                                        </div>
                                        <div className="tx-row">
                                            <span className="tx-label">Album:</span>
                                            <span className="tx-value">{tx.albums?.title || 'Unknown'}</span>
                                        </div>
                                        <div className="tx-row">
                                            <span className="tx-label">Buyer:</span>
                                            <span className="tx-value">{tx.profiles?.full_name || 'Guest'}</span>
                                        </div>
                                        <div className="tx-footer">
                                            <div className="tx-amount-group">
                                                <span className="tx-label">Net:</span>
                                                <span className="tx-net-amount">${(Number(tx.amount) - Number(tx.commission_amount)).toFixed(2)}</span>
                                            </div>
                                            <div className="btn-group-mini">
                                                {tx.status === 'manual_pending' && (
                                                    <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="flex-1"
                                                            onClick={() => {
                                                                setInspectingTx(tx);
                                                                setPhotogMsg(tx.photographer_message || '');
                                                            }}
                                                        >
                                                            Verify
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            className="approve-btn flex-1"
                                                            onClick={() => handleApprovePayment(tx.id)}
                                                        >
                                                            Approve
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )
            }

            {/* INSPECTION MODAL */}
            {inspectingTx && (
                <div className="inspection-modal-overlay" onClick={() => setInspectingTx(null)}>
                    <div className="inspection-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="mobile-handle show-mobile"></div>
                            <h3>Payment Verification</h3>
                            <button className="close-x" onClick={() => setInspectingTx(null)}>&times;</button>
                        </div>

                        <div className="modal-body">
                            <div className="tx-overview">
                                <div className="overview-item">
                                    <label>Album</label>
                                    <span>{inspectingTx.albums?.title}</span>
                                </div>
                                <div className="overview-item">
                                    <label>Runner</label>
                                    <span>{inspectingTx.profiles?.full_name || 'Guest'} ({inspectingTx.profiles?.email || 'N/A'})</span>
                                </div>
                                <div className="overview-item highlight">
                                    <label>Net Amount to Receive</label>
                                    <span>${(Number(inspectingTx.amount) - Number(inspectingTx.commission_amount)).toFixed(2)}</span>
                                </div>
                            </div>

                            <hr className="modal-divider" />

                            <div className="proof-viewer">
                                <label className="section-label">Payment Proof (Screenshot)</label>
                                {inspectingTx.payment_proof_url ? (
                                    <div className="proof-image-container">
                                        <img src={inspectingTx.payment_proof_url} alt="Proof of Payment" />
                                        <a href={inspectingTx.payment_proof_url} target="_blank" rel="noopener noreferrer" className="zoom-btn">
                                            <Eye size={16} /> Open full size
                                        </a>
                                    </div>
                                ) : (
                                    <div className="no-proof-state">
                                        <ImageIcon size={48} strokeWidth={1} />
                                        <p>No payment proof sent by runner yet.</p>
                                    </div>
                                )}
                            </div>

                            <div className="message-sender">
                                <label className="section-label">Message to Runner</label>
                                <textarea
                                    placeholder="Write a message to the runner (ex: 'Payment received' or 'Wrong bank details'...)"
                                    value={photogMsg}
                                    onChange={(e) => setPhotogMsg(e.target.value)}
                                    className="message-textarea"
                                />
                                <Button
                                    className="save-msg-btn"
                                    onClick={handleSaveMessage}
                                    disabled={savingMsg}
                                >
                                    {savingMsg ? 'Sending...' : 'Save Message'}
                                </Button>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <Button variant="outline" onClick={() => setInspectingTx(null)}>Close</Button>
                            <Button
                                className="approve-btn-large"
                                onClick={() => {
                                    handleApprovePayment(inspectingTx.id);
                                    setInspectingTx(null);
                                }}
                            >
                                <FileCheck size={20} />
                                Confirm Payment Receipt
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <ShareModal
                isOpen={shareModalOpen}
                onClose={() => setShareModalOpen(false)}
                album={shareModalAlbum}
                profile={profile}
            />

            <DashboardSetupModal
                isOpen={setupModalOpen}
                onClose={() => setSetupModalOpen(false)}
            />

            <WithdrawalModal
                isOpen={withdrawalModalOpen}
                onClose={() => setWithdrawalModalOpen(false)}
                profile={profile}
            />

            <style>{`
                .dashboard-container {
                    padding: 2rem;
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .dashboard-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2.5rem;
                }

                .dashboard-header h1 {
                    font-size: 1.8rem;
                    font-weight: 800;
                }

                .dashboard-actions {
                    display: flex;
                    gap: 1rem;
                }
                
                .dashboard-actions button {
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }

                .dashboard-tabs {
                    display: flex;
                    border-bottom: 1px solid var(--border-subtle);
                    margin-bottom: 2.5rem;
                    gap: 2rem;
                }

                .tab-button {
                    padding: 1rem 0;
                    cursor: pointer;
                    background: none;
                    border: none;
                    border-bottom: 2px solid transparent;
                    color: var(--text-secondary);
                    font-weight: 600;
                    font-size: 1rem;
                    transition: all 0.2s ease;
                }

                .tab-button.active {
                    border-bottom-color: var(--primary-blue);
                    color: var(--text-primary);
                }

                .filters-section {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 16px;
                    padding: 1.5rem;
                    margin-bottom: 2rem;
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 1.5rem;
                }

                .filter-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }

                .filter-label {
                    font-size: 0.875rem;
                    font-weight: 700;
                    color: #1e293b;
                    margin: 0;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .filter-buttons {
                    display: flex;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                }

                .filter-btn {
                    padding: 0.625rem 1rem;
                    background: #f8fafc;
                    border: 2px solid #e2e8f0;
                    border-radius: 8px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: #64748b;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    white-space: nowrap;
                }

                .filter-btn:hover {
                    background: #f1f5f9;
                    border-color: #cbd5e1;
                    transform: translateY(-1px);
                }

                .filter-btn.active {
                    background: #F5A623;
                    border-color: #F5A623;
                    color: white;
                    box-shadow: 0 2px 4px rgba(245, 166, 35, 0.3);
                }

                .filter-btn.active:hover {
                    background: #E09616;
                    border-color: #E09616;
                }

                .album-filter-select {
                    padding: 0.75rem 1rem;
                    background: white;
                    border: 2px solid #e2e8f0;
                    border-radius: 8px;
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: #475569;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .album-filter-select:hover {
                    border-color: #cbd5e1;
                }

                .album-filter-select:focus {
                    outline: none;
                    border-color: #F5A623;
                    box-shadow: 0 0 0 3px rgba(245, 166, 35, 0.1);
                }

                .sales-chart-container {
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 16px;
                    padding: 1.5rem;
                    margin-bottom: 2rem;
                }

                .chart-title {
                    font-size: 1.125rem;
                    font-weight: 700;
                    color: #1e293b;
                    margin: 0 0 1.5rem 0;
                }

                .dashboard-albums-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 1.5rem;
                    align-items: stretch;
                }

                .album-card-mini {
                    background: #ffffff;
                    border: 1px solid #f1f5f9;
                    border-radius: 16px;
                    overflow: hidden;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.05);
                }

                .album-card-mini:hover {
                    border-color: #cbd5e1;
                    transform: translateY(-4px);
                    box-shadow: 0 12px 24px -6px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                }

                .album-card-mini-image {
                    width: 100%;
                    aspect-ratio: 16 / 9;
                    background: #f1f5f9;
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    border-bottom: 1px solid #f1f5f9;
                }

                .album-card-mini-image img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: block;
                    transition: transform 0.6s ease;
                }

                .album-card-mini:hover .album-card-mini-image img {
                    transform: scale(1.08);
                }

                .album-placeholder {
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                }

                .placeholder-logo {
                    font-weight: 900;
                    font-size: 1.25rem;
                    color: #cbd5e1;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                }

                .no-cover-badge {
                    font-size: 0.7rem;
                    color: #94a3b8;
                    font-weight: 500;
                }

                .pre-inscription-label, .free-album-label {
                    position: absolute;
                    bottom: 0.75rem;
                    padding: 0.35rem 0.75rem;
                    font-size: 0.7rem;
                    font-weight: 800;
                    letter-spacing: 0.05em;
                    color: white;
                    border-radius: 50px;
                    z-index: 5;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }

                .pre-inscription-label {
                    background: #f97316;
                    left: 0.75rem;
                }

                .free-album-label {
                    background: #10b981;
                    right: 0.75rem;
                }

                .album-card-mini-body {
                    padding: 1.5rem;
                    text-align: center;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }

                .album-card-mini-body h3 {
                    margin-bottom: 0.5rem;
                    font-size: 1.15rem;
                    font-weight: 800;
                    color: #1e293b;
                    letter-spacing: -0.01em;
                }

                .album-meta {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    margin-bottom: 1.5rem;
                    font-size: 0.85rem;
                    color: #64748b;
                    font-weight: 500;
                }

                .album-meta-divider {
                    width: 4px;
                    height: 4px;
                    background: #cbd5e1;
                    border-radius: 50%;
                }

                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 2.5rem;
                }

                .stat-card {
                    background: #ffffff;
                    padding: 1.75rem;
                    border-radius: 12px;
                    border: 1px solid var(--border-subtle);
                }

                .stat-card.highlight {
                    border-color: #dcfce7;
                    background: #f0fdf4;
                }

                .stat-label {
                    color: var(--text-secondary);
                    font-size: 0.95rem;
                    margin-bottom: 0.75rem;
                    font-weight: 500;
                }

                .stat-value {
                    font-size: 2rem;
                    font-weight: 800;
                    color: var(--text-primary);
                }

                .stat-note {
                    font-size: 0.85rem;
                    color: #16a34a;
                    margin-top: 0.25rem;
                    font-weight: 600;
                }

                .transactions-table-wrapper {
                    background: #ffffff;
                    border-radius: 12px;
                    border: 1px solid var(--border-subtle);
                    overflow-x: auto;
                }

                .transactions-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .transactions-table th {
                    background: #f8fafc;
                    padding: 1rem 1.25rem;
                    font-size: 0.8rem;
                    text-align: left;
                    font-weight: 800;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    border-bottom: 1px solid #f1f5f9;
                }

                .transactions-table td {
                    padding: 1rem;
                    font-size: 0.95rem;
                    color: #1e293b;
                    border-bottom: 1px solid #f1f5f9;
                    vertical-align: middle;
                }

                .transactions-table tr:hover {
                    background: #fdfdfd;
                }

                .verify-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.4rem;
                    background: #f1f5f9 !important;
                    border-color: #e2e8f0 !important;
                    color: #475569 !important;
                }

                .verify-btn:hover {
                    background: #e2e8f0 !important;
                    color: #1e293b !important;
                }

                /* Inspection Modal */
                .inspection-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.75);
                    backdrop-filter: blur(8px);
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0; /* Important for mobile */
                    animation: fadeIn 0.2s ease-out;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                .inspection-modal-content {
                    background: white;
                    width: 100%;
                    max-width: 650px;
                    max-height: 90vh;
                    border-radius: 24px 24px 24px 24px;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                    overflow: hidden;
                    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    position: relative;
                }

                /* Mobile Bottom Sheet */
                @media (max-width: 768px) {
                    .inspection-modal-overlay {
                        align-items: flex-end;
                    }
                    .inspection-modal-content {
                        max-height: 95vh;
                        border-radius: 20px 20px 0 0;
                        animation: slideFromBottom 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    }
                }

                @keyframes slideFromBottom {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }

                .mobile-handle {
                    width: 40px;
                    height: 4px;
                    background: #e2e8f0;
                    border-radius: 2px;
                    margin: 0 auto 0.5rem auto;
                }

                .inspection-modal-content .modal-header {
                    padding: 1.5rem 2rem;
                    border-bottom: 1px solid #f1f5f9;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    position: relative;
                }

                .inspection-modal-content .modal-header h3 {
                    margin: 0;
                    text-align: center;
                    font-size: 1.15rem;
                }

                .inspection-modal-content .modal-header .close-x {
                    position: absolute;
                    right: 1.5rem;
                    top: 50%;
                    transform: translateY(-50%);
                    background: #f1f5f9;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.25rem;
                    color: #64748b;
                    transition: all 0.2s;
                }

                .inspection-modal-content .modal-header .close-x:hover {
                    background: #e2e8f0;
                    color: #0f172a;
                }

                .inspection-modal-content .modal-body {
                    padding: 1.5rem;
                    overflow-y: auto;
                    flex: 1;
                }

                .tx-overview {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 1rem;
                    background: #f8fafc;
                    padding: 1.25rem;
                    border-radius: 16px;
                    border: 1px solid #f1f5f9;
                }

                @media (max-width: 480px) {
                    .tx-overview {
                        grid-template-columns: 1fr;
                        gap: 0.75rem;
                    }
                }

                .overview-item label {
                    display: block;
                    font-size: 0.65rem;
                    font-weight: 800;
                    color: #94a3b8;
                    text-transform: uppercase;
                    margin-bottom: 0.15rem;
                }

                .overview-item span {
                    font-size: 0.9rem;
                    font-weight: 700;
                    color: #1e293b;
                    word-break: break-word;
                }

                .overview-item.highlight span {
                    color: #166534;
                    font-size: 1.1rem;
                }

                .modal-divider {
                    margin: 1.5rem 0;
                    border: none;
                    border-top: 1px solid #f1f5f9;
                }

                .section-label {
                    display: block;
                    font-size: 0.8rem;
                    font-weight: 800;
                    color: #1e293b;
                    margin-bottom: 0.75rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .section-label::before {
                    content: '';
                    display: inline-block;
                    width: 3px;
                    height: 12px;
                    background: var(--primary-blue);
                    border-radius: 2px;
                }

                .proof-viewer {
                    margin-bottom: 1.5rem;
                }

                .proof-image-container {
                    background: #f1f5f9;
                    border-radius: 16px;
                    padding: 0.5rem;
                    border: 1px solid #e2e8f0;
                    position: relative;
                    overflow: hidden;
                    min-height: 151px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .proof-image-container img {
                    width: 100%;
                    max-height: 350px;
                    object-fit: contain;
                    border-radius: 12px;
                }

                .zoom-btn {
                    position: absolute;
                    bottom: 1rem;
                    right: 1rem;
                    background: rgba(255,255,255,0.95);
                    backdrop-filter: blur(4px);
                    padding: 8px 16px;
                    border-radius: 12px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #0f172a;
                    text-decoration: none;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    border: 1px solid rgba(0,0,0,0.05);
                }

                .no-proof-state {
                    background: #f8fafc;
                    border: 2px dashed #cbd5e1;
                    border-radius: 16px;
                    padding: 2.5rem 1.5rem;
                    text-align: center;
                    color: #64748b;
                }

                .message-sender {
                    margin-top: 1.5rem;
                }

                .message-textarea {
                    width: 100%;
                    min-height: 90px;
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 14px;
                    padding: 1rem;
                    font-family: inherit;
                    font-size: 0.9rem;
                    resize: vertical;
                    margin-bottom: 0.75rem;
                    transition: all 0.2s;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.03);
                }

                .message-textarea:focus {
                    outline: none;
                    border-color: var(--primary-blue);
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
                }

                .save-msg-btn {
                    background: var(--primary-blue) !important;
                    width: auto !important;
                    font-size: 0.8rem !important;
                    padding: 0.6rem 1.25rem !important;
                    border-radius: 10px !important;
                }

                .inspection-modal-content .modal-footer {
                    padding: 1.25rem 1.5rem;
                    background: #f8fafc;
                    border-top: 1px solid #f1f5f9;
                    display: flex;
                    flex-direction: row;
                    justify-content: flex-end;
                    gap: 0.75rem;
                }

                @media (max-width: 480px) {
                    .inspection-modal-content .modal-footer {
                        flex-direction: column-reverse;
                    }
                    .inspection-modal-content .modal-footer button {
                        width: 100% !important;
                    }
                }

                .approve-btn-large {
                    background: #16a34a !important;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    font-weight: 700 !important;
                    padding-left: 1.5rem !important;
                    padding-right: 1.5rem !important;
                    border-radius: 12px !important;
                }

                .show-mobile { display: block; }
                .hide-mobile { display: block; }

                @media (max-width: 768px) {
                    .show-mobile { display: block; }
                    .hide-mobile { display: none; }
                }

                @media (min-width: 769px) {
                    .show-mobile { display: none; }
                    .hide-mobile { display: block; }
                }

                .commission-text { color: #ef4444; font-weight: 600; }
                .net-text { font-weight: 800; color: #16a34a; }

                .status-badge {
                    padding: 0.25rem 0.6rem;
                    border-radius: 50px;
                    font-size: 0.7rem;
                    font-weight: 700;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.35rem;
                }

                .status-badge.paid { background: #ecfdf5; color: #065f46; }
                .status-badge.pending { background: #fffbeb; color: #92400e; }
                .status-badge.manual_pending { background: #fff7ed; color: #9a3412; border: 1px solid #ffedd5; }

                .approve-btn {
                    background: #10b981 !important;
                    border: none !important;
                    color: white !important;
                    font-weight: 700 !important;
                }

                .approve-btn:hover {
                    background: #059669 !important;
                    transform: translateY(-1px);
                }

                .transaction-card {
                    background: #ffffff;
                    border: 1px solid var(--border-subtle);
                    border-radius: 12px;
                    padding: 1.25rem;
                    margin-bottom: 1rem;
                }

                .tx-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                    border-bottom: 1px solid var(--bg-tertiary);
                    padding-bottom: 0.75rem;
                }

                .tx-date { font-weight: 700; font-size: 0.9rem; }

                .tx-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 0.5rem;
                    font-size: 0.95rem;
                }

                .tx-label { color: var(--text-secondary); }
                .tx-value { font-weight: 600; text-align: right; }

                .tx-footer {
                    margin-top: 1rem;
                    padding-top: 1rem;
                    border-top: 1px dashed var(--border-subtle);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .tx-net-amount {
                    font-size: 1.25rem;
                    font-weight: 800;
                    color: #16a34a;
                    margin-left: 0.5rem;
                }

                .tx-gross-info {
                    font-size: 0.8rem;
                    color: var(--text-tertiary);
                }

                @media (max-width: 768px) {
                    .dashboard-container { 
                        padding: 1rem; 
                    }
                    .dashboard-header { 
                        flex-direction: column; 
                        align-items: flex-start; 
                        gap: 1rem;
                        margin-bottom: 1.5rem;
                    }
                    .dashboard-header h1 {
                        font-size: 1.5rem;
                    }
                    .dashboard-actions { 
                        width: 100%; 
                        flex-direction: column;
                        gap: 0.75rem;
                    }
                    .dashboard-actions a { 
                        flex: 1; 
                        width: 100%;
                    }
                    .dashboard-actions button { 
                        width: 100%; 
                    }
                    .dashboard-tabs { 
                        gap: 0.5rem; 
                        overflow-x: auto; 
                        white-space: nowrap;
                        margin-bottom: 1.5rem;
                        -webkit-overflow-scrolling: touch;
                        padding-bottom: 0.5rem;
                    }
                    .tab-button { 
                        padding: 0.75rem 1rem; 
                        font-size: 0.875rem;
                        min-width: fit-content;
                    }
                    .stats-grid { 
                        grid-template-columns: 1fr; 
                        gap: 1rem;
                        margin-bottom: 1.5rem;
                    }
                    .stat-card { 
                        padding: 1.25rem; 
                    }
                    .stat-value {
                        font-size: 1.75rem;
                    }
                    .dashboard-albums-grid {
                        grid-template-columns: 1fr;
                        gap: 1rem;
                    }
                    .album-card-mini-body {
                        padding: 1.25rem;
                    }
                    .transactions-table-wrapper {
                        overflow-x: auto;
                        -webkit-overflow-scrolling: touch;
                        margin: 0 -1rem;
                        padding: 0 1rem;
                    }
                    .transactions-table {
                        min-width: 600px;
                    }
                    .transactions-table th,
                    .transactions-table td {
                        padding: 0.75rem 0.5rem;
                        font-size: 0.875rem;
                    }
                    .filters-section {
                        grid-template-columns: 1fr;
                        padding: 1rem;
                        gap: 1.25rem;
                    }
                    .filter-buttons {
                        flex-wrap: wrap;
                    }
                    .filter-btn {
                        flex: 1;
                        min-width: 0;
                        padding: 0.625rem 0.5rem;
                        font-size: 0.75rem;
                    }
                    .album-filter-select {
                        width: 100%;
                    }
                    .sales-chart-container {
                        padding: 1rem;
                    }
                    .chart-title {
                        font-size: 1rem;
                        margin-bottom: 1rem;
                    }
                }
                
                @media (max-width: 480px) {
                    .dashboard-container {
                        padding: 0.75rem;
                    }
                    .dashboard-header h1 {
                        font-size: 1.35rem;
                    }
                    .dashboard-actions {
                        gap: 0.5rem;
                    }
                    .tab-button {
                        font-size: 0.8rem;
                        padding: 0.65rem 0.85rem;
                    }
                    .stat-card {
                        padding: 1rem;
                    }
                    .stat-value {
                        font-size: 1.5rem;
                    }
                    .stat-label {
                        font-size: 0.85rem;
                    }
                }
                .pre-inscription-label {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: #f97316;
                    color: white;
                    font-size: 0.65rem;
                    font-weight: 800;
                    text-align: center;
                    padding: 4px;
                    letter-spacing: 0.05em;
                }
            `}</style>
            {
                toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                    />
                )
            }
        </div >
    );
};

export default PhotographerDashboard;
