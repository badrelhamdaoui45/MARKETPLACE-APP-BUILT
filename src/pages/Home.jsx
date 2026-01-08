import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { Search, Camera, ChevronLeft, ChevronRight, Image as ImageIcon, Zap, Shield, Globe, Smartphone, CreditCard, Layers } from 'lucide-react';
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
                            <div className="col-feature">
                                <span className="d-none-mobile">Feature</span>
                            </div>
                            <div className="col-us">
                                <span className="brand-text-logo">
                                    <span className="brand-run">RUN</span>
                                    <span className="brand-capture">CAPTURE</span>
                                </span>
                            </div>
                            <div className="col-others">Other Apps</div>
                        </div>

                        {[
                            { feature: "Starting Cost", us: "Free", others: "Monthly Fees" },
                            { feature: "AI Detection", us: "Unlimited", others: "Add-on / None" },
                            { feature: "Payouts", us: "Instant", others: "Monthly" },
                            { feature: "Commission", us: "Fair (15%)", others: "High (20-30%)" },
                            { feature: "Watermark", us: "Custom", others: "Fixed" },
                            { feature: "Setup", us: "Instant", others: "Manual" },
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

                {/* Pricing Section */}
                <div className="pricing-section">
                    <div className="section-header">
                        <h2 className="section-title">Simple, Transparent Pricing</h2>
                        <p className="section-subtitle">Choose the plan that fits your photography business</p>
                    </div>

                    <div className="pricing-grid">
                        {/* Free Tier */}
                        <div className="pricing-card">
                            <div className="pricing-header">
                                <h3 className="pricing-tier">Free</h3>
                                <div className="pricing-price">$0<span className="pricing-period">/mo</span></div>
                                <p className="pricing-desc">Perfect for getting started</p>
                            </div>
                            <ul className="pricing-features">
                                <li><span className="check-icon">✓</span> Unlimited Uploads</li>
                                <li><span className="check-icon">✓</span> AI Detection</li>
                                <li><span className="check-icon">✓</span> <strong>15%</strong> Commission</li>
                                <li><span className="check-icon">✓</span> Standard Support</li>
                            </ul>
                            <Button variant="outline" className="pricing-btn" onClick={() => navigate('/register')}>
                                Get Started
                            </Button>
                        </div>

                        {/* Starter Tier */}
                        <div className="pricing-card popular">
                            <div className="popular-badge">MOST POPULAR</div>
                            <div className="pricing-header">
                                <h3 className="pricing-tier">Starter</h3>
                                <div className="pricing-price">$19<span className="pricing-period">/mo</span></div>
                                <p className="pricing-desc">For growing businesses</p>
                            </div>
                            <ul className="pricing-features">
                                <li><span className="check-icon">✓</span> All Free features</li>
                                <li><span className="check-icon">✓</span> <strong>10%</strong> Commission</li>
                                <li><span className="check-icon">✓</span> Priority Processing</li>
                                <li><span className="check-icon">✓</span> Portfolio Page</li>
                            </ul>
                            <Button className="pricing-btn btn-primary" onClick={() => navigate('/register?plan=starter')}>
                                Start Trial
                            </Button>
                        </div>

                        {/* Premium Tier */}
                        <div className="pricing-card">
                            <div className="pricing-header">
                                <h3 className="pricing-tier">Premium</h3>
                                <div className="pricing-price">$49<span className="pricing-period">/mo</span></div>
                                <p className="pricing-desc">For professionals & agencies</p>
                            </div>
                            <ul className="pricing-features">
                                <li><span className="check-icon">✓</span> All Starter features</li>
                                <li><span className="check-icon">✓</span> <strong>5%</strong> Commission</li>
                                <li><span className="check-icon">✓</span> White Labeling</li>
                                <li><span className="check-icon">✓</span> Dedicated Manager</li>
                            </ul>
                            <Button variant="outline" className="pricing-btn" onClick={() => navigate('/contact')}>
                                Contact Sales
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Timeline Section */}
                <div className="timeline-section">
                    <div className="section-header">
                        <h2 className="section-title">How It Works</h2>
                        <p className="section-subtitle">Start selling your photos in 4 simple steps</p>
                    </div>

                    <div className="timeline-container">
                        {[
                            { title: "Sign Up", desc: "Create your free photographer account", icon: "1" },
                            { title: "Upload Photos", desc: "Create albums and upload your best shots", icon: "2" },
                            { title: "Set Pricing", desc: "Choose your rates and publish", icon: "3" },
                            { title: "Get Paid", desc: "Receive earnings directly to your bank", icon: "4" }
                        ].map((step, i) => (
                            <div key={i} className="timeline-step">
                                <div className="step-number">{step.icon}</div>
                                <div className="step-content">
                                    <h3>{step.title}</h3>
                                    <p>{step.desc}</p>
                                </div>
                                {i < 3 && <div className="step-connector"></div>}
                            </div>
                        ))}
                    </div>

                    <div style={{ textAlign: 'center', marginTop: '3rem' }}>
                        <Button className="pricing-btn btn-primary" style={{ maxWidth: '300px', margin: '0 auto' }} onClick={() => navigate('/register')}>
                            Join Now
                        </Button>
                    </div>
                </div>

                {/* Features Section */}
                <div className="features-section">
                    <div className="section-header">
                        <h2 className="section-title">Everything You Need</h2>
                        <p className="section-subtitle">Powerful tools built for sports photography businesses</p>
                    </div>

                    <div className="features-grid">
                        {[
                            { icon: <Zap size={32} />, title: "Instant Payouts", desc: "Get paid immediately after every sale via Stripe Connect." },
                            { icon: <Shield size={32} />, title: "Secure Storage", desc: "Unlimited cloud storage for your high-resolution albums." },
                            { icon: <Globe size={32} />, title: "Global Reach", desc: "Sell your photos to runners from all around the world." },
                            { icon: <Smartphone size={32} />, title: "Mobile Optimized", desc: "Runners can find and buy photos easily on any device." },
                            { icon: <CreditCard size={32} />, title: "Low Commission", desc: "Keep more of your earnings with our transparent pricing." },
                            { icon: <Layers size={32} />, title: "Album Management", desc: "Organize thousands of photos in minutes with bulk tools." }
                        ].map((item, i) => (
                            <div key={i} className="feature-card">
                                <div className="feature-icon">{item.icon}</div>
                                <h3>{item.title}</h3>
                                <p>{item.desc}</p>
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
                        grid-template-columns: 1.2fr 1.4fr 1.2fr;
                        background: #f8fafc;
                        padding: 1.5rem;
                        border-bottom: 2px solid #e2e8f0;
                        font-weight: 800;
                        color: var(--text-primary);
                        align-items: center;
                    }

                    .brand-text-logo {
                        font-family: 'Montserrat', sans-serif;
                        font-weight: 900;
                        font-size: 1.2rem;
                        letter-spacing: -0.02em;
                        text-transform: uppercase;
                        display: inline-block;
                        cursor: default;
                    }

                    .brand-run {
                        color: #0A162B; /* Dark Slate Grey */
                        transition: color 0.3s ease;
                    }

                    .brand-capture {
                        color: #F5A623; /* Safety Orange */
                    }

                    .col-us:hover .brand-run {
                        color: #F5A623;
                    }

                    .col-feature { 
                        display: flex; 
                        align-items: center; 
                        color: var(--text-secondary);
                        font-weight: 700;
                        font-size: 0.95rem;
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
                        font-weight: 600;
                        text-align: center;
                        font-size: 0.95rem;
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
                        grid-template-columns: 1.2fr 1.4fr 1.2fr;
                        padding: 1.25rem 1.5rem;
                        border-bottom: 1px solid #f1f5f9;
                        transition: background 0.2s;
                        align-items: center;
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
                        font-size: 1rem;
                    }
                    
                    /* Header middle column highlight */
                    .comparison-header-row .col-us {
                        background: transparent;
                        justify-content: center;
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

                    @media (max-width: 768px) {
                        .comparison-table-container {
                            border-radius: 12px;
                            font-size: 0.9rem;
                        }
                        
                        .comparison-header-row, .comparison-row {
                            padding: 1rem 0.5rem;
                            grid-template-columns: 1fr 1fr 1fr;
                            gap: 0.25rem;
                        }

                        .comparison-logo {
                            height: 24px;
                        }

                        .col-feature {
                            font-size: 0.8rem;
                            padding-left: 0.5rem;
                        }

                        .col-others {
                            font-size: 0.8rem;
                        }
                        
                        .comparison-row .col-us {
                            font-size: 0.85rem;
                            padding: 1rem 0;
                            margin: -1rem 0;
                        }
                    }

                    @media (max-width: 480px) {
                        .comparison-table-container {
                            font-size: 0.75rem;
                        }
                        
                        .comparison-header-row, .comparison-row {
                            padding: 0.75rem 0.25rem;
                            grid-template-columns: 0.8fr 1.2fr 0.8fr; /* Give more space to middle column */
                        }
                        
                        .col-feature {
                            justify-content: flex-start; /* Align text left */
                            text-align: left;
                            font-size: 0.75rem;
                        }

                        .check-icon, .cross-icon {
                            font-size: 0.9rem;
                            margin-right: 0.25rem;
                        }
                        
                        .comparison-row .col-us {
                            font-weight: 800;
                            background: #eff6ff;
                        }
                    }
                button {
                        font-family: inherit;
                    }

                    /* Pricing Section Styles */
                    .pricing-section {
                        margin-bottom: 6rem;
                        padding: 0 1rem;
                    }

                    .pricing-grid {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 2rem;
                        max-width: 1100px;
                        margin: 3rem auto 0;
                    }

                    .pricing-card {
                        background: white;
                        border: 1px solid var(--border-subtle);
                        border-radius: 16px;
                        padding: 2.5rem 2rem;
                        display: flex;
                        flex-direction: column;
                        position: relative;
                        transition: transform 0.3s ease, box-shadow 0.3s ease;
                    }

                    .pricing-card:hover {
                        transform: translateY(-8px);
                        box-shadow: 0 20px 40px rgba(0,0,0,0.08);
                        border-color: #cbd5e1;
                    }

                    .pricing-card.popular {
                        border: 2px solid var(--primary-blue);
                        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.1);
                        transform: scale(1.05);
                        z-index: 2;
                    }

                    .pricing-card.popular:hover {
                        transform: scale(1.05) translateY(-8px);
                    }

                    .popular-badge {
                        position: absolute;
                        top: -12px;
                        left: 50%;
                        transform: translateX(-50%);
                        background: var(--primary-blue);
                        color: white;
                        padding: 0.25rem 1rem;
                        border-radius: 50px;
                        font-size: 0.75rem;
                        font-weight: 800;
                        letter-spacing: 0.05em;
                        text-transform: uppercase;
                    }

                    .pricing-header {
                        text-align: center;
                        margin-bottom: 2rem;
                        padding-bottom: 2rem;
                        border-bottom: 1px solid var(--border-light);
                    }

                    .pricing-tier {
                        font-size: 1.25rem;
                        font-weight: 800;
                        color: var(--text-primary);
                        margin-bottom: 0.5rem;
                    }

                    .pricing-price {
                        font-size: 3rem;
                        font-weight: 900;
                        color: var(--text-primary);
                        line-height: 1;
                        margin-bottom: 0.5rem;
                    }

                    .pricing-period {
                        font-size: 1rem;
                        color: var(--text-secondary);
                        font-weight: 500;
                    }

                    .pricing-desc {
                        color: var(--text-secondary);
                        font-size: 0.95rem;
                    }

                    .pricing-features {
                        list-style: none;
                        padding: 0;
                        margin: 0 0 2rem;
                        flex-grow: 1;
                    }

                    .pricing-features li {
                        display: flex;
                        align-items: center;
                        margin-bottom: 1rem;
                        font-size: 0.95rem;
                        color: var(--text-secondary);
                    }
                    
                    .pricing-features li strong {
                        color: var(--text-primary);
                        font-weight: 700;
                        margin-right: 0.25rem;
                        margin-left: 0.25rem;
                    }

                    .pricing-btn {
                        width: 100%;
                        justify-content: center;
                        font-weight: 700;
                        text-transform: uppercase;
                        letter-spacing: 0.02em;
                    }
                    
                    .pricing-btn.btn-primary {
                        background: var(--primary-blue);
                        color: white;
                    }
                    
                    .pricing-btn.btn-primary:hover {
                        background: var(--primary-blue-dark);
                    }

                    @media (max-width: 1024px) {
                        .pricing-grid {
                            grid-template-columns: repeat(2, 1fr);
                            gap: 1.5rem;
                        }
                        .pricing-card.popular {
                            transform: scale(1);
                            order: -1; /* Show popular first on tablet */
                            grid-column: span 2; /* Full width on tablet */
                        }
                         .pricing-card.popular:hover {
                            transform: translateY(-8px);
                        }
                    }

                    @media (max-width: 768px) {
                        .pricing-grid {
                            grid-template-columns: 1fr;
                            margin-top: 2rem;
                        }
                        .pricing-card.popular {
                            grid-column: span 1;
                        }
                        .pricing-price {
                            font-size: 2.5rem;
                        }
                    }

                    /* Timeline Section */
                    .timeline-section {
                        margin-bottom: 6rem;
                        padding: 0 1rem;
                    }

                    .timeline-container {
                        display: flex;
                        justify-content: space-between;
                        max-width: 1000px;
                        margin: 3rem auto 0;
                        position: relative;
                        gap: 2rem;
                    }

                    .timeline-step {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        text-align: center;
                        position: relative;
                        flex: 1;
                        z-index: 2;
                        cursor: pointer; /* Added cursor pointer to indicate hoverability */
                    }
                    
                    /* Added hover effect for timeline number */
                    .timeline-step:hover .step-number {
                        background: #F5A623; /* Safety Orange */
                        transform: scale(1.1);
                        transition: all 0.3s ease;
                    }

                    .step-number {
                        width: 50px;
                        height: 50px;
                        background: var(--primary-blue);
                        color: white;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: 800;
                        font-size: 1.25rem;
                        margin-bottom: 1.5rem;
                        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
                        border: 4px solid white;
                        z-index: 2;
                    }

                    .step-content h3 {
                        font-size: 1.1rem;
                        font-weight: 800;
                        margin-bottom: 0.5rem;
                        color: var(--text-primary);
                    }

                    .step-content p {
                        font-size: 0.9rem;
                        color: var(--text-secondary);
                        line-height: 1.5;
                    }

                    .step-connector {
                        position: absolute;
                        top: 25px;
                        left: 50%;
                        width: 100%;
                        height: 2px;
                        background: #e2e8f0;
                        z-index: -1;
                        transform: translateY(-50%);
                    }

                    @media (max-width: 768px) {
                        .timeline-container {
                            flex-direction: column;
                            align-items: flex-start;
                            max-width: 400px;
                            gap: 0;
                        }

                        .timeline-step {
                            flex-direction: row;
                            text-align: left;
                            margin-bottom: 2rem;
                            width: 100%;
                            align-items: flex-start;
                        }

                        .step-number {
                            margin-right: 1.5rem;
                            margin-bottom: 0;
                            flex-shrink: 0;
                        }

                        .step-connector {
                            width: 2px;
                            height: 100%;
                            left: 23px; /* Center of the 50px circle (approx) - actually 25px, minus 1px width? */
                            top: 25px;
                            transform: none;
                        }
                        
                         /* Fix connector alignment for mobile */
                        .timeline-step:nth-child(1) .step-connector,
                        .timeline-step:nth-child(2) .step-connector,
                        .timeline-step:nth-child(3) .step-connector {
                            height: calc(100% + 2rem); /* Reach next circle */
                        }
                    }

                    /* Features Section */
                    .features-section {
                        margin-bottom: 6rem;
                        padding: 0 1rem;
                    }

                    .features-grid {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 2rem;
                        max-width: 1100px;
                        margin: 3rem auto 0;
                    }

                    .feature-card {
                        background: white;
                        padding: 2rem;
                        border-radius: 16px;
                        border: 1px solid var(--border-subtle);
                        transition: all 0.3s ease;
                    }

                    .feature-card:hover {
                        transform: translateY(-5px);
                        box-shadow: 0 20px 40px rgba(245, 166, 35, 0.15); /* Orange Shadow */
                        border-color: #F5A623; /* Orange Border */
                    }

                    .feature-icon {
                        width: 60px;
                        height: 60px;
                        background: #eff6ff;
                        color: var(--primary-blue);
                        border-radius: 12px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin-bottom: 1.5rem;
                    }

                    .feature-card h3 {
                        font-size: 1.25rem;
                        font-weight: 800;
                        margin-bottom: 0.75rem;
                        color: var(--text-primary);
                    }

                    .feature-card p {
                        color: var(--text-secondary);
                        line-height: 1.6;
                        font-size: 0.95rem;
                    }

                    @media (max-width: 1024px) {
                        .features-grid {
                            grid-template-columns: repeat(2, 1fr);
                        }
                    }

                    @media (max-width: 640px) {
                        .features-grid {
                            grid-template-columns: 1fr;
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
                                            const albumIdentifier = album.slug || album.title;
                                            navigate(`/albums/${encodeURIComponent(photogName)}/${encodeURIComponent(albumIdentifier)}`);
                                        }}
                                    >
                                        <div className="album-badges">
                                            {album.is_free && (
                                                <span className="badge-free">FREE</span>
                                            )}
                                            {album.pre_inscription_enabled && (
                                                <span className="badge-pre">PRE-INSCRIPTION</span>
                                            )}
                                        </div>

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
                                                    className="photographer-link"
                                                >
                                                    {album.profiles?.full_name || 'Unknown'}
                                                </Link>
                                            </p>
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
                    margin-top: 6rem;
                    width: 100%;
                    position: relative;
                }

                .section-header {
                    text-align: center;
                    margin-bottom: 3rem;
                }

                .section-title {
                    font-size: 2.25rem;
                    font-weight: 900;
                    color: #1f2937;
                    margin-bottom: 0.75rem;
                    letter-spacing: -0.02em;
                }

                .section-subtitle {
                    font-size: 1.1rem;
                    color: #6b7280;
                    font-weight: 500;
                }

                .carousel-container {
                    position: relative;
                    max-width: 1240px;
                    margin: 0 auto;
                    padding: 0 1rem;
                }
                
                .carousel-nav {
                    position: absolute;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    background: white;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    z-index: 10;
                    color: #1f2937;
                    transition: all 0.2s ease;
                }
                
                .carousel-nav:hover {
                    background: #f8fafc;
                    box-shadow: 0 8px 16px rgba(0,0,0,0.15);
                    color: var(--primary-blue);
                }
                
                .carousel-nav-left {
                    left: -24px;
                }
                
                .carousel-nav-right {
                    right: -24px;
                }

                .albums-carousel {
                    display: flex;
                    gap: 1.5rem;
                    overflow-x: auto;
                    scroll-behavior: smooth;
                    padding: 1rem 0.5rem 2rem;
                    -webkit-overflow-scrolling: touch;
                    scrollbar-width: none; /* Hide scrollbar for cleaner look */
                }
                
                .albums-carousel::-webkit-scrollbar {
                    display: none;
                }

                .album-card {
                    flex: 0 0 300px;
                    background: white;
                    border-radius: 20px;
                    overflow: hidden;
                    cursor: pointer;
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    border: 1px solid rgba(226, 232, 240, 0.8);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
                    position: relative;
                }

                .album-card:hover {
                    transform: translateY(-8px);
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                    border-color: rgba(59, 130, 246, 0.3);
                }

                .album-badges {
                    position: absolute;
                    top: 1rem;
                    left: 1rem;
                    z-index: 5;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    align-items: flex-start;
                }
                
                .badge-free {
                    background: #10b981;
                    color: white;
                    padding: 0.35rem 0.75rem;
                    border-radius: 50px;
                    font-size: 0.75rem;
                    font-weight: 800;
                    box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
                }
                
                .badge-pre {
                    background: #f97316;
                    color: white;
                    padding: 0.35rem 0.75rem;
                    border-radius: 50px;
                    font-size: 0.75rem;
                    font-weight: 800;
                    box-shadow: 0 2px 4px rgba(249, 115, 22, 0.3);
                }

                .album-cover {
                    width: 100%;
                    height: 220px;
                    background: #f1f5f9;
                    position: relative;
                    overflow: hidden;
                }

                .album-cover img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: transform 0.6s ease;
                }

                .album-card:hover .album-cover img {
                    transform: scale(1.1);
                }

                .album-placeholder {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #cbd5e1;
                }

                .album-info {
                    padding: 1.5rem;
                }

                .album-title {
                    font-size: 1.15rem;
                    font-weight: 800;
                    color: #1f2937;
                    margin-bottom: 0.4rem;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    letter-spacing: -0.01em;
                }

                .album-photographer {
                    font-size: 0.9rem;
                    color: #64748b;
                    font-weight: 500;
                }
                
                .photographer-link {
                    color: #64748b;
                    text-decoration: none;
                    transition: color 0.2s;
                }
                
                .photographer-link:hover {
                    color: var(--primary-blue);
                    text-decoration: underline;
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

                .free-badge, .pre-badge {
                    position: absolute;
                    top: 1rem;
                    right: 1rem;
                    padding: 0.4rem 0.8rem;
                    border-radius: 6px;
                    font-size: 0.7rem;
                    font-weight: 800;
                    letter-spacing: 0.05em;
                    color: white;
                    z-index: 5;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }

                .free-badge {
                    background: #10b981;
                }

                .pre-badge {
                    background: #f97316;
                }
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
