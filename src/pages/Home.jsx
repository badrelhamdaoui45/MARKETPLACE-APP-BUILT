import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { Search, Camera } from 'lucide-react';

const Home = () => {
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

                @media (max-width: 768px) {
                    .home-grid {
                        grid-template-columns: 1fr;
                    }
                    .home-card {
                        padding: 2rem 1.5rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default Home;
