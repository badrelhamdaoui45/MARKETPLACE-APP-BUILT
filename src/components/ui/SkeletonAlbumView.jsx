import React from 'react';

const SkeletonAlbumView = () => {
    return (
        <div className="album-view-container skeleton-album-view">
            <div className="album-content-layout">
                {/* Left/Top: Photos Grid Skeleton */}
                <div className="photos-section">
                    <div className="album-header">
                        <div className="skel-text skel-title"></div>
                        <div className="skel-photographer-row">
                            <div className="skel-avatar-mini"></div>
                            <div className="skel-text skel-author"></div>
                        </div>
                        <div className="skel-hint"></div>
                    </div>

                    <div className="photos-grid">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="photo-card-wrapper skel-photo-wrapper">
                                <div className="skel-photo-box"></div>
                                <div className="skel-btn-row"></div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right/Bottom: Purchase Card Skeleton */}
                <div className="purchase-card-container">
                    <div className="purchase-card skel-purchase-card">
                        <div className="skel-card-header">
                            <div className="skel-text skel-pkg-name"></div>
                            <div className="skel-text skel-pkg-desc"></div>
                        </div>

                        <div className="skel-card-body">
                            <div className="skel-detail-row"></div>
                            <div className="skel-detail-row"></div>
                            <div className="skel-divider"></div>
                            <div className="skel-total-row"></div>
                        </div>

                        <div className="skel-main-btn"></div>
                        <div className="skel-payment-note"></div>
                    </div>
                </div>
            </div>

            <style>{`
                .skeleton-album-view .skel-text {
                    background: #f1f5f9;
                    border-radius: 4px;
                    position: relative;
                    overflow: hidden;
                }

                .skeleton-album-view .skel-title {
                    height: 48px;
                    width: 60%;
                    margin-bottom: 1rem;
                }

                .skel-photographer-row {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin-bottom: 1.5rem;
                }

                .skel-avatar-mini {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: #f1f5f9;
                }

                .skel-author {
                    height: 20px;
                    width: 200px;
                }

                .skel-hint {
                    height: 36px;
                    width: 250px;
                    background: #f1f5f9;
                    border-radius: 20px;
                    margin-bottom: 2rem;
                }

                .skel-photo-box {
                    aspect-ratio: 3/4;
                    background: #f1f5f9;
                    border-radius: 12px;
                    width: 100%;
                }

                .skel-btn-row {
                    height: 44px;
                    background: #f1f5f9;
                    border-radius: 8px;
                    margin-top: 1rem;
                }

                .skel-purchase-card {
                    padding: 2rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                .skel-pkg-name {
                    height: 28px;
                    width: 80%;
                    margin-bottom: 0.5rem;
                }

                .skel-pkg-desc {
                    height: 16px;
                    width: 100%;
                }

                .skel-detail-row {
                    height: 20px;
                    width: 100%;
                    background: #f1f5f9;
                    margin-bottom: 1rem;
                    border-radius: 4px;
                }

                .skel-divider {
                    height: 1px;
                    background: #e2e8f0;
                    margin: 1rem 0;
                }

                .skel-total-row {
                    height: 32px;
                    width: 100%;
                    background: #f1f5f9;
                    border-radius: 4px;
                    margin-bottom: 2rem;
                }

                .skel-main-btn {
                    height: 56px;
                    background: #f1f5f9;
                    border-radius: 12px;
                }

                .skel-payment-note {
                    height: 14px;
                    width: 150px;
                    background: #f1f5f9;
                    margin: 1rem auto 0;
                    border-radius: 4px;
                }

                /* Shimmer Animation */
                .skeleton-album-view [class^="skel-"] {
                    position: relative;
                    overflow: hidden;
                    background: #f1f5f9;
                }

                .skeleton-album-view [class^="skel-"]::after {
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
                    animation: skel-shimmer 1.5s infinite;
                }

                @keyframes skel-shimmer {
                    100% {
                        transform: translateX(100%);
                    }
                }
            `}</style>
        </div>
    );
};

export default SkeletonAlbumView;
