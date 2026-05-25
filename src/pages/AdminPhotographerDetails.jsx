import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import {
    User, Mail, Phone, Calendar, MapPin, ArrowLeft,
    DollarSign, TrendingUp, Image as ImageIcon, CheckCircle, XCircle,
    ExternalLink, Trash2, Globe
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

import SkeletonPage from '../components/ui/SkeletonPage';

const AdminPhotographerDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [photographer, setPhotographer] = useState(null);
    const [albums, setAlbums] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [allPhotos, setAllPhotos] = useState([]);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPhotographerData();
    }, [id]);

    const fetchPhotographerData = async () => {
        try {
            // 1. Fetch Profile with Private Data
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*, photographer_private_data(*)')
                .eq('id', id)
                .single();

            if (profileError) throw profileError;

            // 2. Fetch Albums
            const { data: userAlbums, error: albumError } = await supabase
                .from('albums')
                .select('*')
                .eq('photographer_id', id)
                .order('created_at', { ascending: false });

            if (albumError) throw albumError;

            // 3. Fetch Transactions
            const { data: userTxs, error: txError } = await supabase
                .from('transactions')
                .select('*')
                .eq('photographer_id', id)
                .order('created_at', { ascending: false });

            if (txError) throw txError;

            // 4. Fetch Photos (for counts)
            const albumIds = userAlbums.map(a => a.id);
            let photosData = [];
            if (albumIds.length > 0) {
                const { data: photos, error: photosError } = await supabase
                    .from('photos')
                    .select('id, album_id')
                    .in('album_id', albumIds);

                if (photosError) throw photosError;
                photosData = photos;
            }

            // 5. Fetch Pricing Plans
            const { data: plansData, error: plansError } = await supabase
                .from('pricing_plans')
                .select('*')
                .order('price', { ascending: true });

            if (!plansError) {
                setPlans(plansData || []);
            }

            // Flatten private data for consistency
            const flattenedProfile = { ...profile };
            if (profile.photographer_private_data) {
                Object.assign(flattenedProfile, profile.photographer_private_data);
            }

            setPhotographer(flattenedProfile);
            setAlbums(userAlbums);
            setTransactions(userTxs);
            // Store photos to calculate stats later
            setAllPhotos(photosData);

        } catch (error) {
            console.error('Error fetching details:', error);
            alert('Failed to load photographer details');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <SkeletonPage />;
    if (!photographer) return <div className="admin-loading">Photographer not found</div>;

    // Calculate Stats
    const totalSales = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalCommission = transactions.reduce((sum, t) => sum + Number(t.commission_amount), 0);
    const netEarnings = totalSales - totalCommission;
    const totalPhotos = allPhotos.length;

    // Calculate Sales and Photos Per Album
    const albumsWithStats = albums.map(album => {
        const albumTxs = transactions.filter(t => t.album_id === album.id);
        const albumRevenue = albumTxs.reduce((sum, t) => sum + Number(t.amount), 0);
        const albumPhotoCount = allPhotos.filter(p => p.album_id === album.id).length;
        return { ...album, revenue: albumRevenue, salesCount: albumTxs.length, photo_count: albumPhotoCount };
    });

    // Find active plan details
    const activePlan = plans.find(pl => pl.id === photographer.plan_id);
    const uploadLimit = activePlan ? activePlan.upload_limit : 100;
    const percentUsed = (totalPhotos / uploadLimit) * 100;

    return (
        <div className="admin-container">
            <div className="admin-header-row">
                <Button variant="outline" onClick={() => navigate('/admin')} style={{ gap: '0.5rem' }}>
                    <ArrowLeft size={16} /> Back to Dashboard
                </Button>
            </div>

            {/* Profile Header Card */}
            <div className="profile-header-card">
                <div className="profile-avatar-large">
                    {photographer.full_name?.[0]?.toUpperCase() || 'P'}
                </div>
                <div className="profile-info-main">
                    <h1 className="profile-name">
                        {photographer.full_name || 'No Name'}
                        {photographer.stripe_account_id ? (
                            <span className="verified-badge"><CheckCircle size={14} /> Verified</span>
                        ) : (
                            <span className="unverified-badge"><XCircle size={14} /> Unverified</span>
                        )}
                    </h1>
                    <div className="profile-meta-grid">
                        <div className="meta-item"><Mail size={14} /> {photographer.email}</div>
                        <div className="meta-item"><Phone size={14} /> {photographer.whatsapp || 'No WhatsApp'}</div>
                        <div className="meta-item"><Globe size={14} /> {photographer.website || 'No Website'}</div>
                        <div className="meta-item"><Calendar size={14} /> Joined {format(parseISO(photographer.created_at), 'MMM yyyy')}</div>
                        {photographer.stripe_account_id && (
                            <div className="meta-item" style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#64748b' }}>
                                <CheckCircle size={14} /> {photographer.stripe_account_id}
                            </div>
                        )}
                    </div>
                </div>
                <div className="profile-actions-right">
                    <Button variant="orange" onClick={() => window.location.href = `mailto:${photographer.email}`}>
                        Contact User
                    </Button>
                </div>
            </div>

            {/* Subscription & Limits Panel */}
            <div className="subscription-limit-panel" style={{
                background: 'white',
                borderRadius: '24px',
                border: '1px solid #e2e8f0',
                padding: '2rem',
                marginTop: '2rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '2.5rem',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>Subscription Plan</h3>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            background: '#eff6ff',
                            color: 'var(--primary-blue)',
                            fontWeight: 800,
                            padding: '0.5rem 1rem',
                            borderRadius: '12px',
                            border: '1px solid #dbeafe',
                            fontSize: '1.1rem'
                        }}>
                            {activePlan ? activePlan.name : 'Free'}
                        </div>
                        <div style={{ fontSize: '0.95rem', color: '#64748b' }}>
                            {activePlan ? `$${activePlan.price}/month` : '$0/month'} • {activePlan ? `${activePlan.commission_percent}% commission` : '15% commission'}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '0.5rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 600 }}>Change Tier:</span>
                        <select
                            value={photographer.plan_id || ''}
                            onChange={async (e) => {
                                const newPlanId = e.target.value;
                                const { error } = await supabase
                                    .from('profiles')
                                    .update({ plan_id: newPlanId || null })
                                    .eq('id', photographer.id);
                                if (error) {
                                    alert('Failed to update plan: ' + error.message);
                                } else {
                                    fetchPhotographerData();
                                }
                            }}
                            style={{
                                padding: '0.4rem 0.8rem',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.9rem',
                                outline: 'none',
                                background: 'white',
                                cursor: 'pointer',
                                fontWeight: 500
                            }}
                        >
                            <option value="">-- No Plan (Default Free) --</option>
                            {plans.map(pl => (
                                <option key={pl.id} value={pl.id}>
                                    {pl.name} (${pl.price}/mo)
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>Photo Upload Usage</h3>
                        <span style={{ fontSize: '0.95rem', color: '#64748b', fontWeight: 600 }}>
                            {totalPhotos.toLocaleString()} / {uploadLimit.toLocaleString()} photos
                        </span>
                    </div>

                    {/* Beautiful Progress Bar */}
                    <div style={{ width: '100%', height: '12px', background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden', marginTop: '0.5rem' }}>
                        <div style={{
                            width: `${Math.min(percentUsed, 100)}%`,
                            height: '100%',
                            background: percentUsed >= 100 ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)' : percentUsed >= 85 ? 'linear-gradient(90deg, #f97316 0%, #ea580c 100%)' : 'linear-gradient(90deg, var(--primary-blue) 0%, #1d4ed8 100%)',
                            borderRadius: '6px',
                            transition: 'width 0.4s ease'
                        }}></div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', color: '#64748b', marginTop: '2px' }}>
                        <span>{percentUsed.toFixed(1)}% of storage capacity used</span>
                        {percentUsed >= 100 && (
                            <span style={{ color: '#ef4444', fontWeight: 700 }}>Upload Blocked (Limit Reached)</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid" style={{ marginTop: '2rem' }}>
                <div className="stat-card">
                    <div className="stat-icon revenue"><DollarSign size={20} /></div>
                    <div className="stat-info">
                        <span className="stat-label">Total Revenue</span>
                        <h2 className="stat-value">${totalSales.toLocaleString()}</h2>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon commission"><TrendingUp size={20} /></div>
                    <div className="stat-info">
                        <span className="stat-label">Net Earnings</span>
                        <h2 className="stat-value">${netEarnings.toLocaleString()}</h2>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon members"><DollarSign size={20} /></div>
                    <div className="stat-info">
                        <span className="stat-label">Platform Fees</span>
                        <h2 className="stat-value">${totalCommission.toLocaleString()}</h2>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon active-albs"><ImageIcon size={20} /></div>
                    <div className="stat-info">
                        <span className="stat-label">Total Albums</span>
                        <h2 className="stat-value">{albums.length}</h2>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon photos"><ImageIcon size={20} /></div>
                    <div className="stat-info">
                        <span className="stat-label">Total Photos</span>
                        <h2 className="stat-value">{totalPhotos.toLocaleString()}</h2>
                    </div>
                </div>
            </div>

            {/* Albums Section */}
            <div className="table-section" style={{ marginTop: '3rem' }}>
                <h2 className="table-title">Photographer's Albums</h2>
                <div className="table-wrapper">
                    <table className="admin-table sticky-header">
                        <thead>
                            <tr>
                                <th style={{ width: '35%' }}>ALBUM</th>
                                <th>TYPE</th>
                                <th>CREATED</th>
                                <th>STATUS</th>
                                <th>PHOTOS</th>
                                <th>SALES (All Time)</th>
                                <th>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {albumsWithStats.length === 0 ? (
                                <tr><td colSpan="7" className="empty-results">No albums uploaded yet.</td></tr>
                            ) : (
                                albumsWithStats.map(album => (
                                    <tr key={album.id}>
                                        <td>
                                            <div className="album-cell-info">
                                                <div className="album-cover-wrapper">
                                                    {album.cover_url ? (
                                                        <img src={album.cover_url} alt="Cover" className="album-mini-cover" />
                                                    ) : (
                                                        <div className="album-cover-placeholder"><ImageIcon size={18} /></div>
                                                    )}
                                                </div>
                                                <div className="album-text-info">
                                                    <span className="album-title">{album.title}</span>
                                                    <span className="album-id">ID: {album.id.slice(0, 8)}...</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            {album.is_free ? (
                                                <span className="type-badge free">Free</span>
                                            ) : album.pre_inscription_enabled ? (
                                                <span className="type-badge pre">Pre-order</span>
                                            ) : (
                                                <span className="type-badge standard">Paid</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="date-cell">
                                                <Calendar size={14} style={{ marginRight: '6px', opacity: 0.6 }} />
                                                {format(parseISO(album.created_at), 'MMM dd, yyyy')}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`status-chip ${album.is_published ? 'published' : 'draft'}`}>
                                                <span className={`status-dot ${album.is_published ? 'published' : 'draft'}`}></span>
                                                {album.is_published ? 'Published' : 'Draft'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="photos-count">
                                                <ImageIcon size={14} style={{ marginRight: '4px', opacity: 0.6 }} />
                                                {album.photo_count || 0}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="sales-cell">
                                                <span className="sales-amount">${album.revenue.toFixed(2)}</span>
                                                {album.salesCount > 0 && <span className="sales-count-badge">{album.salesCount} sales</span>}
                                            </div>
                                        </td>
                                        <td>
                                            <a
                                                href={`/albums/${encodeURIComponent(photographer.id)}/${encodeURIComponent(album.title)}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="view-btn warning-hover"
                                                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                            >
                                                <ExternalLink size={14} /> <span style={{ fontWeight: 500 }}>View</span>
                                            </a>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`
                .admin-container {
                     max-width: 1400px;
                     margin: 0 auto;
                     padding: 2rem 4rem;
                }
                .admin-header-row {
                    margin-bottom: 2rem;
                }
                .profile-header-card {
                    background: white;
                    border: 1px solid var(--border-subtle);
                    border-radius: 20px;
                    padding: 2.5rem;
                    display: flex;
                    align-items: center;
                    gap: 3rem;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.03);
                }
                .profile-avatar-large {
                    width: 120px;
                    height: 120px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, var(--primary-blue), #1e293b);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 3rem;
                    font-weight: 700;
                    box-shadow: 0 10px 25px rgba(15, 23, 42, 0.15);
                }
                .profile-info-main {
                    flex: 1;
                }
                .profile-name {
                    font-size: 2rem;
                    font-weight: 800;
                    margin-bottom: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    color: #0f172a;
                    letter-spacing: -0.02em;
                }
                .verified-badge, .unverified-badge {
                    font-size: 0.85rem;
                    padding: 0.35rem 0.85rem;
                    border-radius: 50px;
                    display: flex;
                    align-items: center;
                    gap: 0.35rem;
                    font-weight: 600;
                    letter-spacing: 0.01em;
                }
                .verified-badge { background: #d1fae5; color: #047857; }
                .unverified-badge { background: #fee2e2; color: #b91c1c; }

                .profile-meta-grid {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 2rem;
                    margin-top: 0.5rem;
                }
                .album-cell-info {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                .album-cover-wrapper {
                    width: 50px;
                    height: 50px;
                    border-radius: 8px;
                    overflow: hidden;
                    background: #f1f5f9;
                    border: 1px solid var(--border-subtle);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #94a3b8;
                }
                .album-mini-cover {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .album-text-info {
                    display: flex;
                    flex-direction: column;
                }
                .album-title {
                    font-weight: 600;
                    color: #0f172a;
                    font-size: 0.95rem;
                }
                .album-id {
                    font-size: 0.75rem;
                    color: #94a3b8;
                    font-family: monospace;
                }
                .date-cell, .photos-count {
                    display: flex;
                    align-items: center;
                    color: #64748b;
                    font-size: 0.9rem;
                    font-weight: 500;
                }
                .status-chip.published { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
                .status-chip.draft { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
                .status-chip {
                    padding: 0.25rem 0.75rem;
                    border-radius: 50px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    text-transform: uppercase;
                    letter-spacing: 0.02em;
                }
                .status-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                }
                .status-dot.published { background: #15803d; }
                .status-dot.draft { background: #b91c1c; }

                .type-badge {
                    padding: 0.2rem 0.6rem;
                    border-radius: 4px;
                    font-size: 0.7rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.03em;
                }
                .type-badge.free { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
                .type-badge.pre { background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; }
                .type-badge.standard { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
                
                .sales-cell {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 0.25rem;
                }
                .sales-amount {
                    font-weight: 700;
                    color: #0f172a;
                    font-size: 1rem;
                }
                .sales-count-badge {
                    font-size: 0.7rem;
                    background: #eff6ff;
                    color: #2563eb;
                    padding: 0.1rem 0.5rem;
                    border-radius: 4px;
                    font-weight: 600;
                }
                
                .view-btn {
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    background: white;
                    border: 1px solid var(--border-subtle);
                    color: #475569;
                    transition: all 0.2s;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                }
                .view-btn:hover {
                    background: #f8fafc;
                    border-color: #cbd5e1;
                    color: #0f172a;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }
                .table-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #0f172a;
                    margin-bottom: 1.5rem;
                    letter-spacing: -0.02em;
                }
                .admin-table th {
                    font-size: 0.8rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: #64748b;
                    font-weight: 700;
                    background: #f8fafc;
                    padding: 1rem 1.5rem;
                    border-bottom: 2px solid #e2e8f0;
                }
                .admin-table td {
                    padding: 1.25rem 1.5rem;
                    border-bottom: 1px solid #f1f5f9;
                    vertical-align: middle;
                }
                .admin-table tr:last-child td {
                    border-bottom: none;
                }
                .table-wrapper {
                     border: 1px solid var(--border-subtle);
                     border-radius: 16px;
                     overflow: hidden;
                     box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
                     background: white;
                }
                
                /* Stats Grid refinement */
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                    gap: 1.5rem;
                }
                .stat-card {
                    background: white;
                    border-radius: 16px;
                    padding: 1.75rem;
                    border: 1px solid var(--border-subtle);
                    display: flex;
                    align-items: center;
                    gap: 1.25rem;
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }
                .stat-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.05);
                }
                .stat-icon {
                    width: 50px;
                    height: 50px;
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.25rem;
                }
                .stat-icon.revenue { background: #eff6ff; color: #2563eb; }
                .stat-icon.commission { background: #f0fdf4; color: #16a34a; }
                .stat-icon.members { background: #fff7ed; color: #ea580c; }
                .stat-icon.active-albs { background: #fdf4ff; color: #c026d3; }
                .stat-icon.photos { background: #e0f2fe; color: #0284c7; }

                .stat-info {
                    display: flex;
                    flex-direction: column;
                }
                .stat-label {
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.03em;
                    margin-bottom: 0.25rem;
                }
                .stat-value {
                    font-size: 1.6rem;
                    font-weight: 800;
                    color: #0f172a;
                    line-height: 1;
                }

                .album-mini-cover {
                    width: 48px;
                    height: 48px;
                    border-radius: 8px;
                    object-fit: cover;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.08);
                }
                .album-title {
                    font-weight: 600;
                    color: #0f172a;
                    font-size: 0.95rem;
                }
                
                .view-btn {
                    padding: 0.4rem 0.8rem;
                    border-radius: 8px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    background: #f1f5f9;
                    color: #475569;
                    transition: all 0.2s;
                }
                .view-btn:hover {
                    background: #e2e8f0;
                    color: #0f172a;
                }

                /* Mobile Responsiveness */
                @media (max-width: 768px) {
                    .admin-container {
                        padding: 1.5rem 1rem;
                    }
                    
                    .profile-header-card {
                        flex-direction: column;
                        text-align: center;
                        padding: 1.5rem;
                        gap: 1.5rem;
                    }

                    .profile-info-main {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                    }

                    .profile-name {
                        flex-direction: column;
                        gap: 0.5rem;
                        text-align: center;
                    }

                    .profile-meta-grid {
                        justify-content: center;
                        gap: 1rem;
                    }

                    .profile-actions-right {
                        width: 100%;
                        display: flex;
                    }

                    .profile-actions-right button {
                        width: 100%;
                        justify-content: center;
                    }

                    .stats-grid {
                        grid-template-columns: 1fr;
                        gap: 1rem;
                    }

                    .stat-card {
                        padding: 1.25rem;
                    }

                    .table-section {
                        margin-top: 2rem;
                    }
                    
                    .table-wrapper {
                        overflow-x: auto;
                    }
                    
                    .admin-table th, .admin-table td {
                        white-space: nowrap;
                        padding: 1rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default AdminPhotographerDetails;
