
import React, { useState } from 'react';
import { Mail, Send, MapPin, Phone, MessageSquare } from 'lucide-react';
import Button from '../components/ui/Button';
import Toast from '../components/ui/Toast';

const Contact = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [status, setStatus] = useState(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        // Simulate form submission
        setStatus({ message: 'Message sent successfully! We will get back to you soon.', type: 'success' });
        setFormData({ name: '', email: '', subject: '', message: '' });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="contact-container">
            <div className="contact-header">
                <h1>Contact Us</h1>
                <p>Have questions? We're here to help you revolutionize your sports photo management.</p>
            </div>

            <div className="contact-grid">
                <div className="contact-info">
                    <div className="info-card">
                        <div className="info-icon"><Mail size={24} /></div>
                        <div className="info-text">
                            <h3>Email Us</h3>
                            <p>support@capturerun.com</p>
                            <p>sales@capturerun.com</p>
                        </div>
                    </div>

                    <div className="info-card">
                        <div className="info-icon"><MessageSquare size={24} /></div>
                        <div className="info-text">
                            <h3>Live Chat</h3>
                            <p>Available Mon-Fri</p>
                            <p>9am - 6pm EST</p>
                        </div>
                    </div>

                    <div className="info-card">
                        <div className="info-icon"><MapPin size={24} /></div>
                        <div className="info-text">
                            <h3>Address</h3>
                            <p>123 Photography Lane</p>
                            <p>Creative District, NY 10001</p>
                        </div>
                    </div>
                </div>

                <div className="contact-form-wrapper">
                    <form className="contact-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Full Name</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="John Doe"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Email Address</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="john@example.com"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Subject</label>
                            <input
                                type="text"
                                name="subject"
                                value={formData.subject}
                                onChange={handleChange}
                                placeholder="How can we help?"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Message</label>
                            <textarea
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                                placeholder="Your message..."
                                rows="5"
                                required
                            ></textarea>
                        </div>

                        <Button type="submit" className="action-btn submit-btn">
                            <Send size={20} />
                            Send Message
                        </Button>
                    </form>
                </div>
            </div>

            {status && (
                <Toast
                    message={status.message}
                    type={status.type}
                    onClose={() => setStatus(null)}
                />
            )}

            <style>{`
                .contact-container {
                    max-width: 1100px;
                    margin: 0 auto;
                    padding: 4rem 2rem;
                }

                .contact-header {
                    text-align: center;
                    margin-bottom: 4rem;
                }

                .contact-header h1 {
                    font-size: 3rem;
                    font-weight: 800;
                    color: #0f172a;
                    margin-bottom: 1rem;
                }

                .contact-header p {
                    font-size: 1.2rem;
                    color: #64748b;
                    max-width: 600px;
                    margin: 0 auto;
                }

                .contact-grid {
                    display: grid;
                    grid-template-columns: 1fr 1.5fr;
                    gap: 3rem;
                    align-items: start;
                }

                .contact-info {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                .info-card {
                    background: #f8fafc;
                    padding: 2rem;
                    border-radius: 20px;
                    display: flex;
                    gap: 1.5rem;
                    border: 1px solid #e2e8f0;
                    transition: all 0.3s ease;
                }

                .info-card:hover {
                    border-color: var(--primary-blue);
                    transform: translateY(-5px);
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
                }

                .info-icon {
                    width: 48px;
                    height: 48px;
                    background: white;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--primary-blue);
                    border: 1px solid #e2e8f0;
                    flex-shrink: 0;
                }

                .info-text h3 {
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: #1e293b;
                    margin-bottom: 0.5rem;
                }

                .info-text p {
                    color: #64748b;
                    font-size: 0.95rem;
                    margin: 0;
                    line-height: 1.5;
                }

                .contact-form-wrapper {
                    background: white;
                    padding: 3rem;
                    border-radius: 24px;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 20px 50px -12px rgba(0, 0, 0, 0.05);
                }

                .contact-form {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .form-group label {
                    font-size: 0.9rem;
                    font-weight: 700;
                    color: #1e293b;
                }

                .form-group input, .form-group textarea {
                    padding: 0.75rem 1rem;
                    border-radius: 12px;
                    border: 2px solid #e2e8f0;
                    font-size: 1rem;
                    transition: all 0.2s;
                }

                .form-group input:focus, .form-group textarea:focus {
                    border-color: var(--primary-blue);
                    outline: none;
                    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
                }

                .submit-btn {
                    margin-top: 1rem;
                    height: 56px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.75rem;
                    font-size: 1.1rem !important;
                }

                @media (max-width: 900px) {
                    .contact-grid {
                        grid-template-columns: 1fr;
                    }

                    .contact-header h1 {
                        font-size: 2.25rem;
                    }

                    .contact-form-wrapper {
                        padding: 2rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default Contact;
