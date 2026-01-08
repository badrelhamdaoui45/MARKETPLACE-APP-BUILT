import React from 'react';

const PrivacyPolicy = () => {
    return (
        <div className="legal-page-container">
            <div className="legal-content">
                <h1>Privacy Policy</h1>
                <p className="last-updated">Last Updated: January 8, 2026</p>

                <section>
                    <h2>1. Information We Collect</h2>
                    <p>We collect information you provide directly to us, such as when you create an account, make a purchase, or communicate with us. This may include your name, email address, payment information, and photos.</p>
                </section>

                <section>
                    <h2>2. How We Use Your Information</h2>
                    <p>We use the information we collect to provide, maintain, and improve our services, including to process transactions, identify you as a user, and facilitate photo tagging via facial recognition (if opted in).</p>
                </section>

                <section>
                    <h2>3. Data Security</h2>
                    <p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>
                </section>

                <section>
                    <h2>4. Third-Party Services</h2>
                    <p>We use third-party services like Stripe for payment processing. These services collect and process your payment information pursuant to their own privacy policies.</p>
                </section>

                <section>
                    <h2>5. Contact Us</h2>
                    <p>If you have any questions about this Privacy Policy, please contact us at privacy@runcapture.com.</p>
                </section>
            </div>

            <style>{`
                .legal-page-container {
                    padding: 4rem 1rem;
                    max-width: 800px;
                    margin: 0 auto;
                    color: var(--text-primary);
                }
                
                .legal-content h1 {
                    font-size: 2.5rem;
                    font-weight: 800;
                    margin-bottom: 0.5rem;
                    color: var(--primary-blue);
                }

                .last-updated {
                    color: var(--text-secondary);
                    margin-bottom: 3rem;
                    font-size: 0.9rem;
                }

                section {
                    margin-bottom: 2.5rem;
                }

                h2 {
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin-bottom: 1rem;
                    color: #0f172a;
                }

                p {
                    line-height: 1.7;
                    color: #475569;
                    margin-bottom: 1rem;
                }
            `}</style>
        </div>
    );
};

export default PrivacyPolicy;
