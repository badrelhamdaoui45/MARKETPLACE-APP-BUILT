import React, { useState } from 'react';
import { Plus, Minus, Search, HelpCircle, Camera, User } from 'lucide-react';
import Button from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';

const FAQItem = ({ question, answer, isOpen, onClick }) => {
    return (
        <div className={`faq-item ${isOpen ? 'open' : ''}`} onClick={onClick}>
            <div className="faq-question">
                <h3>{question}</h3>
                <span className="faq-icon">
                    {isOpen ? <Minus size={20} /> : <Plus size={20} />}
                </span>
            </div>
            <div className="faq-answer">
                <div className="faq-answer-content">
                    <p>{answer}</p>
                </div>
            </div>
        </div>
    );
};

const FAQ = () => {
    const navigate = useNavigate();
    const [activeCategory, setActiveCategory] = useState('general');
    const [openIndex, setOpenIndex] = useState(null);

    const toggleItem = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    const categories = [
        { id: 'general', label: 'General', icon: <HelpCircle size={18} /> },
        { id: 'photographer', label: 'Photographers', icon: <Camera size={18} /> },
        { id: 'runner', label: 'Runners', icon: <User size={18} /> }
    ];

    const faqData = {
        general: [
            {
                q: "What is Run Capture?",
                a: "Run Capture is a premier marketplace connecting sports photographers with athletes. We use advanced AI facial recognition to help runners find their photos instantly among thousands of event images."
            },
            {
                q: "Is it free to join?",
                a: "Yes! Creating an account is completely free for both photographers and runners. Photographers only pay a small commission when they make a sale."
            },
            {
                q: "How do I contact support?",
                a: "You can reach our support team 24/7 by visiting the Contact page or emailing support@runcapture.com."
            }
        ],
        photographer: [
            {
                q: "How much can I earn?",
                a: "You set your own prices for your albums. run Capture takes a transparent commission (starting at 15%) to cover hosting, AI processing, and transaction fees. You keep the rest."
            },
            {
                q: "How does the AI tagging work?",
                a: "When you upload your photos, our system automatically detects faces and bib numbers. This allows participants to find 99% of their photos simply by searching for their name or selfie."
            },
            {
                q: "When do I get paid?",
                a: "We use Stripe Connect for instant payouts. As soon as a runner purchases a photo, the funds are routed to your connected bank account."
            },
            {
                q: "Can I watermark my photos?",
                a: "Yes, we automatically apply a protective watermark to all previews. The high-resolution original is only released to the buyer after successful payment."
            }
        ],
        runner: [
            {
                q: "How do I find my photos?",
                a: "Simply go to the 'Find Photos' page, upload a selfie or enter your bib number, and select the event. Our AI will show you every photo you appear in."
            },
            {
                q: "What do I get when I buy a photo?",
                a: "You will receive a high-resolution, watermark-free digital download file, suitable for printing and sharing on social media."
            },
            {
                q: "Do you offer refunds?",
                a: "Due to the digital nature of the product, all sales are generally final. However, if there constitutes a technical error with the file, please contact support for assistance."
            }
        ]
    };

    return (
        <div className="faq-page">
            <div className="faq-header">
                <h1>Frequently Asked Questions</h1>
                <p>Have questions? We're here to help.</p>
            </div>

            <div className="faq-container">
                <div className="faq-categories">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            className={`cat-btn ${activeCategory === cat.id ? 'active' : ''}`}
                            onClick={() => { setActiveCategory(cat.id); setOpenIndex(null); }}
                        >
                            {cat.icon}
                            {cat.label}
                        </button>
                    ))}
                </div>

                <div className="faq-list">
                    {faqData[activeCategory].map((item, index) => (
                        <FAQItem
                            key={index}
                            question={item.q}
                            answer={item.a}
                            isOpen={openIndex === index}
                            onClick={() => toggleItem(index)}
                        />
                    ))}
                </div>

                <div className="faq-footer-cta">
                    <h3>Still have questions?</h3>
                    <p>Can't find the answer you're looking for? Please chat to our friendly team.</p>
                    <Button onClick={() => navigate('/contact')}>Contact Us</Button>
                </div>
            </div>

            <style>{`
                .faq-page {
                    min-height: 80vh;
                    background: #f8fafc;
                    padding-bottom: 4rem;
                }

                .faq-header {
                    background: #0A162B; /* Dark Blue */
                    color: white;
                    text-align: center;
                    padding: 4rem 1rem 6rem;
                    clip-path: ellipse(150% 100% at 50% 0%);
                }

                .faq-header h1 {
                    font-size: 2.5rem;
                    font-weight: 800;
                    margin-bottom: 1rem;
                }

                .faq-header p {
                    color: #94a3b8;
                    font-size: 1.1rem;
                }

                .faq-container {
                    max-width: 800px;
                    margin: -3rem auto 0;
                    padding: 0 1rem;
                    position: relative;
                    z-index: 10;
                }

                .faq-categories {
                    display: flex;
                    justify-content: center;
                    gap: 1rem;
                    margin-bottom: 2rem;
                    flex-wrap: wrap;
                }

                .cat-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1.5rem;
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 50px;
                    font-weight: 600;
                    color: #64748b;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.02);
                }

                .cat-btn:hover {
                    background: #f1f5f9;
                }

                .cat-btn.active {
                    background: var(--primary-blue);
                    color: white;
                    border-color: var(--primary-blue);
                    box-shadow: 0 10px 20px rgba(37, 99, 235, 0.2);
                }

                .faq-list {
                    background: white;
                    border-radius: 20px;
                    padding: 1rem;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.05);
                    border: 1px solid #e2e8f0;
                }

                .faq-item {
                    border-bottom: 1px solid #f1f5f9;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                
                .faq-item:last-child {
                    border-bottom: none;
                }

                .faq-item:hover {
                    background: #fcfcfc;
                }

                .faq-question {
                    padding: 1.5rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .faq-question h3 {
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: #1e293b;
                    margin: 0;
                }

                .faq-icon {
                    color: var(--primary-blue);
                    display: flex;
                    align-items: center;
                }

                .faq-answer {
                    max-height: 0;
                    overflow: hidden;
                    transition: max-height 0.3s ease-out;
                }

                .faq-item.open .faq-answer {
                    max-height: 200px; /* Approximate max height */
                }
                
                .faq-item.open .faq-question h3 {
                    color: var(--primary-blue);
                }

                .faq-answer-content {
                    padding: 0 1.5rem 1.5rem;
                    color: #475569;
                    line-height: 1.6;
                }

                .faq-footer-cta {
                    text-align: center;
                    margin-top: 4rem;
                }

                .faq-footer-cta h3 {
                    font-size: 1.5rem;
                    font-weight: 800;
                    margin-bottom: 0.5rem;
                    color: #0f172a;
                }

                .faq-footer-cta p {
                    color: #64748b;
                    margin-bottom: 1.5rem;
                }
                
                @media (max-width: 640px) {
                    .faq-header {
                         padding: 3rem 1rem 5rem;
                    }
                    .faq-header h1 {
                        font-size: 2rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default FAQ;
