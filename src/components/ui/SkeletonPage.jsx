import React from 'react';
import './ui.css'; // Ensure CSS variables are available

const SkeletonPage = ({ showStats = true, showTable = true, tableRowCount = 5 }) => {
    return (
        <div className="skeleton-page-container">
            <div className="skeleton-header-row">
                <div className="skeleton-btn" style={{ width: '150px', height: '40px' }}></div>
            </div>

            {/* Skeleton Profile/Header Card */}
            <div className="skeleton-card profile-header-skeleton">
                <div className="skeleton-avatar"></div>
                <div className="skeleton-info-main">
                    <div className="skeleton-text title"></div>
                    <div className="skeleton-meta-grid">
                        <div className="skeleton-text meta"></div>
                        <div className="skeleton-text meta"></div>
                        <div className="skeleton-text meta"></div>
                        <div className="skeleton-text meta"></div>
                    </div>
                </div>
            </div>

            {/* Skeleton Stats Grid */}
            {showStats && (
                <div className="skeleton-stats-grid">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="skeleton-card stat-card-skeleton">
                            <div className="skeleton-icon"></div>
                            <div className="skeleton-info-col">
                                <div className="skeleton-text label"></div>
                                <div className="skeleton-text value"></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Skeleton Table Section */}
            {showTable && (
                <div className="skeleton-table-section">
                    <div className="skeleton-text title" style={{ width: '200px', marginBottom: '1.5rem' }}></div>
                    <div className="skeleton-table-wrapper">
                        <div className="skeleton-table-header"></div>
                        {Array.from({ length: tableRowCount }).map((_, i) => (
                            <div key={i} className="skeleton-table-row"></div>
                        ))}
                    </div>
                </div>
            )}

            <style>{`
                .skeleton-page-container {
                    padding: 2rem;
                    max-width: 1200px;
                    margin: 0 auto;
                    font-family: 'Inter', sans-serif;
                }

                .skeleton-card {
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    overflow: hidden;
                    position: relative;
                }

                .skeleton-header-row {
                    margin-bottom: 2rem;
                }

                .profile-header-skeleton {
                    padding: 2rem;
                    display: flex;
                    align-items: center;
                    gap: 2rem;
                    margin-bottom: 2rem;
                }

                .skeleton-avatar {
                    width: 100px;
                    height: 100px;
                    border-radius: 50%;
                    background: #f1f5f9;
                    flex-shrink: 0;
                }

                .skeleton-info-main {
                    flex: 1;
                }

                .skeleton-meta-grid {
                    display: flex;
                    gap: 1.5rem;
                    margin-top: 1rem;
                    flex-wrap: wrap;
                }

                .skeleton-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 3rem;
                }

                .stat-card-skeleton {
                    padding: 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .skeleton-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                    background: #f1f5f9;
                }

                .skeleton-info-col {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .skeleton-table-section {
                    margin-top: 2rem;
                }

                .skeleton-table-wrapper {
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    overflow: hidden;
                }

                .skeleton-table-header {
                    height: 50px;
                    background: #f8fafc;
                    border-bottom: 1px solid #e2e8f0;
                }

                .skeleton-table-row {
                    height: 70px;
                    background: white;
                    border-bottom: 1px solid #f1f5f9;
                }

                /* Text Placeholders */
                .skeleton-text {
                    background: #f1f5f9;
                    border-radius: 4px;
                }
                .skeleton-text.title { height: 32px; width: 40%; }
                .skeleton-text.meta { height: 16px; width: 120px; }
                .skeleton-text.label { height: 14px; width: 80px; }
                .skeleton-text.value { height: 24px; width: 60%; }
                .skeleton-btn { background: #e2e8f0; border-radius: 8px; }

                /* Shimmer Effect */
                .skeleton-avatar, .skeleton-text, .skeleton-icon, .skeleton-btn,
                .skeleton-table-header, .skeleton-table-row {
                    position: relative;
                    overflow: hidden;
                }

                .skeleton-avatar::after, .skeleton-text::after, .skeleton-icon::after, .skeleton-btn::after,
                .skeleton-table-header::after, .skeleton-table-row::after {
                    content: "";
                    position: absolute;
                    top: 0;
                    right: 0;
                    bottom: 0;
                    left: 0;
                    transform: translateX(-100%);
                    background-image: linear-gradient(
                        90deg,
                        rgba(255, 255, 255, 0) 0,
                        rgba(255, 255, 255, 0.4) 20%,
                        rgba(255, 255, 255, 0.7) 60%,
                        rgba(255, 255, 255, 0)
                    );
                    animation: shimmer 1.5s infinite;
                }

                @keyframes shimmer {
                    100% {
                        transform: translateX(100%);
                    }
                }
            `}</style>
        </div>
    );
};

export default SkeletonPage;
