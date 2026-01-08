import React from 'react';

const CookiePolicy = () => {
    return (
        <div className="legal-page-container">
            <div className="legal-content">
                <h1>Cookie Policy</h1>
                <p className="last-updated">Last Updated: January 8, 2026</p>

                <section>
                    <h2>1. What Are Cookies</h2>
                    <p>Cookies are small pieces of text sent to your web browser by a website you visit. A cookie file is stored in your web browser and allows the Service or a third-party to recognize you and make your next visit easier and the Service more useful to you.</p>
                </section>

                <section>
                    <h2>2. How We Use Cookies</h2>
                    <p>We use cookies for the following purposes: to enable certain functions of the Service, to provide analytics, to store your preferences, and to enable advertisements delivery, including behavioral advertising.</p>
                </section>

                <section>
                    <h2>3. Types of Cookies We Use</h2>
                    <ul>
                        <li><strong>Essential cookies:</strong> Required for the operation of our website (e.g., authentication).</li>
                        <li><strong>Analytical/performance cookies:</strong> Allow us to recognize and count the number of visitors and see how visitors move around our website.</li>
                        <li><strong>Functionality cookies:</strong> Used to recognize you when you return to our website.</li>
                    </ul>
                </section>

                <section>
                    <h2>4. Managing Cookies</h2>
                    <p>If you'd like to delete cookies or instruct your web browser to delete or refuse cookies, please visit the help pages of your web browser.</p>
                </section>

                <section>
                    <h2>5. Contact Us</h2>
                    <p>If you have any questions about our Cookie Policy, please contact us at support@runcapture.com.</p>
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

                ul {
                    list-style-type: disc;
                    padding-left: 1.5rem;
                    color: #475569;
                    line-height: 1.7;
                }
                
                li {
                    margin-bottom: 0.5rem;
                }
            `}</style>
        </div>
    );
};

export default CookiePolicy;
