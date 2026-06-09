import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import Button from '../ui/Button';
import { 
    Search, User, Mail, Phone, Globe, ShieldCheck, 
    Download, Edit, Calendar, DollarSign, ShoppingBag, 
    Plus, X, Filter, ChevronRight, Check, Eye, ExternalLink, Loader
} from 'lucide-react';
import Modal from '../ui/Modal';
import Toast from '../ui/Toast';
import { formatPrice } from '../../utils/currencies';

export default function AdminBuyersDirectory() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [countryFilter, setCountryFilter] = useState('all');
    const [photographerFilter, setPhotographerFilter] = useState('all');
    const [albumFilter, setAlbumFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', '7', '30'
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'paid', 'manual_pending'
    const [methodFilter, setMethodFilter] = useState('all'); // 'all', 'stripe', 'bank_transfer', 'free'
    const [preInscriptions, setPreInscriptions] = useState([]);
    const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'buyers', 'leads'
    
    // Details drawer state
    const [selectedBuyer, setSelectedBuyer] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    
    // Photo viewing state
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [photoDetails, setPhotoDetails] = useState([]);
    const [loadingPhotos, setLoadingPhotos] = useState(false);

    // Edit profile state
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        full_name: '',
        phone: '',
        country: '',
        email: ''
    });
    const [savingProfile, setSavingProfile] = useState(false);

    // Add buyer modal state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addForm, setAddForm] = useState({
        fullName: '',
        email: '',
        phone: '',
        country: '',
        password: ''
    });
    const [addingBuyer, setAddingBuyer] = useState(false);

    // Toast state
    const [toast, setToast] = useState(null);

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            // 1. Fetch transactions
            const { data: txData, error: txError } = await supabase
                .from('transactions')
                .select(`
                    id,
                    order_number,
                    amount,
                    commission_amount,
                    currency,
                    status,
                    payment_method,
                    created_at,
                    unlocked_photo_ids,
                    buyer_email,
                    buyer:profiles!buyer_id(
                        id,
                        email,
                        full_name,
                        phone,
                        country,
                        created_at
                    ),
                    album:albums!album_id(
                        id,
                        title,
                        cover_image_url,
                        photographer:profiles!photographer_id(
                            id,
                            full_name,
                            email
                        )
                    )
                `)
                .order('created_at', { ascending: false });

            if (txError) throw txError;
            setTransactions(txData || []);

            // 2. Fetch pre-inscriptions
            const { data: preData, error: preError } = await supabase
                .from('pre_inscriptions')
                .select(`
                    id,
                    email,
                    phone,
                    created_at,
                    album:albums!album_id(
                        id,
                        title,
                        cover_image_url,
                        photographer:profiles!photographer_id(
                            id,
                            full_name,
                            email
                        )
                    )
                `)
                .order('created_at', { ascending: false });

            if (preError) throw preError;
            setPreInscriptions(preData || []);
        } catch (err) {
            console.error('Error fetching buyers directory data:', err);
            showToast('Failed to load buyers directory data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    // Aggregate Transactions and Pre-subscriptions into Unique Buyers/Leads Directory
    const buyersList = useMemo(() => {
        const buyersMap = {};

        // 1. Process pre-inscriptions (Leads) first
        preInscriptions.forEach(pre => {
            if (!pre.email) return;
            const email = pre.email.toLowerCase().trim();
            
            if (!buyersMap[email]) {
                buyersMap[email] = {
                    id: null,
                    email: email,
                    full_name: email.split('@')[0] || 'Pre-Subscriber',
                    phone: pre.phone || 'N/A',
                    country: 'N/A',
                    created_at: pre.created_at,
                    is_lead: true,
                    is_guest: false,
                    total_spent: 0,
                    total_commission: 0,
                    transactions_count: 0,
                    last_purchase_date: null,
                    unlocked_photos_count: 0,
                    purchases: [],
                    pre_inscriptions: [],
                    currencies: new Set()
                };
            }
            
            buyersMap[email].pre_inscriptions.push(pre);
            if (pre.phone && pre.phone !== 'N/A' && buyersMap[email].phone === 'N/A') {
                buyersMap[email].phone = pre.phone;
            }
            if (new Date(pre.created_at) < new Date(buyersMap[email].created_at)) {
                buyersMap[email].created_at = pre.created_at; // Set first seen date
            }
        });

        // 2. Process transactions (Buyers)
        transactions.forEach(tx => {
            const email = (tx.buyer?.email || tx.buyer_email || 'guest@example.com').toLowerCase().trim();
            
            if (!buyersMap[email]) {
                buyersMap[email] = {
                    id: tx.buyer?.id || null, // profile ID
                    email: email,
                    full_name: tx.buyer?.full_name || tx.buyer_email?.split('@')[0] || 'Runner',
                    phone: tx.buyer?.phone || tx.buyer?.whatsapp || 'N/A',
                    country: tx.buyer?.country || 'N/A',
                    created_at: tx.buyer?.created_at || tx.created_at,
                    is_lead: false,
                    is_guest: !tx.buyer,
                    total_spent: 0,
                    total_commission: 0,
                    transactions_count: 0,
                    last_purchase_date: tx.created_at,
                    unlocked_photos_count: 0,
                    purchases: [],
                    pre_inscriptions: [],
                    currencies: new Set()
                };
            } else {
                // If previously treated as lead, now upgrade to buyer status since they made a purchase
                buyersMap[email].is_lead = false;
                buyersMap[email].id = tx.buyer?.id || buyersMap[email].id;
                if (tx.buyer?.full_name) buyersMap[email].full_name = tx.buyer.full_name;
                if (tx.buyer?.phone || tx.buyer?.whatsapp) {
                    buyersMap[email].phone = tx.buyer.phone || tx.buyer.whatsapp;
                }
                if (tx.buyer?.country && tx.buyer.country !== 'N/A') {
                    buyersMap[email].country = tx.buyer.country;
                }
            }

            const buyer = buyersMap[email];
            buyer.total_spent += Number(tx.amount || 0);
            buyer.total_commission += Number(tx.commission_amount || 0);
            buyer.transactions_count += 1;
            buyer.unlocked_photos_count += tx.unlocked_photo_ids?.length || 0;
            buyer.purchases.push(tx);
            if (tx.currency) buyer.currencies.add(tx.currency);

            if (!buyer.last_purchase_date || new Date(tx.created_at) > new Date(buyer.last_purchase_date)) {
                buyer.last_purchase_date = tx.created_at;
            }
        });

        // Convert set to array and format objects
        return Object.values(buyersMap).map(b => ({
            ...b,
            currency: Array.from(b.currencies)[0] || 'USD'
        }));
    }, [transactions, preInscriptions]);

    // Unique Filter Matrices derived from data
    const filterOptions = useMemo(() => {
        const countries = new Set();
        const photographers = new Map(); // id -> name
        const albums = new Map(); // id -> title

        transactions.forEach(tx => {
            if (tx.buyer?.country) {
                countries.add(tx.buyer.country);
            }
            if (tx.album?.photographer) {
                photographers.set(tx.album.photographer.id, tx.album.photographer.full_name);
            }
            if (tx.album) {
                albums.set(tx.album.id, tx.album.title);
            }
        });

        preInscriptions.forEach(pre => {
            if (pre.album?.photographer) {
                photographers.set(pre.album.photographer.id, pre.album.photographer.full_name);
            }
            if (pre.album) {
                albums.set(pre.album.id, pre.album.title);
            }
        });

        return {
            countries: Array.from(countries).sort(),
            photographers: Array.from(photographers.entries()).map(([id, name]) => ({ id, name })),
            albums: Array.from(albums.entries()).map(([id, title]) => ({ id, title }))
        };
    }, [transactions, preInscriptions]);

    // Apply Search and Filters to Buyers List
    const filteredBuyers = useMemo(() => {
        return buyersList.filter(buyer => {
            // Search filter (name, email, phone)
            const matchesSearch = 
                buyer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                buyer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                buyer.phone.toLowerCase().includes(searchTerm.toLowerCase());

            if (!matchesSearch) return false;

            // Country filter
            if (countryFilter !== 'all' && buyer.country !== countryFilter) return false;

            // Type filter
            if (typeFilter === 'buyers' && buyer.is_lead) return false;
            if (typeFilter === 'leads' && !buyer.is_lead) return false;

            // Photographer and Album filters require scanning through buyer purchases and pre_inscriptions
            if (photographerFilter !== 'all' || albumFilter !== 'all' || dateFilter !== 'all' || statusFilter !== 'all' || methodFilter !== 'all') {
                const matchesPurchaseFilters = buyer.purchases.some(tx => {
                    // Photographer match
                    if (photographerFilter !== 'all' && tx.album?.photographer?.id !== photographerFilter) return false;
                    
                    // Album match
                    if (albumFilter !== 'all' && tx.album?.id !== albumFilter) return false;

                    // Date range match
                    if (dateFilter !== 'all') {
                        const txDate = new Date(tx.created_at);
                        const today = new Date();
                        if (dateFilter === 'today') {
                            if (txDate.toDateString() !== today.toDateString()) return false;
                        } else {
                            const daysLimit = Number(dateFilter);
                            const cutoffDate = new Date(today.setDate(today.getDate() - daysLimit));
                            if (txDate < cutoffDate) return false;
                        }
                    }

                    // Status match
                    if (statusFilter !== 'all' && tx.status !== statusFilter) return false;

                    // Payment Method match
                    if (methodFilter !== 'all' && tx.payment_method !== methodFilter) return false;

                    return true;
                });

                const matchesPreInscriptionFilters = buyer.pre_inscriptions.some(pre => {
                    // Photographer match
                    if (photographerFilter !== 'all' && pre.album?.photographer?.id !== photographerFilter) return false;
                    
                    // Album match
                    if (albumFilter !== 'all' && pre.album?.id !== albumFilter) return false;

                    // Date range match
                    if (dateFilter !== 'all') {
                        const preDate = new Date(pre.created_at);
                        const today = new Date();
                        if (dateFilter === 'today') {
                            if (preDate.toDateString() !== today.toDateString()) return false;
                        } else {
                            const daysLimit = Number(dateFilter);
                            const cutoffDate = new Date(today.setDate(today.getDate() - daysLimit));
                            if (preDate < cutoffDate) return false;
                        }
                    }

                    // Status/Method filters are only relevant for purchases
                    if (statusFilter !== 'all' || methodFilter !== 'all') return false;

                    return true;
                });

                if (!matchesPurchaseFilters && !matchesPreInscriptionFilters) return false;
            }

            return true;
        });
    }, [buyersList, searchTerm, countryFilter, typeFilter, photographerFilter, albumFilter, dateFilter, statusFilter, methodFilter]);

    // Statistics aggregates from FILTERED list
    const stats = useMemo(() => {
        const count = filteredBuyers.length;
        const totalVolume = filteredBuyers.reduce((sum, b) => sum + b.total_spent, 0);
        const totalCommission = filteredBuyers.reduce((sum, b) => sum + b.total_commission, 0);
        
        // Count buyers vs leads
        const buyersCount = filteredBuyers.filter(b => !b.is_lead).length;
        const leadsCount = filteredBuyers.filter(b => b.is_lead).length;

        // Compute AOV based on filtered transactions count
        const totalTransactions = filteredBuyers.reduce((sum, b) => sum + b.transactions_count, 0);
        const aov = totalTransactions > 0 ? totalVolume / totalTransactions : 0;

        // Leading Location Country
        const countryCounts = {};
        filteredBuyers.forEach(b => {
            if (b.country && b.country !== 'N/A') {
                countryCounts[b.country] = (countryCounts[b.country] || 0) + 1;
            }
        });
        let topCountry = 'N/A';
        let maxCount = 0;
        Object.entries(countryCounts).forEach(([country, count]) => {
            if (count > maxCount) {
                maxCount = count;
                topCountry = country;
            }
        });

        return {
            count,
            buyersCount,
            leadsCount,
            totalVolume,
            totalCommission,
            aov,
            topCountry
        };
    }, [filteredBuyers]);

    // Fetch details of photos for a specific transaction inside drawer
    const fetchPhotoPreviews = async (photoIds) => {
        if (!photoIds || photoIds.length === 0) return;
        setLoadingPhotos(true);
        try {
            const { data, error } = await supabase
                .from('photos')
                .select('id, title, watermarked_url, original_url')
                .in('id', photoIds);
            
            if (error) throw error;
            setPhotoDetails(data || []);
        } catch (err) {
            console.error('Error fetching photo previews:', err);
        } finally {
            setLoadingPhotos(false);
        }
    };

    // Open detailed drawer of a buyer
    const handleViewDetails = (buyer) => {
        setSelectedBuyer(buyer);
        setEditForm({
            full_name: buyer.full_name,
            phone: buyer.phone === 'N/A' ? '' : buyer.phone,
            country: buyer.country === 'N/A' ? '' : buyer.country,
            email: buyer.email
        });
        setPhotoDetails([]);
        setIsEditing(false);
        
        // Pre-fetch photo previews for their latest purchase if any
        if (buyer.purchases?.[0]?.unlocked_photo_ids) {
            fetchPhotoPreviews(buyer.purchases[0].unlocked_photo_ids);
        }
        
        setIsDrawerOpen(true);
    };

    // Save edited buyer profile details
    const handleSaveProfile = async () => {
        if (!selectedBuyer.id) {
            showToast('Cannot edit details of unregistered guest checkout buyers', 'error');
            return;
        }

        setSavingProfile(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: editForm.full_name,
                    phone: editForm.phone,
                    country: editForm.country
                })
                .eq('id', selectedBuyer.id);

            if (error) throw error;

            showToast('Buyer profile updated successfully!');
            setIsEditing(false);
            
            // Refresh local database transactions/profiles
            await fetchTransactions();
            
            // Update currently selected buyer locally in state
            setSelectedBuyer(prev => ({
                ...prev,
                full_name: editForm.full_name,
                phone: editForm.phone || 'N/A',
                country: editForm.country || 'N/A'
            }));
        } catch (err) {
            console.error('Error saving profile changes:', err);
            showToast(err.message || 'Failed to update profile', 'error');
        } finally {
            setSavingProfile(false);
        }
    };

    // Securely register a new buyer without logging out admin session
    const handleAddBuyer = async (e) => {
        e.preventDefault();
        if (!addForm.email || !addForm.fullName || !addForm.password) {
            showToast('Full name, email, and password are required', 'error');
            return;
        }

        setAddingBuyer(true);
        try {
            // Instantiate transient client to prevent session-persistence overwrite (keeps admin logged in)
            const tempClient = createClient(
                import.meta.env.VITE_SUPABASE_URL,
                import.meta.env.VITE_SUPABASE_ANON_KEY,
                { auth: { persistSession: false } }
            );

            const { data, error } = await tempClient.auth.signUp({
                email: addForm.email,
                password: addForm.password,
                options: {
                    data: {
                        full_name: addForm.fullName,
                        role: 'runner',
                        phone: addForm.phone,
                        country: addForm.country
                    }
                }
            });

            if (error) throw error;

            showToast('New buyer registered successfully!');
            setIsAddModalOpen(false);
            setAddForm({
                fullName: '',
                email: '',
                phone: '',
                country: '',
                password: ''
            });

            // Refresh table
            await fetchTransactions();
        } catch (err) {
            console.error('Error manually creating runner buyer:', err);
            showToast(err.message || 'Failed to register buyer', 'error');
        } finally {
            setAddingBuyer(false);
        }
    };

    // CSV Export Logic for Filtered List
    const handleExportCSV = () => {
        try {
            const headers = ['Name', 'Email', 'Phone', 'Country', 'Type', 'Total Spent', 'Commission Paid', 'Purchases Count', 'Registered/First Date', 'Last Purchase Date', 'Pre-Subscribed Albums'];
            
            const rows = filteredBuyers.map(b => [
                b.full_name,
                b.email,
                b.phone,
                b.country,
                b.is_lead ? 'Lead (Subscriber)' : (b.is_guest ? 'Guest' : 'Registered Runner'),
                b.total_spent.toFixed(2),
                b.total_commission.toFixed(2),
                b.transactions_count,
                new Date(b.created_at).toLocaleDateString(),
                b.last_purchase_date ? new Date(b.last_purchase_date).toLocaleDateString() : 'N/A',
                b.pre_inscriptions ? b.pre_inscriptions.map(pre => pre.album?.title || 'Unknown').join('; ') : ''
            ]);

            const csvContent = "data:text/csv;charset=utf-8," 
                + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
            
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `marketplace_buyers_report_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast('Buyers directory report exported successfully!');
        } catch (err) {
            console.error('Error during CSV export:', err);
            showToast('Failed to export CSV report', 'error');
        }
    };

    // CSV Export of individual buyer's transaction history
    const handleExportIndividualCSV = (buyer) => {
        try {
            const headers = ['Order Number', 'Date', 'Album Title', 'Photographer', 'Amount Paid', 'Platform Commission', 'Payment Method', 'Status', 'Photos Purchased'];
            
            const rows = buyer.purchases.map(tx => [
                tx.order_number || 'N/A',
                new Date(tx.created_at).toLocaleDateString(),
                tx.album?.title || 'Unknown Album',
                tx.album?.photographer?.full_name || 'N/A',
                tx.amount.toFixed(2),
                tx.commission_amount.toFixed(2),
                tx.payment_method || 'stripe',
                tx.status || 'paid',
                tx.unlocked_photo_ids?.length || 0
            ]);

            const csvContent = "data:text/csv;charset=utf-8," 
                + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
            
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `${buyer.full_name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_purchases.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast(`Purchase history exported for ${buyer.full_name}!`);
        } catch (err) {
            console.error('Error exporting individual history:', err);
            showToast('Failed to export purchase history', 'error');
        }
    };

    return (
        <div className="directory-container">
            {/* Top Stat Cards Section */}
            <div className="directory-stats">
                <div className="directory-stat-card">
                    <div className="stat-icon-wrapper blue">
                        <User size={22} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Total Contacts</span>
                        <h2 className="stat-value">{stats.count}</h2>
                        <span className="stat-sub">{buyersList.length} total marketing profiles</span>
                    </div>
                </div>

                <div className="directory-stat-card">
                    <div className="stat-icon-wrapper green">
                        <DollarSign size={22} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Registered Customers</span>
                        <h2 className="stat-value">{stats.buyersCount}</h2>
                        <span className="stat-sub">Purchased race photos</span>
                    </div>
                </div>

                <div className="directory-stat-card">
                    <div className="stat-icon-wrapper orange">
                        <ShoppingBag size={22} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Leads (Subscribers)</span>
                        <h2 className="stat-value">{stats.leadsCount}</h2>
                        <span className="stat-sub">Alert notification requests</span>
                    </div>
                </div>

                <div className="directory-stat-card">
                    <div className="stat-icon-wrapper purple">
                        <DollarSign size={22} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Total Spent Volume</span>
                        <h2 className="stat-value">${stats.totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
                        <span className="stat-sub">From filtered purchases</span>
                    </div>
                </div>
            </div>

            {/* Filter and Command Hub */}
            <div className="directory-controls-section">
                <div className="controls-grid">
                    {/* Live Search */}
                    <div className="control-item search-bar-wrapper">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search by buyer name, email, phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>

                    {/* Filter Contact Type */}
                    <div className="control-item filter-group">
                        <User size={16} className="filter-icon" />
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All Contact Types</option>
                            <option value="buyers">Registered Buyers</option>
                            <option value="leads">Leads (Pre-Subscribers)</option>
                        </select>
                    </div>

                    {/* Filter Country */}
                    <div className="control-item filter-group">
                        <Globe size={16} className="filter-icon" />
                        <select
                            value={countryFilter}
                            onChange={(e) => setCountryFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All Locations ("From Where")</option>
                            {filterOptions.countries.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {/* Filter Photographer */}
                    <div className="control-item filter-group">
                        <User size={16} className="filter-icon" />
                        <select
                            value={photographerFilter}
                            onChange={(e) => setPhotographerFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All Photographers</option>
                            {filterOptions.photographers.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Filter Album */}
                    <div className="control-item filter-group">
                        <ShoppingBag size={16} className="filter-icon" />
                        <select
                            value={albumFilter}
                            onChange={(e) => setAlbumFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All Albums</option>
                            {filterOptions.albums.map(a => (
                                <option key={a.id} value={a.id}>{a.title}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Sub-Filters: Date, Status, Method */}
                <div className="sub-controls-row">
                    <div className="sub-filters-group">
                        {/* Filter Date */}
                        <div className="filter-badge-select">
                            <Calendar size={14} />
                            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                                <option value="all">All-Time Purchases</option>
                                <option value="today">Purchased Today</option>
                                <option value="7">Last 7 Days</option>
                                <option value="30">Last 30 Days</option>
                            </select>
                        </div>

                        {/* Filter Status */}
                        <div className="filter-badge-select">
                            <ShieldCheck size={14} />
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                <option value="all">All Statuses</option>
                                <option value="paid">Paid & Approved</option>
                                <option value="manual_pending">Virement En Attente</option>
                            </select>
                        </div>

                        {/* Filter Method */}
                        <div className="filter-badge-select">
                            <DollarSign size={14} />
                            <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
                                <option value="all">All Methods</option>
                                <option value="stripe">Stripe Credit Card</option>
                                <option value="bank_transfer">Virement Bancaire</option>
                                <option value="free">Free album</option>
                            </select>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="controls-actions">
                        <Button 
                            variant="outline" 
                            onClick={handleExportCSV}
                            className="export-btn"
                            disabled={filteredBuyers.length === 0}
                        >
                            <Download size={16} /> Export to CSV
                        </Button>
                        <Button 
                            variant="primary" 
                            onClick={() => setIsAddModalOpen(true)}
                            className="add-buyer-btn"
                        >
                            <Plus size={16} /> Add Buyer Profile
                        </Button>
                    </div>
                </div>
            </div>

            {/* Buyers Directory Data Table */}
            <div className="directory-table-wrapper card">
                {loading ? (
                    <div className="table-loader-state">
                        <Loader className="spinner" size={32} />
                        <p>Compiling buyers transaction database...</p>
                    </div>
                ) : filteredBuyers.length === 0 ? (
                    <div className="table-empty-state">
                        <User size={48} className="empty-icon" />
                        <h3>No Buyers Found</h3>
                        <p>No buyers matched your filters and search queries. Try adjusting your parameters.</p>
                    </div>
                ) : (
                    <table className="directory-table">
                        <thead>
                            <tr>
                                <th>Buyer Details</th>
                                <th>Country</th>
                                <th>Type</th>
                                <th>Total Purchases</th>
                                <th>Total Spent</th>
                                <th>Last Order</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredBuyers.map(buyer => (
                                <tr key={buyer.email}>
                                    <td>
                                        <div className="buyer-info-cell">
                                            <div className="avatar-letter">
                                                {buyer.full_name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="buyer-meta">
                                                <span className="buyer-name">{buyer.full_name}</span>
                                                <span className="buyer-email">{buyer.email}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="location-cell">
                                            <Globe size={14} className="cell-icon" />
                                            <span>{buyer.country}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`badge ${buyer.is_lead ? 'lead' : (buyer.is_guest ? 'guest' : 'registered')}`}>
                                            {buyer.is_lead ? 'Lead (Subscriber)' : (buyer.is_guest ? 'Guest' : 'Registered Runner')}
                                        </span>
                                    </td>
                                    <td className="text-center font-bold">{buyer.is_lead ? '0' : buyer.transactions_count} orders</td>
                                    <td className="text-right font-bold price-amount">
                                        {formatPrice(buyer.total_spent, buyer.currency)}
                                    </td>
                                    <td className="text-muted font-medium">
                                        {buyer.is_lead 
                                            ? `Alert: ${new Date(buyer.created_at).toLocaleDateString()}` 
                                            : (buyer.last_purchase_date ? new Date(buyer.last_purchase_date).toLocaleDateString() : 'N/A')
                                        }
                                    </td>
                                    <td>
                                        <button 
                                            className="action-icon-btn" 
                                            onClick={() => handleViewDetails(buyer)}
                                            title="View Buyer Drawer Profile"
                                        >
                                            <Eye size={16} /> Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Slide-over Profile Drawer */}
            {isDrawerOpen && selectedBuyer && (
                <div className="drawer-overlay" onClick={() => setIsDrawerOpen(false)}>
                    <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
                        <div className="drawer-header">
                            <div className="drawer-title-group">
                                <div className="drawer-avatar">
                                    {selectedBuyer.full_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h2>{selectedBuyer.full_name}</h2>
                                    <span className="subtitle">Buyer Directory Profile Sheet</span>
                                </div>
                            </div>
                            <button className="close-drawer-btn" onClick={() => setIsDrawerOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="drawer-body custom-scrollbar">
                            {/* Contact Details Card */}
                            <div className="drawer-section card">
                                <div className="section-header">
                                    <h3>Buyer Contact Details</h3>
                                    {!selectedBuyer.is_guest && (
                                        <button 
                                            className={`edit-toggle-btn ${isEditing ? 'active' : ''}`}
                                            onClick={() => setIsEditing(!isEditing)}
                                        >
                                            <Edit size={14} /> {isEditing ? 'Cancel Edit' : 'Edit Details'}
                                        </button>
                                    )}
                                </div>

                                {isEditing ? (
                                    <div className="edit-details-form">
                                        <div className="form-group">
                                            <label>Runner Full Name</label>
                                            <input
                                                type="text"
                                                value={editForm.full_name}
                                                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Phone Number / WhatsApp</label>
                                            <input
                                                type="text"
                                                value={editForm.phone}
                                                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                                placeholder="e.g. +212612345678"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Country Location</label>
                                            <input
                                                type="text"
                                                value={editForm.country}
                                                onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                                                placeholder="e.g. Morocco, France"
                                            />
                                        </div>
                                        <Button 
                                            variant="primary" 
                                            onClick={handleSaveProfile}
                                            disabled={savingProfile}
                                            className="save-profile-btn"
                                        >
                                            {savingProfile ? 'Saving...' : 'Save Profile Changes'}
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="details-info-grid">
                                        <div className="info-item">
                                            <Mail size={16} className="info-icon" />
                                            <div>
                                                <label>Email Address</label>
                                                <a href={`mailto:${selectedBuyer.email}`} className="info-value email">{selectedBuyer.email}</a>
                                            </div>
                                        </div>
                                        <div className="info-item">
                                            <Phone size={16} className="info-icon" />
                                            <div>
                                                <label>Phone / WhatsApp</label>
                                                <span className="info-value">{selectedBuyer.phone}</span>
                                            </div>
                                        </div>
                                        <div className="info-item">
                                            <Globe size={16} className="info-icon" />
                                            <div>
                                                <label>Country location</label>
                                                <span className="info-value">{selectedBuyer.country}</span>
                                            </div>
                                        </div>
                                        <div className="info-item">
                                            <Calendar size={16} className="info-icon" />
                                            <div>
                                                <label>First Seen Date</label>
                                                <span className="info-value">{new Date(selectedBuyer.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Summary Totals */}
                            <div className="drawer-section card spending-totals-row">
                                <div className="total-stat-box">
                                    <span className="label">Total Spent Volume</span>
                                    <h3 className="value text-green font-bold">
                                        {formatPrice(selectedBuyer.total_spent, selectedBuyer.currency)}
                                    </h3>
                                </div>
                                <div className="total-stat-box">
                                    <span className="label">Commission Contributed</span>
                                    <h3 className="value text-blue font-bold">
                                        {formatPrice(selectedBuyer.total_commission, selectedBuyer.currency)}
                                    </h3>
                                </div>
                                <div className="total-stat-box">
                                    <span className="label">Total Photos Unlocked</span>
                                    <h3 className="value text-purple font-bold">{selectedBuyer.unlocked_photos_count} photos</h3>
                                </div>
                            </div>

                            {/* Chronological Purchases Table */}
                            <div className="drawer-section card">
                                <div className="section-header">
                                    <h3>Chronological Purchase History</h3>
                                    {selectedBuyer.purchases && selectedBuyer.purchases.length > 0 && (
                                        <button 
                                            onClick={() => handleExportIndividualCSV(selectedBuyer)}
                                            className="export-single-btn"
                                        >
                                            <Download size={14} /> Export History
                                        </button>
                                    )}
                                </div>

                                {selectedBuyer.purchases && selectedBuyer.purchases.length > 0 ? (
                                    <div className="drawer-transactions-list">
                                        {selectedBuyer.purchases.map(tx => (
                                            <div key={tx.id} className="transaction-history-row" onClick={() => {
                                                if (tx.unlocked_photo_ids && tx.unlocked_photo_ids.length > 0) {
                                                    fetchPhotoPreviews(tx.unlocked_photo_ids);
                                                }
                                            }}>
                                                <div className="tx-meta-info">
                                                    <div className="tx-order-nr">Order: {tx.order_number || 'N/A'}</div>
                                                    <div className="tx-date-txt">{new Date(tx.created_at).toLocaleDateString()} at {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                    <div className="tx-product-title">
                                                        Album: <strong className="text-slate font-semibold">{tx.album?.title || 'Deleted Album'}</strong>
                                                    </div>
                                                    {tx.album?.photographer && (
                                                        <div className="tx-photog-tag">
                                                            Sold by: <span>{tx.album.photographer.full_name}</span>
                                                        </div>
                                                    )}
                                                    <div className="tx-unlocked-badge">
                                                        🔓 {tx.unlocked_photo_ids?.length || 0} Photos Unlocked
                                                    </div>
                                                </div>
                                                <div className="tx-financials">
                                                    <span className={`status-tag ${tx.status}`}>
                                                        {tx.status === 'paid' ? 'Paid' : 'Pending transfer'}
                                                    </span>
                                                    <div className="amount-paid">{formatPrice(tx.amount, tx.currency)}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="no-photos-alert text-muted text-center py-4">
                                        This contact is a Lead and hasn't purchased any photos yet.
                                    </p>
                                )}
                            </div>

                            {/* Pre-Subscriptions Alerts Section */}
                            {selectedBuyer.pre_inscriptions && selectedBuyer.pre_inscriptions.length > 0 && (
                                <div className="drawer-section card">
                                    <div className="section-header">
                                        <h3>Pre-Subscription Alerts ({selectedBuyer.pre_inscriptions.length})</h3>
                                    </div>
                                    <div className="drawer-transactions-list">
                                        {selectedBuyer.pre_inscriptions.map(pre => (
                                            <div key={pre.id} className="transaction-history-row" style={{ cursor: 'default' }}>
                                                <div className="tx-meta-info">
                                                    <div className="tx-date-txt">Subscribed on {new Date(pre.created_at).toLocaleDateString()} at {new Date(pre.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                    <div className="tx-product-title">
                                                        Album: <strong className="text-slate font-semibold">{pre.album?.title || 'Upcoming Album'}</strong>
                                                    </div>
                                                    {pre.album?.photographer && (
                                                        <div className="tx-photog-tag">
                                                            Covered by: <span>{pre.album.photographer.full_name}</span>
                                                        </div>
                                                    )}
                                                    {pre.phone && pre.phone !== 'N/A' && (
                                                        <div className="tx-photog-tag">
                                                            Alert Phone: <span>{pre.phone}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="tx-financials">
                                                    <span className="status-tag paid" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                                                        Active Alert
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Photo Unlocked Previews Section */}
                            <div className="drawer-section card">
                                <h3>Purchased Photo Previews</h3>
                                {loadingPhotos ? (
                                    <div className="drawer-photos-loader">
                                        <Loader className="spinner" size={20} />
                                        <span>Fetching high-res preview library...</span>
                                    </div>
                                ) : photoDetails.length === 0 ? (
                                    <p className="no-photos-alert text-muted text-center py-4">
                                        Select a purchase row above to view its unlocked photo assets.
                                    </p>
                                ) : (
                                    <div className="drawer-photos-preview-grid">
                                        {photoDetails.map(photo => (
                                            <div key={photo.id} className="preview-photo-thumbnail group" onClick={() => setSelectedPhoto(photo)}>
                                                <img src={photo.watermarked_url} alt={photo.title || 'unlocked_photo'} />
                                                <div className="hover-overlay">
                                                    <Eye size={18} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Individual Photo Lightbox Modal */}
            {selectedPhoto && (
                <Modal isOpen={!!selectedPhoto} onClose={() => setSelectedPhoto(null)}>
                    <div className="lightbox-photo-content">
                        <h3>{selectedPhoto.title || 'Unlocked Asset File'}</h3>
                        <div className="lightbox-img-wrapper">
                            <img src={selectedPhoto.watermarked_url} alt="high_res_unlocked_preview" />
                            <div className="watermark-overlay">ADMIN CONSOLE SECURE PREVIEW</div>
                        </div>
                        <div className="lightbox-footer-actions">
                            <a 
                                href={selectedPhoto.original_url || selectedPhoto.watermarked_url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="external-source-link"
                            >
                                <ExternalLink size={14} /> Open Original S3 File in New Tab
                            </a>
                            <Button variant="outline" onClick={() => setSelectedPhoto(null)}>Close Lightbox</Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Add Buyer Modal */}
            {isAddModalOpen && (
                <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)}>
                    <form onSubmit={handleAddBuyer} className="add-buyer-modal-form">
                        <div className="modal-form-header">
                            <h2>Manually Add Runner Buyer Profile</h2>
                            <p>Registers a new auth credentials record and syncs their profile sheet.</p>
                        </div>

                        <div className="form-inputs-grid">
                            <div className="form-group">
                                <label>Runner Full Name *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Jane Doe"
                                    value={addForm.fullName}
                                    onChange={(e) => setAddForm({ ...addForm, fullName: e.target.value })}
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Email Address *</label>
                                <input
                                    type="email"
                                    required
                                    placeholder="jane.doe@example.com"
                                    value={addForm.email}
                                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label>Password (for credentials) *</label>
                                <input
                                    type="password"
                                    required
                                    placeholder="•••••••• (Min 6 chars)"
                                    value={addForm.password}
                                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label>Phone / WhatsApp</label>
                                <input
                                    type="text"
                                    placeholder="e.g. +212612345678"
                                    value={addForm.phone}
                                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                                />
                            </div>

                            <div className="form-group full-width">
                                <label>Country Location</label>
                                <input
                                    type="text"
                                    placeholder="Morocco, France, USA..."
                                    value={addForm.country}
                                    onChange={(e) => setAddForm({ ...addForm, country: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="modal-form-footer">
                            <Button variant="outline" type="button" onClick={() => setIsAddModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button variant="primary" type="submit" disabled={addingBuyer}>
                                {addingBuyer ? 'Registering...' : 'Register Buyer'}
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Scoped CSS Injector */}
            <style>{`
                .directory-container {
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                    width: 100%;
                    font-family: 'Inter', sans-serif;
                }

                /* Stats grid styling */
                .directory-stats {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                    gap: 1.5rem;
                }

                .directory-stat-card {
                    background: white;
                    border: 1px solid var(--border-light, #e2e8f0);
                    border-radius: 16px;
                    padding: 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 1.25rem;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
                    transition: transform 0.2s, box-shadow 0.2s;
                }

                .directory-stat-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.04);
                }

                .stat-icon-wrapper {
                    padding: 0.75rem;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .stat-icon-wrapper.blue { background: #eff6ff; color: #3b82f6; }
                .stat-icon-wrapper.green { background: #ecfdf5; color: #10b981; }
                .stat-icon-wrapper.orange { background: #fff7ed; color: #f97316; }
                .stat-icon-wrapper.purple { background: #faf5ff; color: #a855f7; }

                .stat-content {
                    display: flex;
                    flex-direction: column;
                }

                .stat-label {
                    font-size: 0.75rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    color: #94a3b8;
                    letter-spacing: 0.05em;
                }

                .stat-value {
                    font-size: 1.35rem;
                    font-weight: 800;
                    color: #1e293b;
                    margin: 0.25rem 0;
                }

                .stat-sub {
                    font-size: 0.7rem;
                    color: #64748b;
                    font-weight: 500;
                }

                /* Controls Hub Styling */
                .directory-controls-section {
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 16px;
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                }

                .controls-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1rem;
                    width: 100%;
                }

                .control-item {
                    display: flex;
                    align-items: center;
                    border: 1px solid #cbd5e1;
                    border-radius: 10px;
                    background: #f8fafc;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }

                .control-item:focus-within {
                    border-color: #2563eb;
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
                    background: white;
                }

                .search-bar-wrapper {
                    grid-column: span 1;
                }

                @media (min-width: 1024px) {
                    .search-bar-wrapper {
                        grid-column: span 2;
                    }
                }

                .search-icon {
                    color: #94a3b8;
                    margin-left: 1rem;
                }

                .search-input {
                    border: none;
                    background: transparent;
                    width: 100%;
                    padding: 0.75rem;
                    font-size: 0.9rem;
                    outline: none;
                    color: #1e293b;
                }

                .filter-group {
                    padding-left: 0.75rem;
                }

                .filter-icon {
                    color: #94a3b8;
                }

                .filter-select {
                    border: none;
                    background: transparent;
                    width: 100%;
                    padding: 0.75rem 0.5rem;
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: #475569;
                    outline: none;
                    cursor: pointer;
                }

                .sub-controls-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 1rem;
                    padding-top: 1rem;
                    border-top: 1px solid #e2e8f0;
                }

                .sub-filters-group {
                    display: flex;
                    gap: 0.75rem;
                    flex-wrap: wrap;
                }

                .filter-badge-select {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: #f1f5f9;
                    border: 1px solid #e2e8f0;
                    padding: 0.35rem 0.75rem;
                    border-radius: 99px;
                    color: #475569;
                    font-size: 0.8rem;
                }

                .filter-badge-select select {
                    border: none;
                    background: transparent;
                    outline: none;
                    font-size: 0.8rem;
                    font-weight: 700;
                    color: #1e293b;
                    cursor: pointer;
                    padding-right: 0.5rem;
                }

                .controls-actions {
                    display: flex;
                    gap: 0.75rem;
                }

                .export-btn, .add-buyer-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-weight: 700 !important;
                    font-size: 0.85rem !important;
                    padding: 0.65rem 1rem !important;
                }

                /* Table layouts */
                .directory-table-wrapper {
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
                }

                .table-loader-state, .table-empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 4rem 2rem;
                    text-align: center;
                    gap: 1rem;
                }

                .table-loader-state p {
                    color: #64748b;
                    font-weight: 500;
                }

                .empty-icon {
                    color: #cbd5e1;
                }

                .table-empty-state h3 {
                    font-size: 1.15rem;
                    font-weight: 700;
                    color: #1e293b;
                    margin: 0;
                }

                .table-empty-state p {
                    font-size: 0.875rem;
                    color: #64748b;
                    max-width: 320px;
                    margin: 0;
                }

                .directory-table {
                    width: 100%;
                    border-collapse: collapse;
                    text-align: left;
                    font-size: 0.85rem;
                }

                .directory-table th {
                    background: #f8fafc;
                    padding: 1rem 1.25rem;
                    font-weight: 700;
                    color: #475569;
                    text-transform: uppercase;
                    font-size: 0.7rem;
                    letter-spacing: 0.05em;
                    border-bottom: 1px solid #e2e8f0;
                }

                .directory-table td {
                    padding: 1rem 1.25rem;
                    border-bottom: 1px solid #f1f5f9;
                    color: #334155;
                    vertical-align: middle;
                }

                .directory-table tr:hover td {
                    background: #f8fafc;
                }

                .buyer-info-cell {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .avatar-letter {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    background: #f1f5f9;
                    color: #475569;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 800;
                    font-size: 0.95rem;
                    border: 1px solid #e2e8f0;
                }

                .buyer-meta {
                    display: flex;
                    flex-direction: column;
                }

                .buyer-name {
                    font-weight: 700;
                    color: #1e293b;
                    font-size: 0.9rem;
                }

                .buyer-email {
                    color: #64748b;
                    font-size: 0.75rem;
                }

                .location-cell {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-weight: 600;
                    color: #334155;
                }

                .cell-icon {
                    color: #94a3b8;
                }

                .badge {
                    display: inline-block;
                    font-size: 0.7rem;
                    font-weight: 700;
                    padding: 0.2rem 0.6rem;
                    border-radius: 99px;
                    text-align: center;
                }

                .badge.guest { background: #fef3c7; color: #d97706; }
                .badge.registered { background: #dbeafe; color: #1d4ed8; }
                .badge.lead { background: #e0f2fe; color: #0369a1; }

                .price-amount {
                    font-family: monospace;
                    font-size: 0.9rem;
                    color: #059669;
                }

                .action-icon-btn {
                    background: #f1f5f9;
                    border: 1px solid #cbd5e1;
                    padding: 0.4rem 0.75rem;
                    border-radius: 8px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #475569;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.35rem;
                    transition: all 0.2s;
                }

                .action-icon-btn:hover {
                    background: #3b82f6;
                    border-color: #3b82f6;
                    color: white;
                }

                /* Drawer side slide panel styles */
                .drawer-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.4);
                    backdrop-filter: blur(4px);
                    z-index: 9999;
                    display: flex;
                    justify-content: flex-end;
                    animation: fadeIn 0.25s ease-out;
                }

                .drawer-container {
                    background: #f8fafc;
                    width: 100%;
                    max-width: 580px;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    box-shadow: -10px 0 25px -5px rgba(0,0,0,0.1);
                    animation: slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }

                @keyframes slideLeft {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }

                .drawer-header {
                    background: white;
                    padding: 1.5rem;
                    border-bottom: 1px solid #e2e8f0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .drawer-title-group {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .drawer-avatar {
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    background: #3b82f6;
                    color: white;
                    font-size: 1.25rem;
                    font-weight: 800;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .drawer-header h2 {
                    font-size: 1.15rem;
                    font-weight: 800;
                    color: #1e293b;
                    margin: 0;
                }

                .drawer-header .subtitle {
                    font-size: 0.75rem;
                    color: #64748b;
                }

                .close-drawer-btn {
                    background: none;
                    border: none;
                    color: #64748b;
                    cursor: pointer;
                    padding: 0.5rem;
                    border-radius: 50%;
                    display: flex;
                    transition: background 0.2s;
                }

                .close-drawer-btn:hover {
                    background: #f1f5f9;
                    color: #1e293b;
                }

                .drawer-body {
                    padding: 1.5rem;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                    flex: 1;
                }

                .drawer-section {
                    padding: 1.25rem;
                    background: white;
                }

                .drawer-section h3 {
                    font-size: 0.95rem;
                    font-weight: 700;
                    color: #1e293b;
                    margin: 0 0 1rem 0;
                }

                .drawer-section .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                }

                .drawer-section .section-header h3 {
                    margin: 0;
                }

                .edit-toggle-btn {
                    background: #eff6ff;
                    border: 1px solid #bfdbfe;
                    color: #1d4ed8;
                    font-weight: 700;
                    font-size: 0.75rem;
                    padding: 0.35rem 0.75rem;
                    border-radius: 8px;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.25rem;
                    transition: all 0.2s;
                }

                .edit-toggle-btn.active {
                    background: #fef2f2;
                    border-color: #fca5a5;
                    color: #b91c1c;
                }

                .details-info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1.25rem 1rem;
                }

                .info-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.75rem;
                }

                .info-icon {
                    color: #94a3b8;
                    margin-top: 0.15rem;
                }

                .info-item label {
                    display: block;
                    font-size: 0.65rem;
                    font-weight: 700;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .info-value {
                    font-size: 0.85rem;
                    font-weight: 700;
                    color: #334155;
                }

                .info-value.email {
                    color: #2563eb;
                    text-decoration: none;
                }

                .info-value.email:hover {
                    text-decoration: underline;
                }

                /* Profile Edit forms */
                .edit-details-form {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.35rem;
                }

                .form-group label {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #475569;
                }

                .form-group input {
                    padding: 0.65rem;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    font-size: 0.85rem;
                    outline: none;
                    background: #f8fafc;
                }

                .form-group input:focus {
                    border-color: #2563eb;
                    background: white;
                }

                .save-profile-btn {
                    margin-top: 0.5rem;
                    width: 100%;
                    padding: 0.75rem !important;
                    font-weight: 700 !important;
                }

                .spending-totals-row {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 1rem;
                    text-align: center;
                }

                .total-stat-box {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }

                .total-stat-box .label {
                    font-size: 0.65rem;
                    font-weight: 700;
                    color: #94a3b8;
                    text-transform: uppercase;
                }

                .total-stat-box .value {
                    font-size: 1.1rem;
                    margin: 0;
                }

                .export-single-btn {
                    background: none;
                    border: none;
                    color: #2563eb;
                    font-weight: 700;
                    font-size: 0.75rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                }

                .export-single-btn:hover {
                    text-decoration: underline;
                }

                .drawer-transactions-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                    max-height: 350px;
                    overflow-y: auto;
                    padding-right: 0.25rem;
                }

                .transaction-history-row {
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    padding: 0.85rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    cursor: pointer;
                    transition: border-color 0.2s, background 0.2s;
                }

                .transaction-history-row:hover {
                    border-color: #3b82f6;
                    background: #f8fafc;
                }

                .tx-meta-info {
                    display: flex;
                    flex-direction: column;
                    gap: 0.2rem;
                }

                .tx-order-nr {
                    font-size: 0.75rem;
                    font-weight: 800;
                    font-family: monospace;
                    color: #475569;
                }

                .tx-date-txt {
                    font-size: 0.7rem;
                    color: #94a3b8;
                    font-weight: 500;
                }

                .tx-product-title {
                    font-size: 0.8rem;
                    color: #334155;
                    margin-top: 0.25rem;
                }

                .tx-photog-tag {
                    font-size: 0.75rem;
                    color: #64748b;
                }

                .tx-photog-tag span {
                    font-weight: 700;
                }

                .tx-unlocked-badge {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #7c3aed;
                    margin-top: 0.2rem;
                }

                .tx-financials {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    gap: 0.35rem;
                }

                .status-tag {
                    font-size: 0.65rem;
                    font-weight: 700;
                    padding: 0.15rem 0.4rem;
                    border-radius: 4px;
                    text-transform: uppercase;
                }

                .status-tag.paid { background: #d1fae5; color: #065f46; }
                .status-tag.manual_pending { background: #ffedd5; color: #9a3412; }

                .amount-paid {
                    font-weight: 800;
                    font-family: monospace;
                    font-size: 0.95rem;
                    color: #1e293b;
                }

                .drawer-photos-loader {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    padding: 2rem 0;
                    color: #64748b;
                    font-size: 0.85rem;
                    font-weight: 500;
                }

                .drawer-photos-preview-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 0.75rem;
                }

                .preview-photo-thumbnail {
                    position: relative;
                    aspect-ratio: 4/3;
                    border-radius: 8px;
                    overflow: hidden;
                    border: 1px solid #e2e8f0;
                    cursor: pointer;
                }

                .preview-photo-thumbnail img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .preview-photo-thumbnail .hover-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.6);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: opacity 0.2s;
                }

                .preview-photo-thumbnail:hover .hover-overlay {
                    opacity: 1;
                }

                /* Lightbox contents */
                .lightbox-photo-content {
                    padding: 1rem;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                }

                .lightbox-photo-content h3 {
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: #1e293b;
                    margin: 0;
                }

                .lightbox-img-wrapper {
                    position: relative;
                    max-width: 100%;
                    max-height: 60vh;
                    border-radius: 12px;
                    overflow: hidden;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
                    background: #0f172a;
                }

                .lightbox-img-wrapper img {
                    max-width: 100%;
                    max-height: 60vh;
                    display: block;
                    margin: 0 auto;
                    object-fit: contain;
                }

                .lightbox-img-wrapper .watermark-overlay {
                    position: absolute;
                    bottom: 1rem;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(15, 23, 42, 0.7);
                    color: rgba(255,255,255,0.7);
                    font-size: 0.65rem;
                    font-weight: 700;
                    padding: 0.35rem 0.75rem;
                    border-radius: 6px;
                    letter-spacing: 0.05em;
                }

                .lightbox-footer-actions {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 1rem;
                }

                .external-source-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.35rem;
                    font-size: 0.8rem;
                    font-weight: 700;
                    color: #2563eb;
                    text-decoration: none;
                }

                .external-source-link:hover {
                    text-decoration: underline;
                }

                /* Add Buyer Modal Styling */
                .add-buyer-modal-form {
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                .modal-form-header h2 {
                    font-size: 1.15rem;
                    font-weight: 800;
                    color: #1e293b;
                    margin: 0 0 0.25rem 0;
                }

                .modal-form-header p {
                    font-size: 0.8rem;
                    color: #64748b;
                    margin: 0;
                }

                .form-inputs-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                }

                .form-inputs-grid .full-width {
                    grid-column: span 2;
                }

                .modal-form-footer {
                    display: flex;
                    justify-content: flex-end;
                    gap: 0.75rem;
                    padding-top: 1rem;
                    border-top: 1px solid #e2e8f0;
                }

                /* Scrollbar cleanups */
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 99px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
            `}</style>
        </div>
    );
}
