import React, { useState, useRef, useCallback } from 'react';
import { Upload, Image as ImageIcon, Loader2, User, CheckCircle2, XCircle, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../ui/Button';

// Initialize API key from Vite environment variables for OpenRouter
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_OPENROUTER_API_KEY || '';

export default function RunnerDetector() {
    const [images, setImages] = useState([]);
    const [runners, setRunners] = useState([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [selectedBib, setSelectedBib] = useState(null);
    const fileInputRef = useRef(null);

    const groupedRunners = React.useMemo(() => {
        const groups = {};
        runners.forEach(r => {
            if (!groups[r.bibNumber]) groups[r.bibNumber] = [];
            groups[r.bibNumber].push(r);
        });
        return groups;
    }, [runners]);

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
        setRunners(prev => prev.filter(runner => runner.imageId !== id));
    };

    const cropFace = (imageSrc, box) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return resolve('');

                const [ymin, xmin, ymax, xmax] = box;

                const sx = (xmin / 1000) * img.width;
                const sy = (ymin / 1000) * img.height;
                const sw = ((xmax - xmin) / 1000) * img.width;
                const sh = ((ymax - ymin) / 1000) * img.height;

                const paddingX = sw * 0.3;
                const paddingY = sh * 0.3;

                const finalSx = Math.max(0, sx - paddingX);
                const finalSy = Math.max(0, sy - paddingY);
                const finalSw = Math.min(img.width - finalSx, sw + paddingX * 2);
                const finalSh = Math.min(img.height - finalSy, sh + paddingY * 2);

                canvas.width = finalSw;
                canvas.height = finalSh;

                ctx.drawImage(img, finalSx, finalSy, finalSw, finalSh, 0, 0, finalSw, finalSh);
                resolve(canvas.toDataURL('image/jpeg'));
            };
            img.src = imageSrc;
        });
    };

    const analyzeImages = async () => {
        const pendingImages = images.filter(img => img.status === 'pending' || img.status === 'error');
        if (pendingImages.length === 0) return;

        if (!apiKey) {
            alert("Missing VITE_GEMINI_API_KEY environment variable. AI won't run.");
            return;
        }

        setIsAnalyzing(true);

        for (const image of pendingImages) {
            setImages(prev => prev.map(img => img.id === image.id ? { ...img, status: 'analyzing', error: undefined } : img));
            try {
                const mimeType = image.dataUrl.split(';')[0].split(':')[1] || 'image/jpeg';
                const base64Str = image.dataUrl.split(',')[1];

                const payload = {
                    contents: [
                        {
                            role: "user",
                            parts: [
                                {
                                    text: "Analyze this image of runners. Detect ONLY runners where BOTH their face AND their bib number are clearly visible and legible. For each such runner, find their face and their bib number. Return the bounding box of their face as [ymin, xmin, ymax, xmax] where each value is an integer between 0 and 1000 representing the relative position. Do NOT include runners if their bib number is obscured, blurry, or unreadable. Do NOT use 'Unknown'. Ensure you associate the correct bib number with the correct face. You MUST return exactly a JSON array of objects, where each object has 'bibNumber' (string) and 'faceBox' (array of 4 integers)."
                                },
                                {
                                    inline_data: {
                                        mime_type: mimeType,
                                        data: base64Str
                                    }
                                }
                            ]
                        }
                    ]
                };

                const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errText = await response.text();
                    throw new Error(`Gemini API error: ${response.status} - ${errText}`);
                }

                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

                if (!text) throw new Error("No response from AI");

                let detectedRunners = [];
                try {
                    const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                    let parsed;

                    try {
                        parsed = JSON.parse(cleanedText);
                    } catch (parseErr) {
                        console.warn("JSON parse failed. Attempting to extract valid objects...", parseErr);
                        // Extract any fully formed JSON objects if the response was truncated
                        const objectMatches = cleanedText.match(/\{[^{}]*?"bibNumber"[^{}]*?\}/g);
                        if (objectMatches && objectMatches.length > 0) {
                            parsed = objectMatches.map(m => {
                                try { return JSON.parse(m); } catch (e) { return null; }
                            }).filter(Boolean);
                            if (!parsed.length) throw parseErr;
                        } else {
                            throw parseErr; // Cannot salvage anything
                        }
                    }

                    if (Array.isArray(parsed)) {
                        detectedRunners = parsed;
                    } else if (parsed && typeof parsed === 'object') {
                        const arrayKey = Object.keys(parsed).find(k => Array.isArray(parsed[k]));
                        if (arrayKey) {
                            detectedRunners = parsed[arrayKey];
                        } else {
                            detectedRunners = [parsed];
                        }
                    }

                    detectedRunners = detectedRunners.filter(r =>
                        r.bibNumber &&
                        String(r.bibNumber).toLowerCase() !== 'unknown' &&
                        String(r.bibNumber).toLowerCase() !== 'n/a'
                    );
                } catch (parseErr) {
                    throw new Error("Failed to parse JSON response: " + text);
                }

                const runnersWithCrops = await Promise.all(
                    detectedRunners.map(async (runner) => {
                        let croppedFaceUrl = undefined;
                        if (runner.faceBox && runner.faceBox.length === 4) {
                            croppedFaceUrl = await cropFace(image.dataUrl, runner.faceBox);
                        }
                        return {
                            ...runner,
                            id: Math.random().toString(36).substring(7),
                            imageId: image.id,
                            croppedFaceUrl
                        };
                    })
                );

                setRunners(prev => [...prev, ...runnersWithCrops]);
                setImages(prev => prev.map(img => img.id === image.id ? { ...img, status: 'done' } : img));
            } catch (err) {
                console.error(err);
                setImages(prev => prev.map(img => img.id === image.id ? { ...img, status: 'error', error: err.message || "Failed to analyze" } : img));
            }
        }
        setIsAnalyzing(false);
    };

    const pendingCount = images.filter(img => img.status === 'pending' || img.status === 'error').length;

    return (
        <div className="bg-neutral-50 text-neutral-900 font-sans h-full w-full rounded-2xl overflow-hidden shadow-sm border border-neutral-200">
            <header className="bg-white border-b border-neutral-200 px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-500 p-2 rounded-lg text-white">
                        <User size={24} />
                    </div>
                    <h1 className="text-xl font-semibold tracking-tight">Runner Bib & Face Detector</h1>
                </div>
            </header>

            <main className="p-6 space-y-8">
                <section className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <h2 className="text-lg font-medium">1. Upload Images</h2>
                            <div
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onClick={() => fileInputRef.current?.click()}
                                className={`
                                    border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors
                                    flex flex-col items-center justify-center min-h-[160px]
                                    border-neutral-300 hover:border-emerald-400 hover:bg-neutral-100 bg-white
                                `}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImageUpload}
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                />
                                <div className="space-y-2 text-neutral-500">
                                    <div className="bg-neutral-50 p-3 rounded-full shadow-sm inline-block border border-neutral-100">
                                        <Upload size={24} className="text-emerald-500" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-neutral-700">Click to upload or drag and drop</p>
                                        <p className="text-sm">Upload multiple images at once</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {images.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-medium text-neutral-700">Uploaded Images ({images.length})</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    <AnimatePresence>
                                        {images.map(img => (
                                            <motion.div
                                                key={img.id}
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                className="relative aspect-square rounded-lg overflow-hidden border border-neutral-200 group bg-neutral-100"
                                            >
                                                <img src={img.dataUrl} className="w-full h-full object-cover" alt="Uploaded" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                                                        className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-sm"
                                                        title="Remove image"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                                <div className="absolute top-1.5 right-1.5">
                                                    {img.status === 'pending' && <div className="w-3.5 h-3.5 rounded-full bg-neutral-400 border-2 border-white shadow-sm" title="Pending" />}
                                                    {img.status === 'analyzing' && <Loader2 size={16} className="text-blue-500 animate-spin drop-shadow-md" />}
                                                    {img.status === 'done' && <CheckCircle2 size={16} className="text-emerald-500 bg-white rounded-full shadow-sm" />}
                                                    {img.status === 'error' && <XCircle size={16} className="text-red-500 bg-white rounded-full shadow-sm" title={img.error} />}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>
                        )}

                        <Button
                            onClick={analyzeImages}
                            disabled={pendingCount === 0 || isAnalyzing}
                            variant="primary"
                            className="w-full flex items-center justify-center gap-2"
                        >
                            {isAnalyzing ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    Analyzing Images...
                                </>
                            ) : (
                                <>
                                    <ImageIcon size={20} />
                                    {pendingCount > 0 ? `Detect Faces & Bibs (${pendingCount})` : 'All Images Analyzed'}
                                </>
                            )}
                        </Button>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-lg font-medium flex items-center justify-between">
                            <span>2. Detected Runners</span>
                            {Object.keys(groupedRunners).length > 0 && (
                                <span className="text-sm bg-neutral-200 text-neutral-700 px-2.5 py-1 rounded-full font-medium">
                                    {Object.keys(groupedRunners).length} unique
                                </span>
                            )}
                        </h2>

                        <div className="bg-white border border-neutral-200 rounded-2xl p-6 min-h-[300px]">
                            {Object.keys(groupedRunners).length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    <AnimatePresence>
                                        {Object.entries(groupedRunners).map(([bibNumber, instances]) => (
                                            <motion.div
                                                key={bibNumber}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                onClick={() => setSelectedBib(bibNumber)}
                                                className="bg-neutral-50 border border-neutral-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col cursor-pointer group"
                                            >
                                                <div className="aspect-square bg-neutral-200 relative overflow-hidden">
                                                    {instances[0].croppedFaceUrl ? (
                                                        <img
                                                            src={instances[0].croppedFaceUrl}
                                                            alt={`Runner ${bibNumber}`}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-neutral-400">
                                                            <User size={32} />
                                                        </div>
                                                    )}
                                                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-md">
                                                        {instances.length} {instances.length === 1 ? 'photo' : 'photos'}
                                                    </div>
                                                </div>
                                                <div className="p-3 text-center border-t border-neutral-200 bg-white flex-1 flex flex-col justify-center">
                                                    <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold mb-1">Bib Number</p>
                                                    <p className="text-lg font-mono font-bold text-neutral-900 leading-none">
                                                        {bibNumber}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            ) : images.length > 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-neutral-400 space-y-3 min-h-[250px]">
                                    {isAnalyzing ? (
                                        <>
                                            <Loader2 className="animate-spin text-emerald-500" size={40} />
                                            <p>Scanning images for runners...</p>
                                        </>
                                    ) : (
                                        <>
                                            <User size={48} className="opacity-50" />
                                            <p>Click "Detect Faces & Bibs" to start</p>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-neutral-400 space-y-3 min-h-[250px]">
                                    <ImageIcon size={48} className="opacity-50" />
                                    <p>Upload images to see results</p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </main>

            <AnimatePresence>
                {selectedBib && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setSelectedBib(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-neutral-200">
                                <div>
                                    <h2 className="text-2xl font-bold font-mono text-neutral-900">Runner {selectedBib}</h2>
                                    <p className="text-sm text-neutral-500 mt-1">
                                        Found in {groupedRunners[selectedBib]?.length} {groupedRunners[selectedBib]?.length === 1 ? 'image' : 'images'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedBib(null)}
                                    className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-full transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto bg-neutral-50 flex-1">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {groupedRunners[selectedBib]?.map((instance) => {
                                        const sourceImage = images.find(img => img.id === instance.imageId);
                                        if (!sourceImage) return null;

                                        return (
                                            <div key={instance.id} className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
                                                <div className="relative">
                                                    <img src={sourceImage.dataUrl} alt="Full view" className="w-full h-auto" />
                                                    <div
                                                        className="absolute border-2 border-emerald-500 rounded-sm bg-emerald-500/20"
                                                        style={{
                                                            top: `${instance.faceBox[0] / 10}%`,
                                                            left: `${instance.faceBox[1] / 10}%`,
                                                            height: `${(instance.faceBox[2] - instance.faceBox[0]) / 10}%`,
                                                            width: `${(instance.faceBox[3] - instance.faceBox[1]) / 10}%`,
                                                        }}
                                                    />
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
        </div>
    );
}
