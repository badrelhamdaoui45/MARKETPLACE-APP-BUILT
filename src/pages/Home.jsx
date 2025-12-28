import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

const Home = () => {
    return (
        <div className="home-container">
            <div className="home-content">
                <div className="home-grid">
                    {/* Buyer Section */}
                    <div className="home-card buyer-card">
                        <div className="home-card-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                                <circle cx="9.5" cy="9.5" r="3" />
                            </svg>
                        </div>
                        <p className="home-card-text">
                            Vous avez participé à un événement et souhaitez retrouver vos photos de sport en ligne.
                        </p>
                        <Link to="/albums" className="home-card-link">
                            <Button className="home-btn buyer-btn">
                                JE CHERCHE MES PHOTOS
                            </Button>
                        </Link>
                    </div>

                    {/* Photographer Section */}
                    <div className="home-card photographer-card">
                        <div className="home-card-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                            </svg>
                        </div>
                        <p className="home-card-text">
                            Vous êtes un photographe, un évènement ou un club et souhaitez héberger et identifier vos photos de sport en ligne.
                        </p>
                        <Link to="/login" className="home-card-link">
                            <Button variant="primary" className="home-btn photographer-btn">
                                JE SUIS PHOTOGRAPHE / ORGANISATEUR
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
                }

                .home-card-icon svg {
                    width: 100%;
                    height: 100%;
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
                }

                .photographer-btn {
                    background: #022e44 !important;
                    color: #ffffff !important;
                }

                .photographer-btn:hover {
                    background: #033a55 !important;
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
