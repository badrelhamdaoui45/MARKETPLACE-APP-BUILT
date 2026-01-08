import React from 'react';

const TermsOfService = () => {
    return (
        <div className="legal-page-container">
            <div className="legal-content">
                <h1>Terms of Service</h1>
                <p className="last-updated">Last Updated: January 8, 2026</p>

                <section>
                    <h2>1. Agreement to Terms</h2>
                    <p>By accessing or using Run Capture, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.</p>
                </section>

                <section>
                    <h2>2. Use License</h2>
                    <p>Permission is granted to temporarily download one copy of the materials (information or software) on Run Capture's website for personal, non-commercial transitory viewing only.</p>
                </section>

                <section>
                    <h2>3. User Accounts</h2>
                    <p>When you create an account with us, you must provide us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.</p>
                </section>

                <section>
                    <h2>4. Content Liability</h2>
                    <p>Photographers are responsible for the photos they upload. Run Capture acts as a marketplace and does not claim ownership of the content uploaded by users.</p>
                </section>

                <section>
                    <h2>5. Contact Us</h2>
                    <p>If you have any questions about these Terms, please contact us at support@runcapture.com.</p>
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

export default TermsOfService;
