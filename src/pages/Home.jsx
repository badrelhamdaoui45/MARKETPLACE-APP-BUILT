import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { Search, Camera, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';

const Home = () => {
    const [recentAlbums, setRecentAlbums] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const [currentSportIndex, setCurrentSportIndex] = useState(0);
    const heroData = [
        { text: "your trail running", image: "/hero_trail_running.png" },
        { text: "your equestrian", image: "/hero_equestrian.png" },
        { text: "your rugby", image: "/hero_rugby.png" },
        { text: "your triathlon", image: "/hero_triathlon.png" },
        { text: "your football", image: "/hero_football.png" },
        { text: "your rally", image: "/hero_rally.png" }
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSportIndex((prev) => (prev + 1) % heroData.length);
        }, 3500); // Slightly slower for better readability
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        fetchRecentAlbums();
    }, []);

    const fetchRecentAlbums = async () => {
        try {
            const { data, error } = await supabase
                .from('albums')
                .select(`
                    *,
                    profiles:photographer_id(full_name)
                `)
                .eq('is_published', true)
                .order('created_at', { ascending: false })
                .limit(8);

            if (error) throw error;
            setRecentAlbums(data || []);
        } catch (error) {
            console.error('Error fetching recent albums:', error);
        } finally {
            setLoading(false);
        }
    };

    const scrollCarousel = (direction) => {
        const carousel = document.getElementById('albums-carousel');
        if (carousel) {
            const scrollAmount = 320;
            carousel.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div className="home-container">
            <div className="home-content">
                {/* Hero Section */}
                <div className="hero-section">
                    <div className="hero-text">
                        <h1 className="hero-headline">
                            REVOLUTIONIZE <br />
                            <span className="animated-sport">
                                {heroData[currentSportIndex].text.toUpperCase()}
                            </span> <br />
                            PHOTO MANAGEMENT
                        </h1>
                        <p className="hero-subtext">
                            Manage, share, and monetize your event and sports club photo albums with our online application
                        </p>
                        <p className="hero-ai-hint">
                            <strong>Our AI-based technology and automatic image analysis</strong> simplify the management of your sports photos.
                        </p>
                        <div className="hero-actions">
                            <Button variant="outline" className="hero-btn-contact" onClick={() => navigate('/contact')}>
                                Contact Us
                            </Button>
                            <Button className="hero-btn-try action-btn" onClick={() => navigate('/onboarding')}>
                                Try Run Capture
                            </Button>
                        </div>
                    </div>
                    <div className="hero-image-container">
                        <div className="bg-box-orange"></div>
                        <div className="bg-box-blue"></div>
                        <div className="hero-images-stack">
                            {heroData.map((item, idx) => (
                                <img
                                    key={idx}
                                    src={item.image}
                                    alt={`Professional ${item.text} photography management`}
                                    className={`hero-main-img ${idx === currentSportIndex ? 'active' : ''}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="home-grid">
                    {/* Buyer Section */}
                    <div className="home-card buyer-card">
                        <div className="home-card-icon">
                            <Search size={80} strokeWidth={1} />
                        </div>
                        <p className="home-card-text">
                            You participated in an event and want to find your sports photos online.
                        </p>
                        <Link to="/albums" className="home-card-link">
                            <Button className="home-btn buyer-btn">
                                I'M LOOKING FOR MY PHOTOS
                            </Button>
                        </Link>
                    </div>

                    {/* Photographer Section */}
                    <div className="home-card photographer-card">
                        <div className="home-card-icon">
                            <Camera size={80} strokeWidth={1} />
                        </div>
                        <p className="home-card-text">
                            You are a photographer, event, or club and want to host and identify your sports photos online.
                        </p>
                        <Link to="/login" className="home-card-link">
                            <Button variant="primary" className="home-btn photographer-btn">
                                I AM A PHOTOGRAPHER / ORGANIZER
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Comparison Table Section */}
                <div style={{ marginTop: '6rem', marginBottom: '6rem' }}>
                    <div className="section-header">
                        <h2 className="section-title">Why Choose Run Capture?</h2>
                        <p className="section-subtitle">See how we stack up against the competition</p>
                    </div>

                    <div className="comparison-table-container">
                        <div className="comparison-header-row">
                            <div className="col-feature">Feature</div>
                            <div className="col-us">
                                <div className="brand-badge">RUN CAPTURE</div>
                            </div>
                            <div className="col-others">Other Platforms</div>
                        </div>

                        {[
                            { feature: "Starting Cost", us: "Free", others: "Monthly Fees" },
                            { feature: "AI Bib Detection", us: "Included (Unlimited)", others: "Paid Add-on / None" },
                            { feature: "Payout Speed", us: "Instant (Stripe)", others: "Monthly / Net-30" },
                            { feature: "Commission", us: "Fair (15%)", others: "High (20-30%)" },
                            { feature: "Watermark", us: "Fully Customizable", others: "Fixed / Generic" },
                            { feature: "Setup Time", us: "Instant", others: "Manual Approval" },
                        ].map((row, idx) => (
                            <div key={idx} className={`comparison-row ${idx % 2 === 0 ? 'bg-stripe' : ''}`}>
                                <div className="col-feature">{row.feature}</div>
                                <div className="col-us">
                                    <span className="check-icon">✓</span> {row.us}
                                </div>
                                <div className="col-others">
                                    <span className="cross-icon">✕</span> {row.others}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <style>{`
                    .comparison-table-container {
                        max-width: 900px;
                        margin: 0 auto;
                        background: white;
                        border-radius: 16px;
                        box-shadow: 0 10px 40px rgba(0,0,0,0.08);
                        overflow: hidden;
                        border: 1px solid var(--border-subtle);
                    }

                    .comparison-header-row {
                        display: grid;
                        grid-template-columns: 1.5fr 1.5fr 1.5fr;
                        background: #f8fafc;
                        padding: 1.5rem;
                        border-bottom: 2px solid #e2e8f0;
                        font-weight: 800;
                        color: var(--text-primary);
                    }

                    .col-feature { 
                        display: flex; 
                        align-items: center; 
                        color: var(--text-secondary);
                        font-weight: 600;
                    }

                    .col-us { 
                        display: flex; 
                        align-items: center; 
                        justify-content: center; 
                        font-weight: 800;
                        color: var(--text-primary);
                        position: relative;
                        background: rgba(255, 255, 255, 0.5);
                    }

                    .col-others { 
                        display: flex; 
                        align-items: center; 
                        justify-content: center; 
                        color: var(--text-tertiary);
                        font-weight: 500;
                    }

                    .brand-badge {
                        background: var(--primary-blue);
                        color: white;
                        padding: 0.5rem 1rem;
                        border-radius: 50px;
                        font-size: 0.9rem;
                        letter-spacing: 0.05em;
                        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
                    }

                    .comparison-row {
                        display: grid;
                        grid-template-columns: 1.5fr 1.5fr 1.5fr;
                        padding: 1.25rem 1.5rem;
                        border-bottom: 1px solid #f1f5f9;
                        transition: background 0.2s;
                    }

                    .comparison-row:last-child {
                        border-bottom: none;
                    }

                    .comparison-row:hover {
                        background: #f8fafc !important;
                    }

                    .bg-stripe {
                        background: #fff;
                    }

                    .check-icon {
                        color: #10b981;
                        font-weight: 900;
                        margin-right: 0.5rem;
                        font-size: 1.1rem;
                    }

                    .cross-icon {
                        color: #ef4444;
                        font-weight: 900;
                        margin-right: 0.5rem;
                        font-size: 1.1rem;
                    }

                    /* Highlight the middle column */
                    .comparison-row .col-us {
                        color: var(--primary-blue);
                        font-weight: 700;
                        background: #eff6ff;
                        margin: -1.25rem 0;
                        padding: 1.25rem 0;
                        border-left: 1px solid #dbeafe;
                        border-right: 1px solid #dbeafe;
                    }
                    
                    /* Header middle column highlight */
                    .comparison-header-row .col-us {
                        background: transparent;
                    }

                    @media (max-width: 768px) {
                        .comparison-table-container {
                            border-radius: 12px;
                            font-size: 0.9rem;
                        }
                        
                        .comparison-header-row, .comparison-row {
                            padding: 1rem;
                            grid-template-columns: 1fr 1fr 1fr;
                            gap: 0.5rem;
                        }

                        .col-feature {
                            font-size: 0.85rem;
                        }

                        .brand-badge {
                            padding: 0.25rem 0.75rem;
                            font-size: 0.7rem;
                        }
                    }

                    @media (max-width: 480px) {
                        .comparison-table-container {
                            font-size: 0.8rem;
                        }
                        
                        .comparison-header-row, .comparison-row {
                            padding: 0.75rem 0.5rem;
                        }
                        
                        .col-feature {
                            font-weight: 700;
                            justify-content: center;
                            text-align: center;
                        }
                    }
                `}</style>

                {/* Recent Albums Carousel */}
                {!loading && recentAlbums.length > 0 && (
                    <div className="recent-albums-section">
                        <div className="section-header">
                            <h2 className="section-title">Recent Albums</h2>
                            <p className="section-subtitle">Discover the latest photo collections</p>
                        </div>

                        <div className="carousel-container">
                            <button
                                className="carousel-nav carousel-nav-left"
                                onClick={() => scrollCarousel('left')}
                                aria-label="Scroll left"
                            >
                                <ChevronLeft size={24} />
                            </button>

                            <div className="albums-carousel" id="albums-carousel">
                                {recentAlbums.map((album) => (
                                    <div
                                        key={album.id}
                                        className="album-card"
                                        onClick={() => {
                                            const photogName = album.profiles?.full_name || 'unknown';
                                            navigate(`/albums/${encodeURIComponent(photogName)}/${encodeURIComponent(album.title)}`);
                                        }}
                                    >
                                        <div className="album-cover">
                                            {album.cover_image_url ? (
                                                <img src={album.cover_image_url} alt={album.title} />
                                            ) : (
                                                <div className="album-placeholder">
                                                    <ImageIcon size={40} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="album-info">
                                            <h3 className="album-title">{album.title}</h3>
                                            <p className="album-photographer">
                                                by <Link
                                                    to={`/photographer/${encodeURIComponent(album.profiles?.full_name)}`}
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{ color: 'inherit', textDecoration: 'none' }}
                                                    onMouseOver={(e) => e.target.style.color = 'var(--primary-blue)'}
                                                    onMouseOut={(e) => e.target.style.color = 'inherit'}
                                                >
                                                    {album.profiles?.full_name || 'Unknown'}
                                                </Link>
                                            </p>
                                            <p className="album-price">${album.price}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button
                                className="carousel-nav carousel-nav-right"
                                onClick={() => scrollCarousel('right')}
                                aria-label="Scroll right"
                            >
                                <ChevronRight size={24} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .home-container {
                    min-height: calc(100vh - 80px);
                    background: #ffffff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                }

                .home-content {
                    max-width: 1200px;
                    width: 100%;
                }

                .hero-section {
                    display: grid;
                    grid-template-columns: 1.2fr 1fr;
                    gap: 4rem;
                    align-items: center;
                    margin-bottom: 6rem;
                    padding: 2rem 0;
                }

                .hero-headline {
                    font-size: 3.5rem;
                    font-weight: 900;
                    line-height: 1;
                    color: #0f172a;
                    margin-bottom: 1.5rem;
                    letter-spacing: -0.02em;
                }

                .animated-sport {
                    color: #ff9f1c;
                    display: inline-block;
                    min-height: 1em;
                    animation: fadeScale 0.8s ease-out;
                }

                @keyframes fadeScale {
                    from { opacity: 0; transform: translateY(15px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .hero-subtext {
                    font-size: 1.25rem;
                    color: #475569;
                    margin-bottom: 1.5rem;
                    line-height: 1.6;
                    max-width: 500px;
                }

                .hero-ai-hint {
                    background: #f1f5f9;
                    padding: 1rem 1.5rem;
                    border-radius: 12px;
                    font-size: 0.95rem;
                    color: #334155;
                    margin-bottom: 2.5rem;
                    border-left: 4px solid var(--primary-blue);
                }

                .hero-actions {
                    display: flex;
                    gap: 1.5rem;
                }

                .hero-btn-contact {
                    border: 2px solid #0f172a !important;
                    color: #0f172a !important;
                    height: 56px;
                    min-width: 160px;
                }

                .hero-btn-try {
                    background: #0f172a !important;
                    color: white !important;
                    height: 56px;
                    min-width: 160px;
                }

                .hero-image-container {
                    position: relative;
                    padding: 2rem;
                    height: 500px; /* Fixed height for consistent layout */
                    display: flex;
                    align-items: center;
                    width: 100%;
                    max-width: 600px;
                    margin: 0 auto;
                }

                .hero-images-stack {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    z-index: 2;
                }

                .bg-box-orange {
                    position: absolute;
                    top: 0;
                    right: 0;
                    width: 70%;
                    height: 50%;
                    background: #ffb703;
                    border-radius: 20px;
                    z-index: 1;
                    opacity: 0.9;
                }

                .bg-box-blue {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    width: 40%;
                    height: 30%;
                    background: #a2d2ff;
                    border-radius: 12px;
                    z-index: 1;
                    opacity: 0.6;
                }

                .hero-main-img {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    border-radius: 20px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    object-fit: cover;
                    opacity: 0;
                    transition: opacity 1s ease-in-out, transform 1s ease-in-out;
                    transform: scale(1.05);
                }

                .hero-main-img.active {
                    opacity: 1;
                    transform: scale(1);
                }

                .home-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 2rem;
                }

                .home-card {
                    background: #ffffff;
                    border: 1px solid #f3f4f6;
                    border-radius: 12px;
                    padding: 3rem 2rem;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: space-between;
                    transition: all 0.2s ease;
                }

                .home-card-icon {
                    width: 100px;
                    height: 100px;
                    color: #4b5563;
                    margin-bottom: 2rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .home-card-text {
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: #1f2937;
                    line-height: 1.5;
                    margin-bottom: 2.5rem;
                    max-width: 380px;
                }

                .home-card-link {
                    width: 100%;
                }

                .home-btn {
                    width: 100%;
                    height: 60px;
                    font-weight: 800 !important;
                    font-size: 1rem !important;
                    text-transform: uppercase;
                    border: none !important;
                    border-radius: 6px !important;
                }

                .buyer-btn {
                    background: #ffb703 !important;
                    color: #1f2937 !important;
                }

                .buyer-btn:hover {
                    background: #ffc300 !important;
                    transform: translateY(-2px);
                }

                .photographer-btn {
                    background: #022e44 !important;
                    color: #ffffff !important;
                }

                .photographer-btn:hover {
                    background: #033a55 !important;
                    transform: translateY(-2px);
                }

                /* Recent Albums Carousel Section */
                .recent-albums-section {
                    margin-top: 4rem;
                    width: 100%;
                }

                .section-header {
                    text-align: center;
                    margin-bottom: 2.5rem;
                }

                .section-title {
                    font-size: 2rem;
                    font-weight: 800;
                    color: #1f2937;
                    margin-bottom: 0.5rem;
                    letter-spacing: -0.02em;
                }

                .section-subtitle {
                    font-size: 1rem;
                    color: #6b7280;
                    font-weight: 500;
                }

                .carousel-container {
                    position: relative;
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .albums-carousel {
                    display: flex;
                    gap: 1.5rem;
                    overflow-x: auto;
                    scroll-behavior: smooth;
                    padding: 1rem 0.5rem 1.5rem;
                    -webkit-overflow-scrolling: touch;
                    scrollbar-width: thin;
                    scrollbar-color: #d1d5db #f3f4f6;
                }

                .albums-carousel::-webkit-scrollbar {
                    height: 8px;
                }

                .albums-carousel::-webkit-scrollbar-track {
                    background: #f3f4f6;
                    border-radius: 4px;
                }

                .albums-carousel::-webkit-scrollbar-thumb {
                    background: #d1d5db;
                    border-radius: 4px;
                }

                .albums-carousel::-webkit-scrollbar-thumb:hover {
                    background: #9ca3af;
                }

                .album-card {
                    flex: 0 0 280px;
                    background: white;
                    border-radius: 12px;
                    overflow: hidden;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    border: 1px solid #e5e7eb;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }

                .album-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
                    border-color: var(--primary-blue);
                }

                .album-cover {
                    width: 100%;
                    height: 200px;
                    background: #f3f4f6;
                    position: relative;
                    overflow: hidden;
                }

                .album-cover img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: transform 0.3s ease;
                }

                .album-card:hover .album-cover img {
                    transform: scale(1.05);
                }

                .album-placeholder {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #9ca3af;
                }

                .album-info {
                    padding: 1.25rem;
                }

                .album-title {
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: #1f2937;
                    margin-bottom: 0.5rem;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .album-photographer {
                    font-size: 0.875rem;
                    color: #6b7280;
                    margin-bottom: 0.75rem;
                }

                .album-price {
                    font-size: 1.25rem;
                    font-weight: 800;
                    color: var(--primary-blue);
                }

                .carousel-nav {
                    position: absolute;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    background: white;
                    border: 2px solid #e5e7eb;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    z-index: 10;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }

                .carousel-nav:hover {
                    background: var(--primary-blue);
                    border-color: var(--primary-blue);
                    color: white;
                }

                .carousel-nav-left {
                    left: -24px;
                }

                .carousel-nav-right {
                    right: -24px;
                }

                @media (max-width: 1024px) {
                    .hero-section {
                        grid-template-columns: 1fr;
                        gap: 3rem;
                        text-align: center;
                    }

                    .hero-headline {
                        font-size: 3rem;
                    }

                    .hero-subtext, .hero-ai-hint {
                        margin-left: auto;
                        margin-right: auto;
                    }

                    .hero-actions {
                        justify-content: center;
                    }

                    .hero-image-container {
                        width: 100%;
                        max-width: 550px;
                        height: 450px; /* Taller on tablet to fit square images better */
                        margin: 0 auto;
                        padding: 1rem;
                    }
                }

                @media (max-width: 768px) {
                    .home-container {
                        padding: 1.5rem 1rem;
                        min-height: calc(100vh - 70px);
                    }

                    .hero-section {
                        margin-bottom: 4rem;
                        gap: 2rem;
                    }

                    .hero-headline {
                        font-size: 2.25rem;
                    }

                    .hero-subtext {
                        font-size: 1.1rem;
                        margin-bottom: 1rem;
                    }

                    .hero-ai-hint {
                        font-size: 0.85rem;
                        padding: 0.75rem 1rem;
                        margin-bottom: 2rem;
                    }

                    .hero-image-container {
                        width: 100%;
                        height: 400px; /* Taller on mobile to prevent excessive cropping */
                        padding: 0.5rem;
                        margin: 2rem auto;
                    }

                    .hero-actions {
                        flex-direction: column;
                        gap: 1rem;
                        width: 100%;
                        max-width: 320px;
                        margin: 0 auto;
                    }

                    .hero-btn-contact, .hero-btn-try {
                        width: 100%;
                        min-width: unset;
                    }

                    .home-grid {
                        grid-template-columns: 1fr;
                        gap: 1.5rem;
                    }
                    .home-card {
                        padding: 2.5rem 1.5rem;
                    }
                    .home-card-icon {
                        width: 80px;
                        height: 80px;
                        margin-bottom: 1.5rem;
                    }
                    .home-card-text {
                        font-size: 1rem;
                        margin-bottom: 2rem;
                    }
                    .home-btn {
                        height: 56px;
                        font-size: 0.9rem !important;
                    }
                    
                    /* Carousel Mobile Styles */
                    .recent-albums-section {
                        margin-top: 3rem;
                    }
                    .section-title {
                        font-size: 1.75rem;
                    }
                    .section-subtitle {
                        font-size: 0.95rem;
                    }
                    .carousel-container {
                        padding: 0 1rem;
                    }
                    .carousel-nav {
                        display: none;
                    }
                    .albums-carousel {
                        gap: 1rem;
                        padding: 1rem 0;
                    }
                    .album-card {
                        flex: 0 0 260px;
                    }
                    .album-cover {
                        height: 180px;
                    }
                }
                
                @media (max-width: 480px) {
                    .home-container {
                        padding: 1rem 0.75rem;
                    }

                    .hero-section {
                        margin-bottom: 3rem;
                        padding: 1rem 0;
                    }

                    .hero-headline {
                        font-size: 1.85rem;
                    }

                    .hero-image-container {
                        height: 100vw; /* Use viewport width to maintain square aspect ratio on small mobile */
                        max-height: 350px;
                        padding: 0;
                        margin: 1.5rem auto;
                    }

                    .bg-box-orange {
                        width: 90%;
                        height: 60%;
                    }

                    .bg-box-blue {
                        width: 60%;
                        height: 40%;
                    }
                    
                    .home-card {
                        padding: 2rem 1.25rem;
                        border-radius: 8px;
                    }
                    .home-card-icon {
                        width: 70px;
                        height: 70px;
                        margin-bottom: 1.25rem;
                    }
                    .home-card-text {
                        font-size: 0.95rem;
                        line-height: 1.4;
                    }
                    .home-btn {
                        height: 52px;
                        font-size: 0.85rem !important;
                        padding: 0.75rem 1rem !important;
                    }
                    
                    /* Carousel Extra Small Mobile */
                    .recent-albums-section {
                        margin-top: 2.5rem;
                    }
                    .section-title {
                        font-size: 1.5rem;
                    }
                    .section-header {
                        margin-bottom: 1.5rem;
                    }
                    .carousel-container {
                        padding: 0 0.5rem;
                    }
                    .albums-carousel {
                        gap: 0.75rem;
                    }
                    .album-card {
                        flex: 0 0 240px;
                    }
                    .album-cover {
                        height: 160px;
                    }
                    .album-info {
                        padding: 1rem;
                    }
                    .album-title {
                        font-size: 1rem;
                    }
                    .album-price {
                        font-size: 1.1rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default Home;
