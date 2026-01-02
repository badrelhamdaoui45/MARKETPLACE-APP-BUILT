
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
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Tableau de bord Photographe</h1>
                <div className="dashboard-actions">
                    <Link to="/photographer/packages">
                        <Button className="action-btn">Réglages Prix</Button>
                    </Link>
                    <Link to="/photographer/albums/new">
                        <Button className="action-btn">+ Créer un Album</Button>
                    </Link>
                </div>
            </header>

            <ConnectStripe />

            {/* Tabs */}
            <div className="dashboard-tabs">
                <button
                    onClick={() => setActiveTab('albums')}
                    className={`tab-button ${activeTab === 'albums' ? 'active' : ''}`}
                >
                    Mes Albums
                </button>
                <button
                    onClick={() => setActiveTab('sales')}
                    className={`tab-button ${activeTab === 'sales' ? 'active' : ''}`}
                >
                    Ventes & Revenus
                </button>
            </div>

            {/* TAB CONTENT: ALBUMS */}
            {activeTab === 'albums' && (
                <div className="tab-content">
                    {loadingAlbums ? (
                        <p className="loading-text">Chargement des albums...</p>
                    ) : albums.length === 0 ? (
                        <div className="empty-dashboard-state">
                            <p>Vous n'avez pas encore créé d'albums.</p>
                            <Link to="/photographer/albums/new">
                                <Button variant="outline">Créer votre premier album</Button>
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
                                            <span className="no-cover-text">Pas de couverture</span>
                                        )}
                                    </div>
                                    <div className="album-card-mini-body">
                                        <h3>{album.title}</h3>
                                        <p className="album-meta">
                                            {album.is_published ? 'Publié' : 'Brouillon'} • ${album.price}
                                        </p>
                                        <Link to={`/photographer/albums/${album.id}`}>
                                            <Button className="w-full action-btn">Gérer l'album</Button>
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT: SALES */}
            {activeTab === 'sales' && (
                <div className="tab-content sales-content">
                    {/* Stats Overview */}
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-label">Volume total des ventes</div>
                            <div className="stat-value">${salesStats.total.toFixed(2)}</div>
                        </div>
                        <div className="stat-card highlight">
                            <div className="stat-label">Revenus nets</div>
                            <div className="stat-value">${salesStats.net.toFixed(2)}</div>
                            <div className="stat-note">Paiements via Stripe</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Commandes totales</div>
                            <div className="stat-value">{salesStats.count}</div>
                        </div>
                    </div>

                    {/* Desktop Transactions Table */}
                    <div className="transactions-table-wrapper hide-mobile">
                        <table className="transactions-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Album</th>
                                    <th>Acheteur</th>
                                    <th>Brut</th>
                                    <th>Commission</th>
                                    <th>Net</th>
                                    <th>Statut</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="empty-table-cell">
                                            Aucune vente enregistrée pour le moment.
                                        </td>
                                    </tr>
                                ) : (
                                    sales.map(tx => (
                                        <tr key={tx.id}>
                                            <td>{new Date(tx.created_at).toLocaleDateString()}</td>
                                            <td>{tx.albums?.title || 'Album inconnu'}</td>
                                            <td>{tx.profiles?.full_name || 'Invité'}</td>
                                            <td>${Number(tx.amount).toFixed(2)}</td>
                                            <td className="commission-text">-${Number(tx.commission_amount).toFixed(2)}</td>
                                            <td className="net-text">
                                                ${(Number(tx.amount) - Number(tx.commission_amount)).toFixed(2)}
                                            </td>
                                            <td>
                                                <span className={`status-badge ${tx.status}`}>
                                                    {tx.status?.toUpperCase()}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Transactions List */}
                    <div className="transactions-mobile-list hide-desktop">
                        {sales.length === 0 ? (
                            <p className="empty-text">Aucune vente enregistrée.</p>
                        ) : (
                            sales.map(tx => (
                                <div key={tx.id} className="transaction-card">
                                    <div className="tx-header">
                                        <span className="tx-date">{new Date(tx.created_at).toLocaleDateString()}</span>
                                        <span className={`status-badge ${tx.status}`}>{tx.status}</span>
                                    </div>
                                    <div className="tx-row">
                                        <span className="tx-label">Album:</span>
                                        <span className="tx-value">{tx.albums?.title || 'Inconnu'}</span>
                                    </div>
                                    <div className="tx-row">
                                        <span className="tx-label">Acheteur:</span>
                                        <span className="tx-value">{tx.profiles?.full_name || 'Invité'}</span>
                                    </div>
                                    <div className="tx-footer">
                                        <div className="tx-amount-group">
                                            <span className="tx-label">Net:</span>
                                            <span className="tx-net-amount">${(Number(tx.amount) - Number(tx.commission_amount)).toFixed(2)}</span>
                                        </div>
                                        <div className="tx-gross-info">
                                            Brut: ${Number(tx.amount).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

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

                .dashboard-albums-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 1.5rem;
                    align-items: start;
                }

                .album-card-mini {
                    background: #ffffff;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    overflow: hidden;
                    transition: all 0.3s ease;
                    display: flex;
                    flex-direction: column;
                }

                .album-card-mini:hover {
                    border-color: #d1d5db;
                }

                .album-card-mini-image {
                    /* Fixed height removed */
                    background: #f3f4f6;
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .album-card-mini-image img {
                    width: 100%;
                    height: auto;
                    display: block;
                }

                .album-card-mini-body {
                    padding: 1.5rem;
                    text-align: center;
                }

                .album-card-mini-body h3 {
                    margin-bottom: 0.5rem;
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: #1f2937;
                }

                .album-meta {
                    color: var(--text-secondary);
                    font-size: 0.9rem;
                    margin-bottom: 1.25rem;
                    font-weight: 500;
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
                    overflow: hidden;
                }

                .transactions-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .transactions-table th {
                    background: var(--bg-tertiary);
                    padding: 1rem;
                    font-size: 0.9rem;
                    text-align: left;
                    font-weight: 700;
                    color: var(--text-secondary);
                }

                .transactions-table td {
                    padding: 1.25rem 1rem;
                    border-top: 1px solid var(--border-subtle);
                    font-size: 0.95rem;
                }

                .commission-text { color: var(--danger-red); }
                .net-text { font-weight: 800; color: #16a34a; }

                .status-badge {
                    padding: 0.4rem 0.75rem;
                    border-radius: 50px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    letter-spacing: 0.02em;
                }

                .status-badge.paid { background: #dcfce7; color: #15803d; }
                .status-badge.pending { background: #fef9c3; color: #854d0e; }

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
            `}</style>
        </div>
    );
};

export default PhotographerDashboard;
