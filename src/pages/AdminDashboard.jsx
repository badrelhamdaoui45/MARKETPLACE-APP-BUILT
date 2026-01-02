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
    ChevronDown, Calendar, Filter, DollarSign
} from 'lucide-react';

const AdminDashboard = () => {
    const [photographers, setPhotographers] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [albums, setAlbums] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPhotographer, setSelectedPhotographer] = useState(null);
    const [dateFilter, setDateFilter] = useState('7'); // '7', '30', 'all'

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

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
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
                <div className="table-header">
                    <h2 className="table-title">Photographer Management</h2>
                    <Button variant="secondary" onClick={fetchAllData} className="refresh-btn">Refresh</Button>
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
                            {photographers.map(p => (
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
                            ))}
                        </tbody>
                    </table>
                </div>
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
                }

                @media (max-width: 640px) {
                    .stats-grid { grid-template-columns: 1fr; }
                    .admin-header { flex-direction: column; align-items: flex-start; gap: 1.5rem; }
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
            `}</style>
        </div>
    );
};

export default AdminDashboard;
