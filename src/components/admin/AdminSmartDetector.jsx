import React, { useState, useRef, useCallback } from 'react';
import { Upload, Image as ImageIcon, Loader2, User, Users, CheckCircle2, XCircle, Trash2, X, Search, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../ui/Button';

// API Key resolution
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_OPENROUTER_API_KEY || '';

// Helper to call Gemini with retry to prevent 503/429 errors.
// Diagnostics confirmed that gemini-2.5-flash is the only active model allowed by this API key,
// so we focus retries exclusively on it to avoid 404 fallback errors.
const callGeminiWithRetry = async (payload, key) => {
    const models = ["gemini-2.5-flash"];
    let lastError = null;

    for (const model of models) {
        const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${key}`;
        const maxRetries = 3;
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                console.log(`[Gemini Request] Model: ${model}, Attempt: ${attempt + 1}/${maxRetries}`);
                const response = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();
                
                if (response.ok) {
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) {
                        return text;
                    }
                    throw new Error("Empty content in response");
                }

                console.warn(`[Gemini Warning] Model ${model} returned status ${response.status}:`, data);
                
                const errorMsg = data.error?.message || "";
                const isRetryable = response.status === 429 || 
                                    response.status === 503 ||
                                    errorMsg.toLowerCase().includes("overloaded") ||
                                    errorMsg.toLowerCase().includes("demand") ||
                                    errorMsg.toLowerCase().includes("rate limit") ||
                                    errorMsg.toLowerCase().includes("resource");

                if (isRetryable && attempt < maxRetries - 1) {
                    const delayMs = Math.pow(2, attempt) * 1500 + Math.random() * 500;
                    console.log(`[Gemini Retry] Retrying in ${delayMs.toFixed(0)}ms...`);
                    await new Promise(r => setTimeout(r, delayMs));
                    continue;
                }

                throw new Error(errorMsg || `HTTP error ${response.status}`);
            } catch (err) {
                lastError = err;
                console.error(`[Gemini Error] Model ${model} attempt ${attempt + 1} failed:`, err);
                if (attempt < maxRetries - 1) {
                    const delayMs = Math.pow(2, attempt) * 1500 + Math.random() * 500;
                    await new Promise(r => setTimeout(r, delayMs));
                }
            }
        }
    }

    throw lastError || new Error("Gemini API call failed");
};

// Resilient JSON parsing helper that handles markdown formatting and surrounding text
const parseGeminiJson = (text) => {
    if (!text) throw new Error("Input text is empty");
    
    let cleaned = text.trim();
    
    // Find the first '{' or '[' and last '}' or ']' to extract the JSON object/array
    const startObjIdx = cleaned.indexOf('{');
    const endObjIdx = cleaned.lastIndexOf('}');
    const startArrIdx = cleaned.indexOf('[');
    const endArrIdx = cleaned.lastIndexOf(']');
    
    let startIdx = -1;
    let endIdx = -1;
    
    // Decide if it's an object or array based on what starts first
    if (startObjIdx !== -1 && (startArrIdx === -1 || startObjIdx < startArrIdx)) {
        startIdx = startObjIdx;
        endIdx = endObjIdx;
    } else if (startArrIdx !== -1) {
        startIdx = startArrIdx;
        endIdx = endArrIdx;
    }
    
    if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
        throw new Error("Could not locate a valid JSON object or array in AI response");
    }
    
    cleaned = cleaned.substring(startIdx, endIdx + 1);
    return JSON.parse(cleaned);
};

// Local canvas helper to crop faces in the browser with comfortable padding
const cropFaceToDataUrl = (imageDataUrl, faceBox) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = imageDataUrl;
        img.onload = () => {
            const [ymin, xmin, ymax, xmax] = faceBox;
            
            // Convert 0-1000 coordinates to actual pixels
            const x = (xmin / 1000) * img.width;
            const y = (ymin / 1000) * img.height;
            const w = ((xmax - xmin) / 1000) * img.width;
            const h = ((ymax - ymin) / 1000) * img.height;
            
            // Add comfortable padding (30%) around the detected face area
            const padding = 0.3;
            const padX = w * padding;
            const padY = h * padding;
            
            const cropX = Math.max(0, x - padX);
            const cropY = Math.max(0, y - padY);
            const cropW = Math.min(img.width - cropX, w + (padX * 2));
            const cropH = Math.min(img.height - cropY, h + (padY * 2));
            
            const canvas = document.createElement('canvas');
            canvas.width = 200;  // Standard square aspect ratio
            canvas.height = 200;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, 200, 200);
            
            resolve(canvas.toDataURL('image/jpeg', 0.9));
        };
        img.onerror = () => resolve(null);
    });
};

// Component to render face crop correctly using the browser-cropped face URL
const FaceCropThumbnail = ({ src, alt, croppedFaceUrl }) => {
    if (croppedFaceUrl) {
        return (
            <div style={{ width: '100%', height: '100%', overflow: 'hidden', background: '#f1f5f9' }}>
                <img 
                    src={croppedFaceUrl} 
                    alt={alt} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} 
                />
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: '100%', overflow: 'hidden', background: '#f1f5f9' }}>
            <img 
                src={src} 
                alt={alt} 
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} 
            />
        </div>
    );
};

export default function AdminSmartDetector() {
    const [images, setImages] = useState([]);
    const [peopleGroups, setPeopleGroups] = useState({}); // { "Person A": { bibNumber: "123", instances: [{ imageId, faceBox }] } }
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisStep, setAnalysisStep] = useState(''); // '', 'faces', 'bibs'
    const [selectedPerson, setSelectedPerson] = useState(null);
    const fileInputRef = useRef(null);

    const processFiles = (files) => {
        if (!files) return;
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setImages(prev => [...prev, {
                        id: Math.random().toString(36).substring(7),
                        dataUrl: reader.result,
                        status: 'pending'
                    }]);
                };
                reader.readAsDataURL(file);
            }
        });
    };

    const handleImageUpload = (event) => {
        processFiles(event.target.files);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        processFiles(e.dataTransfer.files);
    }, []);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
    }, []);

    const removeImage = (id) => {
        setImages(prev => prev.filter(img => img.id !== id));
        // Reset analysis if images change
        setPeopleGroups({});
    };

    const analyzeImages = async () => {
        if (images.length === 0) return;
        if (!apiKey) {
            alert("Missing VITE_GEMINI_API_KEY environment variable. AI won't run.");
            return;
        }

        setIsAnalyzing(true);
        setPeopleGroups({});
        
        try {
            // STEP 1: Individual Image Face & Bib Detection
            setAnalysisStep('faces');
            
            const detectionsList = [];
            
            for (let i = 0; i < images.length; i++) {
                const img = images[i];
                console.log(`[Smart Detector] Analyzing Image ${i + 1}/${images.length}...`);
                
                // Add a 2-second sleep pacing delay between requests to prevent free-tier RPM rate limit spikes
                if (i > 0) {
                    console.log(`[Smart Detector] Sleeping for 2000ms to avoid rate limit...`);
                    await new Promise(r => setTimeout(r, 2000));
                }
                
                const mimeType = img.dataUrl.split(';')[0].split(':')[1] || 'image/jpeg';
                const base64Str = img.dataUrl.split(',')[1];
                
                const detectPrompt = `Analyze this image of runners.
1. Detect all visible runners in the image.
2. For each runner, find the precise bounding box of their face as [ymin, xmin, ymax, xmax] where each is an integer between 0 and 1000 representing the relative position in the image.
3. If they are wearing a clearly visible bib number (race number), extract it as a string. If not clearly visible or missing, use "None".
4. Return ONLY a valid JSON array of objects, where each object has:
   - "faceBox": [ymin, xmin, ymax, xmax]
   - "bibNumber": "1234" (or "None")

CRITICAL FOR FACE BOUNDING BOXES:
- The faceBox coordinates MUST tightly enclose ONLY the face (from the top of the forehead/hairline to the chin, and ear-to-ear).
- Do NOT include the shoulders, neck, or chest in the faceBox. It must be a clean head/face crop.
- Ensure the coordinate values are extremely accurate relative to the height and width of the image.`;

                const payload = {
                    contents: [{
                        role: "user",
                        parts: [
                            { text: detectPrompt },
                            { inline_data: { mime_type: mimeType, data: base64Str } }
                        ]
                    }]
                };

                try {
                    const text = await callGeminiWithRetry(payload, apiKey);
                    const parsedDetections = parseGeminiJson(text);
                    
                    if (Array.isArray(parsedDetections)) {
                        for (const det of parsedDetections) {
                            if (det.faceBox && det.faceBox.length === 4) {
                                // Crop face locally in canvas!
                                const croppedUrl = await cropFaceToDataUrl(img.dataUrl, det.faceBox);
                                if (croppedUrl) {
                                    detectionsList.push({
                                        id: Math.random().toString(36).substring(7),
                                        imageId: img.id,
                                        faceBox: det.faceBox,
                                        bibNumber: det.bibNumber && det.bibNumber !== "None" ? det.bibNumber : null,
                                        croppedFaceUrl: croppedUrl
                                    });
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.error(`[Smart Detector] Failed to analyze image ${i + 1}`, e);
                }
            }

            if (detectionsList.length === 0) {
                throw new Error("No faces detected in any uploaded images.");
            }

            // STEP 2: Grouping / Clustering
            setAnalysisStep('bibs');
            
            // We cluster the detected cropped faces using Gemini
            const faceParts = detectionsList.map(det => {
                const mimeType = det.croppedFaceUrl.split(';')[0].split(':')[1];
                const base64Str = det.croppedFaceUrl.split(',')[1];
                return {
                    inline_data: { mime_type: mimeType, data: base64Str }
                };
            });

            // Sleep 2 seconds before the clustering request to strictly avoid concurrent rate limit limits
            console.log(`[Smart Detector] Sleeping for 2000ms before clustering step...`);
            await new Promise(r => setTimeout(r, 2000));

            const clusterPrompt = `Analyze these face images of runners.
1. Group the faces that belong to the same person.
2. If a face belongs to a unique person who doesn't match any other face, place them in their own group.
3. Return ONLY a valid JSON object where keys are the person identifier (e.g., "Person 1", "Person 2") and values are arrays of the 0-indexed face positions in the provided list.
4. Ensure you do not duplicate people or split the same runner.

Format example:
{
  "Person 1": [0, 2],
  "Person 2": [1]
}
Return valid JSON only.`;

            const clusterPayload = {
                contents: [{
                    role: "user",
                    parts: [
                        { text: clusterPrompt },
                        ...faceParts
                    ]
                }]
            };

            const clusterText = await callGeminiWithRetry(clusterPayload, apiKey);
            const parsedClusters = parseGeminiJson(clusterText);
            
            // Map clusters back to our detections list
            let processedGroups = {};
            for (const [personName, indices] of Object.entries(parsedClusters)) {
                if (!Array.isArray(indices) || indices.length === 0) continue;
                
                const mappedInstances = indices.map(idx => {
                    const det = detectionsList[idx];
                    if (!det) return null;
                    return {
                        imageId: det.imageId,
                        faceBox: det.faceBox,
                        croppedFaceUrl: det.croppedFaceUrl,
                        bibNumber: det.bibNumber
                    };
                }).filter(Boolean);

                if (mappedInstances.length > 0) {
                    // Extract bib number if any instance has one
                    const detectedBib = mappedInstances.find(inst => inst.bibNumber)?.bibNumber || null;
                    
                    processedGroups[personName] = {
                        bibNumber: detectedBib,
                        instances: mappedInstances
                    };
                }
            }

            // STEP 3: Merge groups that share the exact same bib number
            const mergedGroups = {};
            const bibToPersonMap = {}; // bib -> personName in mergedGroups

            for (const [personName, groupData] of Object.entries(processedGroups)) {
                const bib = groupData.bibNumber;
                
                if (bib && bib !== "None" && bib !== "Unknown") {
                    if (bibToPersonMap[bib]) {
                        // Merge instances into the existing person group
                        const targetName = bibToPersonMap[bib];
                        console.log(`[Smart Detector] Merging ${personName} into ${targetName} due to matching Bib ${bib}`);
                        
                        const allInstances = [
                            ...mergedGroups[targetName].instances,
                            ...groupData.instances
                        ];
                        // Deduplicate instances by imageId
                        const seenImageIds = new Set();
                        const uniqueInstances = [];
                        for (const inst of allInstances) {
                            if (!seenImageIds.has(inst.imageId)) {
                                seenImageIds.add(inst.imageId);
                                uniqueInstances.push(inst);
                            }
                        }
                        mergedGroups[targetName].instances = uniqueInstances;
                    } else {
                        // Register this bib
                        bibToPersonMap[bib] = personName;
                        mergedGroups[personName] = groupData;
                    }
                } else {
                    // No bib, keep as individual group
                    mergedGroups[personName] = groupData;
                }
            }

            setPeopleGroups(mergedGroups);
            setImages(prev => prev.map(img => ({ ...img, status: 'done' })));
        } catch (err) {
            console.error(err);
            alert(err.message);
        } finally {
            setIsAnalyzing(false);
            setAnalysisStep('');
        }
    };

    const hasResults = Object.keys(peopleGroups).length > 0;

    return (
        <div className="detector-container">
            <header className="detector-header">
                <div className="header-content">
                    <div className="header-icon">
                        <Users size={24} color="#fff" />
                    </div>
                    <div>
                        <h1 className="header-title">Smart Face & Bib Detector</h1>
                        <p className="header-subtitle">Upload photos to group them by person and detect bib numbers automatically.</p>
                    </div>
                </div>
            </header>

            <main className="detector-main">
                <section className="detector-grid">
                    {/* Left Column: Upload */}
                    <div className="upload-column">
                        <div className="step-section">
                            <h2 className="step-title">
                                <span className="step-badge">1</span> 
                                Upload Images
                            </h2>
                            <div
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onClick={() => fileInputRef.current?.click()}
                                className="upload-dropzone"
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImageUpload}
                                    accept="image/*"
                                    multiple
                                    style={{ display: 'none' }}
                                />
                                <div className="upload-instructions">
                                    <div className="upload-icon-container">
                                        <Upload size={24} color="var(--primary-blue, #2563eb)" />
                                    </div>
                                    <div>
                                        <p className="upload-text-main">Click to upload or drag and drop</p>
                                        <p className="upload-text-sub">We recommend uploading 5-10 images for best results</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {images.length > 0 && (
                            <div className="uploaded-preview-section">
                                <div className="preview-header">
                                    <h3 className="preview-title">Uploaded ({images.length})</h3>
                                    <button onClick={() => setImages([])} className="clear-btn">Clear All</button>
                                </div>
                                <div className="preview-row custom-scrollbar">
                                    <AnimatePresence>
                                        {images.map(img => (
                                            <motion.div
                                                key={img.id}
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.8 }}
                                                className="preview-item group"
                                            >
                                                <img src={img.dataUrl} className="preview-img" alt="Uploaded" />
                                                <div className="preview-overlay">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                                                        className="remove-btn"
                                                    >
                                                        <Trash2 size={14} color="#fff" />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>
                        )}

                        <Button
                            onClick={analyzeImages}
                            disabled={images.length === 0 || isAnalyzing}
                            variant="primary"
                            style={{ width: '100%', padding: '1rem', marginTop: '1rem', display: 'flex', justifyContent: 'center' }}
                        >
                            {isAnalyzing ? (
                                <div className="btn-content">
                                    <Loader2 className="spinner" size={18} />
                                    {analysisStep === 'faces' ? 'Clustering Faces...' : 'Scanning for Bib Numbers...'}
                                </div>
                            ) : (
                                <div className="btn-content">
                                    <Search size={18} />
                                    Analyze & Group Images
                                </div>
                            )}
                        </Button>
                    </div>

                    {/* Right Column: Results */}
                    <div className="results-column">
                        <div className="step-section" style={{ marginBottom: '1rem' }}>
                            <h2 className="step-title" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span className="step-badge">2</span> 
                                    Detected People
                                </div>
                                {hasResults && (
                                    <span className="results-badge">
                                        {Object.keys(peopleGroups).length} People Found
                                    </span>
                                )}
                            </h2>
                        </div>

                        <div className="results-container">
                            {hasResults ? (
                                <div className="results-grid">
                                    <AnimatePresence>
                                        {Object.entries(peopleGroups).map(([personName, group]) => {
                                            const firstInstance = group.instances[0];
                                            const sourceImage = images.find(img => img.id === firstInstance.imageId);
                                            const hasBib = group.bibNumber && group.bibNumber !== "None" && group.bibNumber !== "Unknown";
                                            const box = firstInstance.faceBox;

                                            return (
                                                <motion.div
                                                    key={personName}
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.9 }}
                                                    onClick={() => setSelectedPerson({ personName, group })}
                                                    className="premium-person-card"
                                                >
                                                    {/* Face Detected Section */}
                                                    <div className="card-section-header">
                                                        <span className="section-header-title">Face Detected</span>
                                                        <CheckCircle2 size={18} className="check-icon-green" />
                                                    </div>
                                                    
                                                    <div className="premium-thumbnail-wrapper">
                                                        {sourceImage ? (
                                                            <FaceCropThumbnail 
                                                                src={sourceImage.dataUrl} 
                                                                alt={personName} 
                                                                croppedFaceUrl={firstInstance.croppedFaceUrl} 
                                                            />
                                                        ) : (
                                                            <div className="thumbnail-placeholder">
                                                                <User size={32} color="#94a3b8" />
                                                            </div>
                                                        )}
                                                        
                                                        <div className="premium-photo-count-badge">
                                                            {group.instances.length} photos
                                                        </div>
                                                    </div>

                                                    <div className="premium-divider"></div>

                                                    {/* Bib Detected Section */}
                                                    <div className="card-section-header">
                                                        <span className="section-header-title">
                                                            {hasBib ? "Bib Detected" : "No Bib Detected"}
                                                        </span>
                                                        {hasBib ? (
                                                            <CheckCircle2 size={18} className="check-icon-green" />
                                                        ) : (
                                                            <XCircle size={18} className="icon-gray" />
                                                        )}
                                                    </div>

                                                    <div className="premium-bib-value-container">
                                                        {hasBib ? (
                                                            <span className="premium-bib-number-text">{group.bibNumber}</span>
                                                        ) : (
                                                            <span className="premium-bib-missing-text">----</span>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )
                                        })}
                                    </AnimatePresence>
                                </div>
                            ) : isAnalyzing ? (
                                <div className="empty-state">
                                    <div className="analyzing-indicator">
                                        <div className="pulse-ring"></div>
                                        <div className="spinner-container">
                                            <Loader2 className="spinner large" size={32} color="var(--primary-blue, #2563eb)" />
                                        </div>
                                    </div>
                                    <div className="empty-text-container">
                                        <p className="empty-title">
                                            {analysisStep === 'faces' ? 'Analyzing Faces...' : 'Reading Bib Numbers...'}
                                        </p>
                                        <p className="empty-subtitle">This takes a few moments.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <div className="empty-icon">
                                        <Users size={48} color="#cbd5e1" />
                                    </div>
                                    <div className="empty-text-container">
                                        <p className="empty-title">No results yet</p>
                                        <p className="empty-subtitle">Upload images and click analyze to detect and group people automatically.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </main>

            {/* Modal for full images */}
            <AnimatePresence>
                {selectedPerson && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="modal-backdrop"
                        onClick={() => setSelectedPerson(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="modal-content"
                        >
                            <div className="modal-header">
                                <div className="modal-person-info">
                                    <div className="modal-person-icon">
                                        <User size={28} color="var(--primary-blue, #2563eb)" />
                                    </div>
                                    <div>
                                        <h2 className="modal-person-name">{selectedPerson.personName}</h2>
                                        <p className="modal-person-count">
                                            Found in {selectedPerson.group.instances.length} photos
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="modal-actions">
                                    {selectedPerson.group.bibNumber && (
                                        <div className="modal-bib-badge">
                                            <span className="modal-bib-label">Bib</span>
                                            <span className="modal-bib-value">{selectedPerson.group.bibNumber}</span>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setSelectedPerson(null)}
                                        className="modal-close-btn"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="modal-body">
                                <div className="modal-gallery">
                                    {selectedPerson.group.instances.map((instance, idx) => {
                                        const sourceImage = images.find(img => img.id === instance.imageId);
                                        if (!sourceImage) return null;

                                        return (
                                            <div key={idx} className="gallery-item group">
                                                <img src={sourceImage.dataUrl} alt={`Appearance ${idx + 1}`} className="gallery-img" />
                                                
                                                {instance.faceBox && instance.faceBox.length === 4 && (
                                                    <div
                                                        className="face-box-overlay"
                                                        style={{
                                                            top: `${instance.faceBox[0] / 10}%`,
                                                            left: `${instance.faceBox[1] / 10}%`,
                                                            height: `${(instance.faceBox[2] - instance.faceBox[0]) / 10}%`,
                                                            width: `${(instance.faceBox[3] - instance.faceBox[1]) / 10}%`,
                                                        }}
                                                    />
                                                )}
                                                <div className="hover-tooltip">
                                                    Hover to highlight face
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            <style>{`
                .detector-container {
                    background: #f8fafc;
                    font-family: 'Inter', sans-serif;
                    border-radius: 16px;
                    overflow: hidden;
                    border: 1px solid #e2e8f0;
                    width: 100%;
                }

                .detector-header {
                    background: white;
                    border-bottom: 1px solid #e2e8f0;
                    padding: 1.5rem 2rem;
                }

                .header-content {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .header-icon {
                    background: var(--primary-blue, #2563eb);
                    padding: 0.5rem;
                    border-radius: 8px;
                    display: flex;
                }

                .header-title {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: #0f172a;
                    margin: 0;
                }

                .header-subtitle {
                    font-size: 0.875rem;
                    color: #64748b;
                    margin: 0;
                }

                .detector-main {
                    padding: 2rem;
                }

                .detector-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 2rem;
                }

                @media (min-width: 768px) {
                    .detector-grid {
                        grid-template-columns: 1fr 1fr;
                    }
                }

                .upload-column, .results-column {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                .step-section {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .step-title {
                    font-size: 1.125rem;
                    font-weight: 600;
                    color: #0f172a;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin: 0;
                }

                .step-badge {
                    background: #eff6ff;
                    color: var(--primary-blue, #2563eb);
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.875rem;
                    font-weight: 700;
                }

                .results-badge {
                    background: #dcfce7;
                    color: #166534;
                    padding: 0.25rem 0.75rem;
                    border-radius: 9999px;
                    font-size: 0.875rem;
                    font-weight: 600;
                }

                .upload-dropzone {
                    border: 2px dashed #cbd5e1;
                    border-radius: 16px;
                    padding: 2rem;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    min-height: 160px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background: white;
                }

                .upload-dropzone:hover {
                    border-color: var(--primary-blue, #2563eb);
                    background: #f8fafc;
                }

                .upload-instructions {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.5rem;
                }

                .upload-icon-container {
                    background: white;
                    padding: 0.75rem;
                    border-radius: 50%;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    border: 1px solid #f1f5f9;
                    margin-bottom: 0.5rem;
                }

                .upload-text-main {
                    font-weight: 600;
                    color: #334155;
                    margin: 0;
                }

                .upload-text-sub {
                    font-size: 0.875rem;
                    color: #64748b;
                    margin: 0;
                }

                .uploaded-preview-section {
                    background: white;
                    padding: 1rem;
                    border-radius: 16px;
                    border: 1px solid #e2e8f0;
                }

                .preview-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.75rem;
                }

                .preview-title {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: #475569;
                    margin: 0;
                }

                .clear-btn {
                    font-size: 0.75rem;
                    color: #ef4444;
                    background: none;
                    border: none;
                    cursor: pointer;
                }

                .clear-btn:hover {
                    text-decoration: underline;
                }

                .preview-row {
                    display: flex;
                    gap: 0.5rem;
                    overflow-x: auto;
                    padding-bottom: 0.5rem;
                }

                .preview-item {
                    position: relative;
                    width: 80px;
                    height: 80px;
                    flex-shrink: 0;
                    border-radius: 8px;
                    overflow: hidden;
                    border: 1px solid #e2e8f0;
                    background: #f1f5f9;
                }

                .preview-img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .preview-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(0,0,0,0.4);
                    opacity: 0;
                    transition: opacity 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .preview-item:hover .preview-overlay {
                    opacity: 1;
                }

                .remove-btn {
                    padding: 0.375rem;
                    background: #ef4444;
                    border: none;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                }

                .remove-btn:hover {
                    background: #dc2626;
                }

                .btn-content {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .spinner {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                .results-container {
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 16px;
                    padding: 1.5rem;
                    min-height: 400px;
                }

                .results-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
                    gap: 2rem;
                }

                .premium-person-card {
                    background: white;
                    border-radius: 20px;
                    border: 1px solid #f1f5f9;
                    padding: 1.5rem;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 10px 15px -3px rgba(0, 0, 0, 0.05);
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    width: 100%;
                }

                .premium-person-card:hover {
                    transform: translateY(-6px);
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                    border-color: #e2e8f0;
                }

                .card-section-header {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    width: 100%;
                }

                .section-header-title {
                    font-size: 0.825rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: #475569;
                }

                .check-icon-green {
                    color: #10b981;
                    fill: #ecfdf5;
                }

                .icon-gray {
                    color: #94a3b8;
                }

                .premium-thumbnail-wrapper {
                    position: relative;
                    width: 100%;
                    aspect-ratio: 1/1;
                    border-radius: 16px;
                    overflow: hidden;
                    border: 1px solid #f1f5f9;
                    background: #f8fafc;
                }

                .premium-photo-count-badge {
                    position: absolute;
                    bottom: 0.75rem;
                    right: 0.75rem;
                    background: rgba(15, 23, 42, 0.75);
                    backdrop-filter: blur(4px);
                    color: white;
                    font-size: 0.75rem;
                    font-weight: 600;
                    padding: 0.25rem 0.625rem;
                    border-radius: 9999px;
                }

                .premium-divider {
                    height: 1px;
                    background: #f1f5f9;
                    width: 100%;
                    margin: 0.25rem 0;
                }

                .premium-bib-value-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 4.5rem;
                }

                .premium-bib-number-text {
                    font-size: 3rem;
                    font-weight: 800;
                    color: #0f172a;
                    font-family: 'Outfit', 'Inter', sans-serif;
                    letter-spacing: -0.05em;
                    line-height: 1;
                }

                .premium-bib-missing-text {
                    font-size: 2.5rem;
                    font-weight: 700;
                    color: #cbd5e1;
                    letter-spacing: 0.1em;
                    line-height: 1;
                }

                .thumbnail-placeholder {
                    width: 100%;
                    height: 100%;
                    background: #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .empty-state {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 300px;
                    gap: 1rem;
                }

                .analyzing-indicator {
                    position: relative;
                }

                .pulse-ring {
                    position: absolute;
                    inset: -10px;
                    background: #dbeafe;
                    border-radius: 50%;
                    filter: blur(10px);
                    animation: pulse 2s infinite;
                }

                @keyframes pulse {
                    0% { opacity: 0.5; transform: scale(0.8); }
                    50% { opacity: 1; transform: scale(1.2); }
                    100% { opacity: 0.5; transform: scale(0.8); }
                }

                .spinner-container {
                    background: white;
                    padding: 1rem;
                    border-radius: 50%;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    position: relative;
                    z-index: 10;
                }

                .empty-icon {
                    background: #f8fafc;
                    padding: 1.5rem;
                    border-radius: 50%;
                }

                .empty-text-container {
                    text-align: center;
                }

                .empty-title {
                    font-size: 1.125rem;
                    font-weight: 500;
                    color: #1e293b;
                    margin: 0;
                }

                .empty-subtitle {
                    font-size: 0.875rem;
                    color: #64748b;
                    margin: 0.25rem 0 0;
                    max-width: 250px;
                }

                .modal-backdrop {
                    position: fixed;
                    inset: 0;
                    z-index: 9999;
                    background: rgba(0,0,0,0.8);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1.5rem;
                }

                .modal-content {
                    background: white;
                    border-radius: 24px;
                    width: 100%;
                    max-width: 1100px;
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
                }

                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1.5rem 2rem;
                    border-bottom: 1px solid #f1f5f9;
                    background: white;
                    z-index: 10;
                }

                .modal-person-info {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .modal-person-icon {
                    background: #eff6ff;
                    padding: 0.75rem;
                    border-radius: 16px;
                }

                .modal-person-name {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #0f172a;
                    margin: 0;
                }

                .modal-person-count {
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: #64748b;
                    margin: 0;
                }

                .modal-actions {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                }

                .modal-bib-badge {
                    background: #fefce8;
                    border: 1px solid #fef08a;
                    padding: 0.5rem 1rem;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .modal-bib-label {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #a16207;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                }

                .modal-bib-value {
                    font-size: 1.25rem;
                    font-family: monospace;
                    font-weight: 900;
                    color: #713f12;
                }

                .modal-close-btn {
                    padding: 0.5rem;
                    background: #f1f5f9;
                    color: #475569;
                    border: none;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    transition: all 0.2s;
                }

                .modal-close-btn:hover {
                    background: #e2e8f0;
                    color: #0f172a;
                }

                .modal-body {
                    padding: 1.5rem;
                    overflow-y: auto;
                    background: #f8fafc;
                    flex: 1;
                }

                .modal-gallery {
                    column-count: 1;
                    column-gap: 1.5rem;
                }

                @media (min-width: 640px) { .modal-gallery { column-count: 2; } }
                @media (min-width: 1024px) { .modal-gallery { column-count: 3; } }

                .gallery-item {
                    background: white;
                    border-radius: 16px;
                    border: 1px solid #e2e8f0;
                    overflow: hidden;
                    margin-bottom: 1.5rem;
                    break-inside: avoid;
                    position: relative;
                }

                .gallery-img {
                    width: 100%;
                    height: auto;
                    display: block;
                }

                .face-box-overlay {
                    position: absolute;
                    border: 2px solid #34d399;
                    border-radius: 4px;
                    background: rgba(52, 211, 153, 0.2);
                    box-shadow: 0 0 0 9999px rgba(0,0,0,0.4);
                    opacity: 0;
                    transition: opacity 0.3s;
                    pointer-events: none;
                }

                .gallery-item:hover .face-box-overlay {
                    opacity: 1;
                }

                .hover-tooltip {
                    position: absolute;
                    bottom: 0.75rem;
                    left: 0.75rem;
                    background: rgba(0,0,0,0.6);
                    backdrop-filter: blur(4px);
                    color: white;
                    font-size: 0.75rem;
                    padding: 0.25rem 0.5rem;
                    border-radius: 6px;
                    opacity: 0;
                    transition: opacity 0.3s;
                    pointer-events: none;
                }

                .gallery-item:hover .hover-tooltip {
                    opacity: 1;
                }

                .custom-scrollbar::-webkit-scrollbar {
                    height: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #cbd5e1;
                    border-radius: 20px;
                }
            `}</style>
        </div>
    );
}
