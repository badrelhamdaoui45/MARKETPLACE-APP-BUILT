import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend
} from 'recharts';
import { format, subDays, isAfter, startOfDay, parseISO } from 'date-fns';
import {
    TrendingUp, Users, Image as ImageIcon, Briefcase,
    ChevronDown, Calendar, Filter, DollarSign, Search
} from 'lucide-react';

const AdminDashboard = () => {
    const [photographers, setPhotographers] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [albums, setAlbums] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPhotographer, setSelectedPhotographer] = useState(null);
    const [dateFilter, setDateFilter] = useState('7'); // '7', '30', 'all'
    const [searchTerm, setSearchTerm] = useState('');
    const [salesFilter, setSalesFilter] = useState('all'); // 'all', 'with-sales', 'no-sales'
    const [sortBy, setSortBy] = useState('name'); // 'name', 'revenue-desc', 'revenue-asc'

    // Popup Management State
    const [popups, setPopups] = useState([]);
    const [isEditingPopup, setIsEditingPopup] = useState(false);
    const [currentPopup, setCurrentPopup] = useState(null);
    const [popupForm, setPopupForm] = useState({
        title: '',
        message: '',
        type: 'announcement',
        is_active: true,
        button_text: 'View Details',
        button_link: '',
        image_url: ''
    });

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            const { data: pros, error: prosError } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'photographer');

            if (prosError) throw prosError;

            const { data: txs, error: txsError } = await supabase
                .from('transactions')
                .select('*')
                .order('created_at', { ascending: true });

            if (txsError) throw txsError;
            setTransactions(txs);

            const { data: albs, error: albsError } = await supabase
                .from('albums')
                .select('*');

            if (albsError) throw albsError;
            setAlbums(albs);

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

            // Fetch Global Popups (where album_id is null)
            const { data: globalPopups, error: popupError } = await supabase
                .from('popups')
                .select('*')
                .is('album_id', null)
                .order('created_at', { ascending: false });

            if (!popupError) setPopups(globalPopups || []);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSavePopup = async () => {
        try {
            const { data, error } = await supabase
                .from('popups')
                .upsert({
                    ...popupForm,
                    id: currentPopup?.id || undefined,
                    photographer_id: null, // Admin popups are system-level
                    album_id: null
                })
                .select()
                .single();

            if (error) throw error;

            if (currentPopup) {
                setPopups(popups.map(p => p.id === data.id ? data : p));
            } else {
                setPopups([data, ...popups]);
            }

            setIsEditingPopup(false);
            setCurrentPopup(null);
            resetPopupForm();
        } catch (error) {
            console.error('Error saving popup:', error);
            alert('Failed to save popup');
        }
    };

    const handleDeletePopup = async (id) => {
        if (!window.confirm('Are you sure you want to delete this popup?')) return;
        try {
            const { error } = await supabase.from('popups').delete().eq('id', id);
            if (error) throw error;
            setPopups(popups.filter(p => p.id !== id));
        } catch (error) {
            console.error('Error deleting popup:', error);
        }
    };

    const resetPopupForm = () => {
        setPopupForm({
            title: '',
            message: '',
            type: 'announcement',
            is_active: true,
            button_text: 'View Details',
            button_link: '',
            image_url: ''
        });
    };

    // Chart Data Processing
    const chartData = useMemo(() => {
        if (!transactions.length) return [];

        let filteredTxs = transactions;
        const now = new Date();

        if (dateFilter !== 'all') {
            const daysToSub = parseInt(dateFilter);
            const startDate = startOfDay(subDays(now, daysToSub));
            filteredTxs = transactions.filter(t => isAfter(parseISO(t.created_at), startDate));
        }

        // Group by date
        const grouped = filteredTxs.reduce((acc, tx) => {
            const date = format(parseISO(tx.created_at), 'MMM dd');
            if (!acc[date]) {
                acc[date] = { date, sales: 0, commission: 0 };
            }
            acc[date].sales += Number(tx.amount);
            acc[date].commission += Number(tx.commission_amount);
            return acc;
        }, {});

        return Object.values(grouped);
    }, [transactions, dateFilter]);

    const filteredPhotographers = useMemo(() => {
        let result = photographers.filter(p => {
            const matchesSearch = p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.email?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesSales = salesFilter === 'all' ||
                (salesFilter === 'with-sales' && p.salesCount > 0) ||
                (salesFilter === 'no-sales' && p.salesCount === 0);

            return matchesSearch && matchesSales;
        });

        if (sortBy === 'name') {
            result.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
        } else if (sortBy === 'revenue-desc') {
            result.sort((a, b) => b.totalRevenue - a.totalRevenue);
        } else if (sortBy === 'revenue-asc') {
            result.sort((a, b) => a.totalRevenue - b.totalRevenue);
        }

        return result;
    }, [photographers, searchTerm, salesFilter, sortBy]);

    if (loading) return <div className="admin-loading">Loading Admin Panel...</div>;

    const totalPlatformRevenue = transactions.reduce((sum, t) => sum + Number(t.commission_amount), 0);
    const totalSalesVolume = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

    return (
        <div className="admin-container">
            <header className="admin-header">
                <div>
                    <h1 className="admin-title">Admin Console</h1>
                    <p className="admin-subtitle">Marketplace real-time monitoring</p>
                </div>
                <div className="admin-actions">
                    <div className="filter-group">
                        <Calendar size={16} />
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="date-select"
                        >
                            <option value="7">Last 7 Days</option>
                            <option value="30">Last 30 Days</option>
                            <option value="all">All Time</option>
                        </select>
                    </div>
                </div>
            </header>

            {/* Top Stats */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon revenue"><DollarSign size={20} /></div>
                    <div className="stat-info">
                        <span className="stat-label">Total Volume</span>
                        <h2 className="stat-value">${totalSalesVolume.toLocaleString()}</h2>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon commission"><TrendingUp size={20} /></div>
                    <div className="stat-info">
                        <span className="stat-label">Platform Fees</span>
                        <h2 className="stat-value">${totalPlatformRevenue.toLocaleString()}</h2>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon members"><Users size={20} /></div>
                    <div className="stat-info">
                        <span className="stat-label">Photographers</span>
                        <h2 className="stat-value">{photographers.length}</h2>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon active-albs"><ImageIcon size={20} /></div>
                    <div className="stat-info">
                        <span className="stat-label">Total Albums</span>
                        <h2 className="stat-value">{albums.length}</h2>
                    </div>
                </div>
            </div>

            {/* Analytics Section */}
            <div className="analytics-section">
                <div className="chart-card">
                    <div className="chart-header">
                        <h3 className="chart-title">Revenue Analytics</h3>
                        <div className="chart-legend">
                            <span className="legend-item sales">Sales</span>
                            <span className="legend-item fees">Fees</span>
                        </div>
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={350}>
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--primary-blue)" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="var(--primary-blue)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                                    tickFormatter={(val) => `$${val}`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="sales"
                                    stroke="var(--primary-blue)"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorSales)"
                                    animationDuration={1500}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="commission"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    fill="transparent"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Photographers List */}
            <div className="table-section">
                <div className="table-header photographers-table-header">
                    <div className="table-title-group">
                        <h2 className="table-title">Photographer Management</h2>
                        <span className="results-count">{filteredPhotographers.length} photographers</span>
                    </div>

                    <div className="table-controls">
                        <div className="search-box-admin">
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="filter-select-group">
                            <Filter size={16} />
                            <select
                                value={salesFilter}
                                onChange={(e) => setSalesFilter(e.target.value)}
                            >
                                <option value="all">All Status</option>
                                <option value="with-sales">With Sales</option>
                                <option value="no-sales">No Sales</option>
                            </select>
                        </div>

                        <div className="filter-select-group">
                            <ChevronDown size={16} />
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                <option value="name">Sort by Name</option>
                                <option value="revenue-desc">Revenue (High to Low)</option>
                                <option value="revenue-asc">Revenue (Low to High)</option>
                            </select>
                        </div>

                        <Button variant="secondary" onClick={fetchAllData} className="refresh-btn">Refresh</Button>
                    </div>
                </div>
                <div className="table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>PHOTOGRAPHER</th>
                                <th>STRIPE STATUS</th>
                                <th>ALBUMS</th>
                                <th>SALES</th>
                                <th>PLATFORM FEES</th>
                                <th>NET</th>
                                <th>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPhotographers.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="empty-results">
                                        No photographers found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredPhotographers.map(p => (
                                    <React.Fragment key={p.id}>
                                        <tr className={selectedPhotographer === p.id ? 'active-row' : ''}>
                                            <td>
                                                <div className="user-info">
                                                    <div className="user-avatar">{p.full_name?.[0] || 'P'}</div>
                                                    <div className="user-details">
                                                        <span className="user-name">{p.full_name || 'No Name'}</span>
                                                        <span className="user-email">{p.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`status-chip ${p.stripe_account_id ? 'linked' : 'pending'}`}>
                                                    {p.stripe_account_id ? 'Verified' : 'Unlinked'}
                                                </span>
                                            </td>
                                            <td>{p.albumCount}</td>
                                            <td>${p.totalRevenue.toFixed(2)}</td>
                                            <td>${p.platformFees.toFixed(2)}</td>
                                            <td className="net-earning">${p.netEarnings.toFixed(2)}</td>
                                            <td>
                                                <button
                                                    className="view-btn"
                                                    onClick={() => setSelectedPhotographer(selectedPhotographer === p.id ? null : p.id)}
                                                >
                                                    {selectedPhotographer === p.id ? 'Hide' : 'Inspect'}
                                                </button>
                                            </td>
                                        </tr>
                                        {selectedPhotographer === p.id && (
                                            <tr className="detail-row">
                                                <td colSpan="7">
                                                    <div className="inspected-details">
                                                        <div className="detail-grid">
                                                            <div className="detail-col">
                                                                <h4>Recent Albums</h4>
                                                                <div className="mini-list">
                                                                    {albums.filter(a => a.photographer_id === p.id).slice(0, 3).map(a => (
                                                                        <div key={a.id} className="mini-item">
                                                                            <span>{a.title}</span>
                                                                            <span className="mini-tag">{a.is_published ? 'Live' : 'Draft'}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div className="detail-col">
                                                                <h4>Contact Stats</h4>
                                                                <div className="stat-pill">WhatsApp: {p.whatsapp || 'N/A'}</div>
                                                                <div className="stat-pill">Web: {p.website || 'N/A'}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                )))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Site Popups Management */}
            <div className="table-section" style={{ marginTop: '3rem' }}>
                <div className="table-header">
                    <div>
                        <h2 className="table-title">Site Popups</h2>
                        <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0.25rem 0 0' }}>Manage global announcements and platform messages</p>
                    </div>
                    <Button
                        variant="primary"
                        onClick={() => {
                            resetPopupForm();
                            setCurrentPopup(null);
                            setIsEditingPopup(true);
                        }}
                    >
                        Create Global Popup
                    </Button>
                </div>

                <div className="popups-grid">
                    {popups.length === 0 ? (
                        <div className="empty-popups">No global popups configured.</div>
                    ) : (
                        popups.map(p => (
                            <div key={p.id} className={`popup-admin-card ${p.is_active ? 'active' : 'inactive'}`}>
                                <div className="p-card-header">
                                    <span className={`p-type-badge ${p.type}`}>{p.type}</span>
                                    <div className="p-status-toggle">
                                        <span className={`p-status-dot ${p.is_active ? 'on' : 'off'}`}></span>
                                        {p.is_active ? 'Active' : 'Inactive'}
                                    </div>
                                </div>
                                <div className="p-card-body">
                                    <h4>{p.title}</h4>
                                    <p>{p.message.length > 100 ? p.message.substring(0, 100) + '...' : p.message}</p>
                                </div>
                                <div className="p-card-footer">
                                    <button
                                        className="p-action-btn edit"
                                        onClick={() => {
                                            setCurrentPopup(p);
                                            setPopupForm(p);
                                            setIsEditingPopup(true);
                                        }}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        className="p-action-btn delete"
                                        onClick={() => handleDeletePopup(p.id)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {isEditingPopup && (
                    <div className="popup-overlay-admin">
                        <div className="popup-modal-admin">
                            <div className="modal-header-admin">
                                <h3>{currentPopup ? 'Edit Site Popup' : 'New Site Popup'}</h3>
                                <button className="close-modal-admin" onClick={() => setIsEditingPopup(false)}>&times;</button>
                            </div>
                            <div className="modal-body-admin">
                                <div className="form-row-admin">
                                    <div className="form-group-admin">
                                        <label>Title</label>
                                        <input
                                            type="text"
                                            value={popupForm.title}
                                            onChange={(e) => setPopupForm({ ...popupForm, title: e.target.value })}
                                            placeholder="Catchy title..."
                                        />
                                    </div>
                                    <div className="form-group-admin">
                                        <label>Type</label>
                                        <select
                                            value={popupForm.type}
                                            onChange={(e) => setPopupForm({ ...popupForm, type: e.target.value })}
                                        >
                                            <option value="announcement">Announcement</option>
                                            <option value="album_welcome">Default Welcome</option>
                                            <option value="discount">Promotion</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group-admin">
                                    <label>Message</label>
                                    <textarea
                                        value={popupForm.message}
                                        onChange={(e) => setPopupForm({ ...popupForm, message: e.target.value })}
                                        placeholder="Detailed content..."
                                    />
                                </div>
                                <div className="form-row-admin">
                                    <div className="form-group-admin">
                                        <label>Button Text</label>
                                        <input
                                            type="text"
                                            value={popupForm.button_text}
                                            onChange={(e) => setPopupForm({ ...popupForm, button_text: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group-admin">
                                        <label>Button Link (URL)</label>
                                        <input
                                            type="text"
                                            value={popupForm.button_link}
                                            onChange={(e) => setPopupForm({ ...popupForm, button_link: e.target.value })}
                                            placeholder="https://..."
                                        />
                                    </div>
                                </div>
                                <div className="form-group-admin">
                                    <label>Image URL (Optional)</label>
                                    <input
                                        type="text"
                                        value={popupForm.image_url || ''}
                                        onChange={(e) => setPopupForm({ ...popupForm, image_url: e.target.value })}
                                        placeholder="https://images.unsplash.com/..."
                                    />
                                </div>
                                <div className="form-group-admin checkbox">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={popupForm.is_active}
                                            onChange={(e) => setPopupForm({ ...popupForm, is_active: e.target.checked })}
                                        />
                                        <span>Show this popup on the site</span>
                                    </label>
                                </div>
                            </div>
                            <div className="modal-footer-admin">
                                <Button variant="secondary" onClick={() => setIsEditingPopup(false)}>Cancel</Button>
                                <Button variant="primary" onClick={handleSavePopup}>Save Popup</Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .admin-container {
                    padding: 3rem 2rem;
                    max-width: 1400px;
                    margin: 0 auto;
                    font-family: 'Inter', sans-serif;
                }

                .admin-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 3rem;
                }

                .admin-title {
                    font-size: 2.5rem;
                    font-weight: 800;
                    color: #0f172a;
                    margin: 0;
                    letter-spacing: -0.02em;
                }

                .admin-subtitle {
                    color: #64748b;
                    margin: 0.5rem 0 0;
                    font-size: 1.1rem;
                }

                .filter-group {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    background: white;
                    padding: 0.5rem 1rem;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    color: #64748b;
                }

                .date-select {
                    border: none;
                    background: none;
                    font-weight: 600;
                    color: #0f172a;
                    cursor: pointer;
                    outline: none;
                }

                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 1.5rem;
                    margin-bottom: 3rem;
                }

                .admin-actions {
                    display: flex;
                    gap: 1rem;
                }
                
                .photographers-table-header {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 1.25rem;
                }

                @media (min-width: 1024px) {
                    .photographers-table-header {
                        flex-direction: row;
                        align-items: center;
                        justify-content: space-between;
                    }
                }

                .table-title-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }

                .results-count {
                    font-size: 0.8125rem;
                    color: #94a3b8;
                    font-weight: 500;
                }

                .table-controls {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    flex-wrap: wrap;
                }

                .search-box-admin {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    background: #f8fafc;
                    padding: 0.5rem 1rem;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    min-width: 280px;
                    transition: all 0.2s ease;
                }

                .search-box-admin:focus-within {
                    background: white;
                    border-color: var(--primary-blue);
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
                }

                .search-box-admin input {
                    border: none;
                    background: none;
                    font-size: 0.875rem;
                    color: #0f172a;
                    width: 100%;
                    outline: none;
                }

                .filter-select-group {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: #f8fafc;
                    padding: 0.5rem 0.75rem;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    color: #64748b;
                }

                .filter-select-group select {
                    border: none;
                    background: none;
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: #334155;
                    cursor: pointer;
                    outline: none;
                    padding-right: 0.5rem;
                }

                .empty-results {
                    text-align: center;
                    padding: 3rem !important;
                    color: #64748b;
                    font-style: italic;
                }

                .stat-card {
                    background: white;
                    padding: 1.5rem;
                    border-radius: 20px;
                    border: 1px solid #e2e8f0;
                    display: flex;
                    align-items: center;
                    gap: 1.25rem;
                    transition: all 0.3s ease;
                }

                .stat-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);
                }

                .stat-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .stat-icon.revenue { background: #eff6ff; color: var(--primary-blue); }
                .stat-icon.commission { background: #ecfdf5; color: #10b981; }
                .stat-icon.members { background: #fef2f2; color: #ef4444; }
                .stat-icon.active-albs { background: #f5f3ff; color: #8b5cf6; }

                .stat-label {
                    display: block;
                    font-size: 0.875rem;
                    color: #64748b;
                    margin-bottom: 0.25rem;
                    font-weight: 500;
                }

                .stat-value {
                    margin: 0;
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #0f172a;
                }

                .analytics-section {
                    margin-bottom: 3rem;
                }

                .chart-card {
                    background: white;
                    padding: 2rem;
                    border-radius: 24px;
                    border: 1px solid #e2e8f0;
                }

                .chart-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                }

                .chart-title {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #0f172a;
                    margin: 0;
                }

                .chart-legend {
                    display: flex;
                    gap: 1.5rem;
                }

                .legend-item {
                    font-size: 0.875rem;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .legend-item.sales::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--primary-blue); }
                .legend-item.fees::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: #10b981; }

                .table-section {
                    background: white;
                    border-radius: 24px;
                    border: 1px solid #e2e8f0;
                    overflow: hidden;
                }

                .table-header {
                    padding: 1.5rem 2rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid #f1f5f9;
                }

                .table-title {
                    font-size: 1.125rem;
                    font-weight: 700;
                    margin: 0;
                }

                .refresh-btn {
                    padding: 0.5rem 1.25rem !important;
                    font-size: 0.875rem !important;
                }

                .table-wrapper {
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                }

                .admin-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .admin-table th {
                    text-align: left;
                    padding: 1.25rem 2rem;
                    background: #f8fafc;
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .admin-table td {
                    padding: 1.5rem 2rem;
                    border-bottom: 1px solid #f1f5f9;
                    font-size: 0.9375rem;
                    color: #334155;
                }

                .user-info {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .user-avatar {
                    width: 40px;
                    height: 40px;
                    background: #e2e8f0;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    color: #64748b;
                }

                .user-details {
                    display: flex;
                    flex-direction: column;
                }

                .user-name {
                    font-weight: 600;
                    color: #0f172a;
                }

                .user-email {
                    font-size: 0.8125rem;
                    color: #64748b;
                }

                .status-chip {
                    padding: 0.375rem 0.75rem;
                    border-radius: 8px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    text-transform: uppercase;
                }

                .status-chip.linked { background: #ecfdf5; color: #10b981; }
                .status-chip.pending { background: #fff7ed; color: #f97316; }

                .net-earning {
                    font-weight: 700;
                    color: var(--primary-blue);
                }

                .view-btn {
                    background: none;
                    border: none;
                    color: var(--primary-blue);
                    font-weight: 600;
                    cursor: pointer;
                    padding: 0.5rem;
                    border-radius: 8px;
                }

                .view-btn:hover { background: #eff6ff; }

                .active-row { background: #f8fafc; }

                .detail-row { background: #fafafa; }

                .inspected-details {
                    padding: 2rem;
                    background: white;
                    margin: 0 2rem 2rem;
                    border-radius: 16px;
                    border: 1px solid #e2e8f0;
                }

                .detail-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 3rem;
                }

                .detail-col h4 {
                    margin: 0 0 1rem;
                    font-size: 0.875rem;
                    color: #64748b;
                    text-transform: uppercase;
                }

                .mini-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 0.75rem 0;
                    border-bottom: 1px dashed #e2e8f0;
                    font-size: 0.875rem;
                }

                .mini-tag {
                    font-size: 0.75rem;
                    background: #f1f5f9;
                    padding: 2px 8px;
                    border-radius: 6px;
                }

                .stat-pill {
                    background: #f8fafc;
                    padding: 0.75rem 1rem;
                    border-radius: 10px;
                    margin-bottom: 0.5rem;
                    font-size: 0.875rem;
                    font-weight: 500;
                }

                @media (max-width: 1024px) {
                    .stats-grid { grid-template-columns: repeat(2, 1fr); }
                    .detail-grid { grid-template-columns: 1fr; gap: 1.5rem; }
                    .form-row-admin { grid-template-columns: 1fr; }
                }

                @media (max-width: 768px) {
                    .admin-container { padding: 1.5rem 1rem; }
                    .admin-header { 
                        flex-direction: column; 
                        align-items: stretch; 
                        gap: 1.5rem; 
                        text-align: center;
                    }
                    .admin-title { font-size: 1.75rem; }
                    .admin-subtitle { font-size: 0.95rem; }
                    .admin-actions { justify-content: center; }
                    
                    .stats-grid { gap: 1rem; margin-bottom: 2rem; }
                    .stat-card { padding: 1.25rem; gap: 1rem; }
                    .stat-value { font-size: 1.25rem; }
                    
                    .table-header { padding: 1.25rem 1rem; }
                    .table-controls { width: 100%; flex-direction: column; align-items: stretch; }
                    .search-box-admin { min-width: 100%; }
                    .filter-select-group { width: 100%; justify-content: space-between; }
                    .filter-select-group select { flex: 1; }
                    
                    .chart-card { padding: 1.25rem; }
                    .chart-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
                    
                    .admin-table { min-width: 900px; }
                    .admin-table th, .admin-table td { padding: 1rem 1.25rem; }
                    
                    .inspected-details { margin: 0 1rem 1rem; padding: 1.5rem; }
                    
                    .popups-grid { padding: 1rem; grid-template-columns: 1fr; }
                }

                @media (max-width: 480px) {
                    .stats-grid { grid-template-columns: 1fr; }
                    .admin-title { font-size: 1.5rem; }
                    .modal-body-admin { padding: 1.25rem; }
                    .popup-modal-admin { border-radius: 16px; }
                    .modal-header-admin { padding: 1.25rem 1.5rem; }
                    .modal-footer-admin { padding: 1.25rem 1.5rem; flex-direction: column; }
                    .modal-footer-admin button { width: 100%; }
                }

                .admin-loading {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: var(--primary-blue);
                }

                /* Site Popups Specific Styles */
                .popups-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 1.5rem;
                    padding: 2rem;
                    background: #f8fafc;
                }

                .empty-popups {
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 3rem;
                    color: #64748b;
                    font-style: italic;
                    background: white;
                    border-radius: 12px;
                    border: 1px dashed #cbd5e1;
                }

                .popup-admin-card {
                    background: white;
                    border-radius: 16px;
                    border: 1px solid #e2e8f0;
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
                    transition: transform 0.2s, box-shadow 0.2s;
                }

                .popup-admin-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
                }

                .p-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .p-type-badge {
                    font-size: 0.7rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    padding: 0.25rem 0.75rem;
                    border-radius: 20px;
                    letter-spacing: 0.05em;
                }

                .p-type-badge.announcement { background: #eff6ff; color: var(--primary-blue); }
                .p-type-badge.album_welcome { background: #fdf2f8; color: #db2777; }
                .p-type-badge.discount { background: #f0fdf4; color: #16a34a; }

                .p-status-toggle {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #64748b;
                }

                .p-status-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                }

                .p-status-dot.on { background: #10b981; box-shadow: 0 0 8px rgba(16, 185, 129, 0.5); }
                .p-status-dot.off { background: #94a3b8; }

                .p-card-body h4 {
                    margin: 0 0 0.5rem;
                    font-size: 1.125rem;
                    color: #0f172a;
                    font-weight: 700;
                }

                .p-card-body p {
                    margin: 0;
                    font-size: 0.875rem;
                    color: #64748b;
                    line-height: 1.5;
                }

                .p-card-footer {
                    margin-top: auto;
                    display: flex;
                    gap: 0.75rem;
                    padding-top: 1rem;
                    border-top: 1px solid #f1f5f9;
                }

                .p-action-btn {
                    flex: 1;
                    padding: 0.5rem;
                    border-radius: 8px;
                    font-size: 0.8125rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .p-action-btn.edit {
                    background: #f1f5f9;
                    color: #475569;
                    border: 1px solid #e2e8f0;
                }

                .p-action-btn.edit:hover { background: #e2e8f0; }

                .p-action-btn.delete {
                    background: #fef2f2;
                    color: #dc2626;
                    border: 1px solid #fee2e2;
                }

                .p-action-btn.delete:hover { background: #fee2e2; }

                /* Admin Modal Styles */
                .popup-overlay-admin {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.4);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 1.5rem;
                }

                .popup-modal-admin {
                    background: white;
                    width: 100%;
                    max-width: 600px;
                    border-radius: 24px;
                    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
                    overflow: hidden;
                    animation: modalIn 0.3s ease-out;
                }

                @keyframes modalIn {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }

                .modal-header-admin {
                    padding: 1.5rem 2rem;
                    border-bottom: 1px solid #f1f5f9;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .modal-header-admin h3 {
                    margin: 0;
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #0f172a;
                }

                .close-modal-admin {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    color: #94a3b8;
                    cursor: pointer;
                }

                .modal-body-admin {
                    padding: 2rem;
                    max-height: 70vh;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                .form-group-admin {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .form-group-admin.checkbox {
                    flex-direction: row;
                    align-items: center;
                    padding: 1rem;
                    background: #f8fafc;
                    border-radius: 12px;
                }

                .form-group-admin.checkbox label {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 0.9375rem;
                    color: #334155;
                }

                .form-row-admin {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1.25rem;
                }

                .form-group-admin label {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .form-group-admin input,
                .form-group-admin select,
                .form-group-admin textarea {
                    padding: 0.75rem 1rem;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    font-size: 0.9375rem;
                    color: #0f172a;
                    transition: border-color 0.2s;
                }

                .form-group-admin input:focus,
                .form-group-admin select:focus,
                .form-group-admin textarea:focus {
                    outline: none;
                    border-color: var(--primary-blue);
                    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
                }

                .form-group-admin textarea {
                    min-height: 100px;
                    resize: vertical;
                }

                .modal-footer-admin {
                    padding: 1.5rem 2rem;
                    background: #f8fafc;
                    border-top: 1px solid #f1f5f9;
                    display: flex;
                    justify-content: flex-end;
                    gap: 1rem;
                }
            `}</style>
        </div>
    );
};

export default AdminDashboard;
