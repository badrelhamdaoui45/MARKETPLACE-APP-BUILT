import React, { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Copy, Check, Download, Share2 } from 'lucide-react';
import Toast from './ui/Toast';

const ShareModal = ({ isOpen, onClose, album, profile }) => {
    const [copied, setCopied] = useState(false);
    const [toast, setToast] = useState(null);

    if (!album) return null;

    // Construct the public URL
    const photogName = profile?.full_name || 'photographer';
    const albumIdentifier = album.slug || album.title;
    const shareUrl = `${window.location.origin}/albums/${encodeURIComponent(photogName)}/${encodeURIComponent(albumIdentifier)}`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareUrl).then(() => {
            setCopied(true);
            setToast({ message: 'Link copied to clipboard!', type: 'success' });
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleDownloadQR = () => {
        const canvas = document.getElementById('qr-code-canvas');
        if (canvas) {
            const pngUrl = canvas.toDataURL("image/png");
            const downloadLink = document.createElement("a");
            downloadLink.href = pngUrl;
            downloadLink.download = `${album.title || 'album'}-qr.png`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            setToast({ message: 'QR Code downloaded!', type: 'success' });
        }
    };

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title="Share Album"
                showFooter={false}
            >
                <div className="share-modal-content">
                    <div className="share-header-info">
                        <h3>{album.title}</h3>
                        <p className="share-subtitle">Let people scan to view photos</p>
                    </div>

                    <div className="qr-container">
                        <div className="qr-wrapper">
                            <QRCodeCanvas
                                id="qr-code-canvas"
                                value={shareUrl}
                                size={200}
                                level={"H"}
                                includeMargin={true}
                                imageSettings={{
                                    src: "/logo-icon.png", // Optional: if we have a small logo icon
                                    x: undefined,
                                    y: undefined,
                                    height: 24,
                                    width: 24,
                                    excavate: true,
                                }}
                            />
                        </div>
                        <Button
                            variant="outline"
                            className="download-qr-btn"
                            onClick={handleDownloadQR}
                        >
                            <Download size={16} />
                            Download QR Code
                        </Button>
                    </div>

                    <div className="link-section">
                        <label>Album Link</label>
                        <div className="link-box">
                            <input type="text" value={shareUrl} readOnly />
                            <Button
                                className={`copy-btn ${copied ? 'copied' : ''}`}
                                onClick={handleCopyLink}
                            >
                                {copied ? <Check size={18} /> : <Copy size={18} />}
                            </Button>
                        </div>
                    </div>
                </div>

                <style>{`
                    .share-modal-content {
                        display: flex;
                        flex-direction: column;
                        gap: 1.5rem;
                        align-items: center;
                        text-align: center;
                    }

                    .share-header-info h3 {
                        font-size: 1.25rem;
                        font-weight: 700;
                        margin-bottom: 0.25rem;
                        color: #0f172a;
                    }

                    .share-subtitle {
                        color: #64748b;
                        font-size: 0.9rem;
                    }

                    .qr-container {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 1rem;
                        width: 100%;
                    }

                    .qr-wrapper {
                        padding: 1rem;
                        background: white;
                        border: 2px solid #e2e8f0;
                        border-radius: 16px;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                    }

                    .download-qr-btn {
                        font-size: 0.85rem;
                        gap: 0.5rem;
                    }

                    .link-section {
                        width: 100%;
                        text-align: left;
                    }

                    .link-section label {
                        font-size: 0.8rem;
                        font-weight: 700;
                        color: #64748b;
                        margin-bottom: 0.5rem;
                        display: block;
                        text-transform: uppercase;
                    }

                    .link-box {
                        display: flex;
                        gap: 0.5rem;
                        background: #f8fafc;
                        padding: 0.5rem;
                        border-radius: 10px;
                        border: 1px solid #e2e8f0;
                    }

                    .link-box input {
                        flex: 1;
                        background: transparent;
                        border: none;
                        padding: 0.5rem;
                        font-size: 0.9rem;
                        color: #334155;
                        outline: none;
                        width: 100%;
                    }

                    .copy-btn {
                        padding: 0.5rem 1rem;
                        border-radius: 8px;
                        transition: all 0.2s;
                        color: #ff9f1c; 
                    }

                    .copy-btn:hover {
                        background-color: #fff7ed;
                    }

                    .copy-btn.copied {
                        background: #10b981;
                        border-color: #10b981;
                        color: white;
                    }
                `}</style>
            </Modal>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </>
    );
};

export default ShareModal;
