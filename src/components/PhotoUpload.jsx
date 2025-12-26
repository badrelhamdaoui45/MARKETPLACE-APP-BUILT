
import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { watermarkImage } from '../utils/watermark';
import Button from './ui/Button';
import './ui/ui.css';

const PhotoUpload = ({ albumId, onUploadComplete }) => {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState('');
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
        setProgress(`Starting upload for ${files.length} photos...`);

        let successCount = 0;

        for (const file of files) {
            try {
                const fileName = `${Date.now()}-${file.name}`;

                // 1. Upload Original (Private Bucket)
                setProgress(`Uploading original: ${file.name}`);
                const { data: originalData, error: originalError } = await supabase.storage
                    .from('original-photos')
                    .upload(`${albumId}/${fileName}`, file);

                if (originalError) throw originalError;

                // 2. Generate Watermark
                setProgress(`Watermarking: ${file.name}`);
                const watermarkedBlob = await watermarkImage(file);

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
                        original_url: originalData.path, // Store path for private access
                        watermarked_url: publicUrl
                    });

                if (dbError) throw dbError;

                successCount++;
            } catch (error) {
                console.error(`Failed to upload ${file.name}:`, error);
            }
        }

        setUploading(false);
        setProgress(`Uploaded ${successCount} of ${files.length} photos.`);
        if (onUploadComplete) onUploadComplete();

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="upload-container" style={{ border: '2px dashed var(--border-subtle)', padding: '2rem', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}>
            <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                ref={fileInputRef}
                disabled={uploading}
            />

            <Button variant="secondary" onClick={handleButtonClick} disabled={uploading}>
                {uploading ? 'Processing...' : 'Select Photos to Upload'}
            </Button>

            {progress && <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>{progress}</p>}
        </div>
    );
};

export default PhotoUpload;
