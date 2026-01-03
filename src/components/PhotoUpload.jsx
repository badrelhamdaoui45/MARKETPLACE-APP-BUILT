import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { watermarkImage } from '../utils/watermark';
import { sanitizeFileName } from '../utils/sanitize';
import Button from './ui/Button';
import './ui/ui.css';

const PhotoUpload = ({ albumId, onUploadComplete }) => {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, filename: '', percent: 0 });
    const [uploadedPhotos, setUploadedPhotos] = useState([]);
    const fileInputRef = useRef(null);

    const handleButtonClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        setUploading(true);
        setUploadedPhotos([]); // Clear previous uploads
        let successCount = 0;

        // Fetch user's custom watermark text
        let customWatermarkText = "© RUN CAPTURE"; // Default
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('watermark_text')
                    .eq('id', user.id)
                    .single();

                if (profile && profile.watermark_text) {
                    customWatermarkText = profile.watermark_text;
                }
            }
        } catch (err) {
            console.warn("Could not fetch watermark text, using default:", err);
        }

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            try {
                // Update Progress state
                setProgress({
                    current: i + 1,
                    total: files.length,
                    filename: file.name,
                    percent: Math.round(((i) / files.length) * 100)
                });

                const sanitizedName = sanitizeFileName(file.name);
                const fileName = `${Date.now()}-${sanitizedName}`;

                // 1. Upload Original (Private Bucket)
                const { data: originalData, error: originalError } = await supabase.storage
                    .from('original-photos')
                    .upload(`${albumId}/${fileName}`, file);

                if (originalError) throw originalError;

                // 2. Generate Watermark
                const watermarkedBlob = await watermarkImage(file, customWatermarkText);

                // 3. Upload Watermarked (Public Bucket)
                const { data: publicData, error: publicError } = await supabase.storage
                    .from('public-photos')
                    .upload(`${albumId}/${fileName}`, watermarkedBlob, {
                        contentType: 'image/jpeg'
                    });

                if (publicError) throw publicError;

                // 4. Get Public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('public-photos')
                    .getPublicUrl(`${albumId}/${fileName}`);

                // 5. Save to Database
                const { error: dbError } = await supabase
                    .from('photos')
                    .insert({
                        album_id: albumId,
                        title: file.name,
                        original_url: originalData.path,
                        watermarked_url: publicUrl
                    });

                if (dbError) throw dbError;

                // Add to uploaded list for display
                // USER REQUEST: Show ORIGINAL image in the upload preview, not the watermarked result
                setUploadedPhotos(prev => [...prev, { name: file.name, url: URL.createObjectURL(file) }]);
                successCount++;

            } catch (error) {
                console.error(`Failed to upload ${file.name}:`, error);
            }
        }

        setUploading(false);
        setProgress({ current: successCount, total: files.length, filename: 'Done', percent: 100 });
        if (onUploadComplete) onUploadComplete();

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="upload-container">
            <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                ref={fileInputRef}
                disabled={uploading}
            />

            {!uploading && (
                <Button variant="secondary" onClick={handleButtonClick} disabled={uploading}>
                    Select Photos to Upload
                </Button>
            )}

            {/* Progress Bar UI */}
            {uploading && (
                <div className="progress-section">
                    <p className="progress-text">
                        Uploading {progress.current} of {progress.total}: <strong>{progress.filename}</strong>
                    </p>
                    <div className="progress-bar-bg">
                        <div
                            className="progress-bar-fill"
                            style={{ width: `${progress.percent}%` }}
                        ></div>
                    </div>
                </div>
            )}

            {/* Uploaded Photos Preview List */}
            {uploadedPhotos.length > 0 && (
                <div className="uploaded-preview-grid">
                    {uploadedPhotos.map((photo, index) => (
                        <div key={index} className="uploaded-item">
                            <img src={photo.url} alt={photo.name} />
                        </div>
                    ))}
                </div>
            )}

            <style>{`
                .upload-container {
                    border: 2px dashed var(--border-subtle);
                    padding: 2rem;
                    text-align: center;
                    border-radius: var(--radius-lg);
                }

                .progress-section {
                    margin-top: 1.5rem;
                    text-align: left;
                }

                .progress-text {
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                    margin-bottom: 0.5rem;
                }

                .progress-bar-bg {
                    width: 100%;
                    height: 8px;
                    background: var(--bg-tertiary);
                    border-radius: 4px;
                    overflow: hidden;
                }

                .progress-bar-fill {
                    height: 100%;
                    background: var(--primary-blue);
                    transition: width 0.3s ease;
                }

                .uploaded-preview-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 1.5rem;
                    margin-top: 2rem;
                }

                .uploaded-item {
                    border-radius: 8px;
                    overflow: hidden;
                    background: var(--bg-tertiary);
                    box-shadow: var(--shadow-sm);
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }

                .uploaded-item:hover {
                    transform: translateY(-4px);
                    box-shadow: var(--shadow-lg);
                }

                .uploaded-item img {
                    width: 100%;
                    height: auto;
                    display: block;
                }
            `}</style>
        </div>
    );
};

export default PhotoUpload;
