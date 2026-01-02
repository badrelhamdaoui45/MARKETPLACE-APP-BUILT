import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { Search, Camera, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';

const Home = () => {
    const [recentAlbums, setRecentAlbums] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

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
                    max-width: 1100px;
                    width: 100%;
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

                @media (max-width: 768px) {
                    .home-container {
                        padding: 1.5rem 1rem;
                        min-height: calc(100vh - 70px);
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
