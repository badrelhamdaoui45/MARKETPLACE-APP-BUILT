import React from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { CreditCard, PlusSquare, Upload, Share2, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const DashboardSetupModal = ({ isOpen, onClose }) => {

    const steps = [
        {
            icon: <CreditCard size={24} />,
            title: "1. Configure Payments",
            desc: "Set up your Stripe account to receive automated payouts.",
            action: (
                <Button variant="outline" size="sm" onClick={onClose} >
                    Go to Payment Options
                </Button>
            )
        },
        {
            icon: <PlusSquare size={24} />,
            title: "2. Create Album",
            desc: "Create a new album for your event or photoshoot.",
            action: (
                <Link to="/photographer/albums/new" onClick={onClose}>
                    <Button variant="outline" size="sm">Create Album</Button>
                </Link>
            )
        },
        {
            icon: <Upload size={24} />,
            title: "3. Upload Photos",
            desc: "Upload photos to your album. They will be automatically watermarked.",
            action: null
        },
        {
            icon: <Share2 size={24} />,
            title: "4. Share & Sell",
            desc: "Use the Share button to get your QR code and link for buyers.",
            action: null
        }
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Dashboard Setup Guide"
            showFooter={false}
        >
            <div className="setup-guide-content">
                <p className="setup-intro">
                    Welcome to Run Capture! Follow these 4 steps to start selling your photos.
                </p>

                <div className="setup-steps">
                    {steps.map((step, index) => (
                        <div key={index} className="setup-step-item">
                            <div className="step-icon-wrapper">
                                {step.icon}
                            </div>
                            <div className="step-info">
                                <h3>{step.title}</h3>
                                <p>{step.desc}</p>
                                {step.action && <div className="step-action">{step.action}</div>}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="setup-footer">
                    <Button onClick={onClose} className="w-full">Got it!</Button>
                </div>
            </div>

            <style>{`
                .setup-guide-content {
                    padding: 0.5rem;
                }
                
                .setup-intro {
                    color: #64748b;
                    margin-bottom: 1.5rem;
                    text-align: center;
                    font-size: 0.95rem;
                }

                .setup-steps {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                }

                .setup-step-item {
                    display: flex;
                    gap: 1rem;
                    align-items: flex-start;
                    padding: 1rem;
                    background: #f8fafc;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                }

                .step-icon-wrapper {
                    background: white;
                    padding: 0.75rem;
                    border-radius: 10px;
                    color: var(--primary-blue);
                    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
                }

                .step-info {
                    flex: 1;
                }

                .step-info h3 {
                    font-size: 1rem;
                    font-weight: 700;
                    margin-bottom: 0.25rem;
                    color: #0f172a;
                }

                .step-info p {
                    font-size: 0.85rem;
                    color: #64748b;
                    line-height: 1.5;
                    margin-bottom: 0.75rem;
                }

                .step-action {
                    margin-top: 0.5rem;
                }
            `}</style>
        </Modal>
    );
};

export default DashboardSetupModal;
