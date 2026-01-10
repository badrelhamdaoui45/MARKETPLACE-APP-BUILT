import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Calendar, Clock, ChevronLeft, Share2, PlayCircle, User } from 'lucide-react';
import Button from '../components/ui/Button';

const BlogPost = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPost = async () => {
            try {
                const { data, error } = await supabase
                    .from('blog_posts')
                    .select('*')
                    .eq('slug', slug)
                    .eq('is_published', true)
                    .single();

                if (error) throw error;
                setPost(data);

                // Set SEO Title and Meta Description
                if (data) {
                    document.title = `${data.meta_title || data.title} | Run Capture Blog`;
                    const metaDesc = document.querySelector('meta[name="description"]');
                    if (metaDesc) {
                        metaDesc.setAttribute('content', data.meta_description || data.excerpt || '');
                    }
                }
            } catch (error) {
                console.error('Error fetching blog post:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPost();
    }, [slug]);

    if (loading) {
        return (
            <div className="blog-post-loading">
                <div className="loader-container">
                    <div className="loader"></div>
                    <p>Fetching the latest story...</p>
                </div>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="blog-post-not-found">
                <div className="not-found-content">
                    <h1>Story Not Found</h1>
                    <p>The blog post you're looking for might have been moved or unpublished.</p>
                    <Button onClick={() => navigate('/')}>Back to Home</Button>
                </div>
            </div>
        );
    }

    // Function to format the video URL for embedding
    const getEmbedUrl = (url) => {
        if (!url) return null;
        if (url.includes('youtube.com/watch?v=')) {
            return url.replace('watch?v=', 'embed/');
        }
        if (url.includes('youtu.be/')) {
            return url.replace('youtu.be/', 'youtube.com/embed/');
        }
        if (url.includes('vimeo.com/')) {
            const id = url.split('/').pop();
            return `https://player.vimeo.com/video/${id}`;
        }
        return url;
    };

    const embedUrl = getEmbedUrl(post.video_url);

    return (
        <div className="blog-post-container">
            <div className="blog-post-hero">
                {post.featured_image && (
                    <div className="hero-image-overlay">
                        <img src={post.featured_image} alt={post.title} className="hero-bg" />
                        <div className="hero-gradient"></div>
                    </div>
                )}

                <div className="hero-content-wrapper">
                    <Link to="/" className="back-link">
                        <ChevronLeft size={20} /> Back to Hub
                    </Link>

                    <div className="post-meta-top">
                        <span className="meta-tag">COMMUNITY</span>
                        <span className="meta-item"><Calendar size={14} /> {new Date(post.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                        <span className="meta-item"><Clock size={14} /> 5 min read</span>
                    </div>

                    <h1 className="post-title-main">{post.title}</h1>

                    {post.excerpt && <p className="post-subtitle-main">{post.excerpt}</p>}

                    <div className="author-strip">
                        <div className="author-avatar">
                            <User size={18} />
                        </div>
                        <div className="author-info">
                            <span className="author-name">Run Capture Team</span>
                            <span className="author-role">Official Insights</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="post-body-content">
                <div className="content-side-bar">
                    <div className="share-actions">
                        <span className="share-label">SHARE</span>
                        <button className="share-btn"><Share2 size={18} /></button>
                    </div>
                </div>

                <div className="main-content-area">
                    {/* Video Integration */}
                    {embedUrl && (
                        <div className="video-embed-wrapper">
                            <iframe
                                src={embedUrl}
                                title="Blog post video"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        </div>
                    )}

                    <div className="post-rich-text" dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, '<br/>') }} />
                </div>
            </div>

            <section className="post-footer-cta">
                <div className="cta-box-blog">
                    <h2>Ready to capture your own moments?</h2>
                    <p>Join thousands of photographers managing their sports collections with Run Capture.</p>
                    <Button variant="primary" onClick={() => navigate('/onboarding')}>Get Started Now</Button>
                </div>
            </section>

            <style>{`
                .blog-post-container {
                    min-height: 100vh;
                    background: #ffffff;
                    font-family: 'Inter', sans-serif;
                }

                .blog-post-hero {
                    position: relative;
                    height: 70vh;
                    min-height: 500px;
                    display: flex;
                    align-items: flex-end;
                    justify-content: center;
                    color: white;
                    overflow: hidden;
                    padding-bottom: 5rem;
                }

                .hero-image-overlay {
                    position: absolute;
                    inset: 0;
                    z-index: 1;
                }

                .hero-bg {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transform: scale(1.02);
                }

                .hero-gradient {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.8) 100%);
                }

                .hero-content-wrapper {
                    position: relative;
                    z-index: 2;
                    max-width: 900px;
                    width: 100%;
                    padding: 0 2rem;
                    text-align: center;
                }

                .back-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    color: rgba(255,255,255,0.8);
                    text-decoration: none;
                    font-weight: 600;
                    margin-bottom: 2rem;
                    transition: color 0.2s;
                }

                .back-link:hover {
                    color: white;
                }

                .post-meta-top {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 1.5rem;
                    margin-bottom: 1.5rem;
                    font-size: 0.875rem;
                    font-weight: 500;
                    opacity: 0.9;
                }

                .meta-tag {
                    background: var(--primary-blue);
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-weight: 700;
                    letter-spacing: 0.05em;
                }

                .meta-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .post-title-main {
                    font-size: clamp(2.5rem, 5vw, 4rem);
                    font-weight: 900;
                    line-height: 1.1;
                    margin-bottom: 1.5rem;
                    letter-spacing: -0.03em;
                }

                .post-subtitle-main {
                    font-size: 1.25rem;
                    opacity: 0.85;
                    max-width: 700px;
                    margin: 0 auto 2.5rem;
                    line-height: 1.6;
                }

                .author-strip {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 1rem;
                }

                .author-avatar {
                    width: 48px;
                    height: 48px;
                    background: rgba(255,255,255,0.2);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    backdrop-filter: blur(4px);
                    border: 1px solid rgba(255,255,255,0.3);
                }

                .author-info {
                    text-align: left;
                }

                .author-name {
                    display: block;
                    font-weight: 700;
                    font-size: 1rem;
                }

                .author-role {
                    font-size: 0.8rem;
                    opacity: 0.7;
                }

                .post-body-content {
                    max-width: 1200px;
                    margin: -4rem auto 0;
                    padding: 0 2rem 5rem;
                    position: relative;
                    z-index: 3;
                    display: grid;
                    grid-template-columns: 100px 1fr;
                    gap: 4rem;
                }

                .content-side-bar {
                    position: sticky;
                    top: 100px;
                    height: fit-content;
                }

                .share-actions {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1rem;
                }

                .share-label {
                    font-size: 0.75rem;
                    font-weight: 800;
                    color: #94a3b8;
                    letter-spacing: 0.1em;
                }

                .share-btn {
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    background: white;
                    color: #64748b;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .share-btn:hover {
                    color: var(--primary-blue);
                    border-color: var(--primary-blue);
                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
                }

                .main-content-area {
                    background: white;
                    padding: 4rem;
                    border-radius: 24px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.05);
                }

                .video-embed-wrapper {
                    position: relative;
                    padding-bottom: 56.25%; /* 16:9 */
                    height: 0;
                    overflow: hidden;
                    border-radius: 16px;
                    margin-bottom: 3rem;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                }

                .video-embed-wrapper iframe {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                }

                .post-rich-text {
                    font-size: 1.15rem;
                    line-height: 1.8;
                    color: #334155;
                }

                .post-rich-text p {
                    margin-bottom: 2rem;
                }

                .post-rich-text h2 {
                    font-size: 2rem;
                    font-weight: 800;
                    color: #0f172a;
                    margin: 3rem 0 1.5rem;
                    letter-spacing: -0.02em;
                }

                .post-footer-cta {
                    padding: 5rem 2rem;
                    background: #f8fafc;
                    display: flex;
                    justify-content: center;
                }

                .cta-box-blog {
                    max-width: 800px;
                    width: 100%;
                    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                    padding: 4rem;
                    border-radius: 32px;
                    text-align: center;
                    color: white;
                }

                .cta-box-blog h2 {
                    font-size: 2.25rem;
                    font-weight: 800;
                    margin-bottom: 1rem;
                }

                .cta-box-blog p {
                    font-size: 1.1rem;
                    opacity: 0.8;
                    margin-bottom: 2.5rem;
                }

                @media (max-width: 1024px) {
                    .post-body-content {
                        grid-template-columns: 1fr;
                        margin-top: -2rem;
                    }
                    .content-side-bar {
                        display: none;
                    }
                    .main-content-area {
                        padding: 2.5rem 1.5rem;
                    }
                }

                @media (max-width: 768px) {
                    .blog-post-hero {
                        height: auto;
                        padding-top: 8rem;
                        padding-bottom: 5rem;
                    }
                    .post-title-main {
                        font-size: 2.25rem;
                    }
                }
                
                /* Loading / Not Found States */
                .blog-post-loading, .blog-post-not-found {
                    height: 80vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    padding: 2rem;
                }

                .loader {
                    width: 48px;
                    height: 48px;
                    border: 4px solid #f1f5f9;
                    border-top: 4px solid var(--primary-blue);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 1.5rem;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default BlogPost;
