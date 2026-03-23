import React, { useState, useEffect } from 'react';
import { Sparkles, Image as ImageIcon, ArrowRight, Loader2, Download, RefreshCw, Camera, Upload, Globe, User, Save, RotateCcw, Heart, Shield, Activity } from 'lucide-react';
import { generateImageWithReference, fileToGenerativePart } from '../services/geminiService';

export const GenerateNewProduct: React.FC = () => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Step 1: Upload Reference
    const DEFAULT_SKETCH = "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=2000"; // Gourmet Kitchen background
    const [sketchImage, setSketchImage] = useState<string | null>(null);

    // Step 2: Concepts
    const [variations, setVariations] = useState<string[]>([]);
    const [selectedVariation, setSelectedVariation] = useState<string | null>(null);

    // Step 3: Final Assets
    const [marketingImages, setMarketingImages] = useState<string[]>([]);
    const [lifestyleImages, setLifestyleImages] = useState<string[]>([]);

    useEffect(() => {
        if (!sketchImage) {
            setSketchImage(DEFAULT_SKETCH);
        }
    }, []);

    const loadLastState = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/load-run/gen-product');
            if (res.ok) {
                const data = await res.json();
                if (data) {
                    if (data.variations && data.variations.length > 0) {
                        setStep(2);
                    } else {
                        setStep(data.step || 1);
                    }
                    if (data.sketchImage) setSketchImage(data.sketchImage);
                    if (data.variations) setVariations(data.variations);
                    if (data.selectedVariation) setSelectedVariation(data.selectedVariation);
                    if (data.globalImages) setMarketingImages(data.globalImages);
                    if (data.lifestyleImages) setLifestyleImages(data.lifestyleImages);
                    alert('Loaded last session!');
                }
            } else {
                alert('No saved session found.');
            }
        } catch (error) {
            console.error("Failed to load state", error);
            alert("Failed to load session.");
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const base64 = await fileToGenerativePart(file);
                setSketchImage(`data:${file.type};base64,${base64}`);
                setVariations([]);
                setSelectedVariation(null);
                setMarketingImages([]);
                setLifestyleImages([]);
                setStep(1);
            } catch (error) {
                console.error("Failed to read file", error);
            }
        }
    };

    const handleGenerateVariations = async () => {
        if (!sketchImage) return;
        setLoading(true);
        setVariations([]);

        let imageBase64 = sketchImage;
        if (sketchImage.startsWith('http') || sketchImage.startsWith('/')) {
            try {
                const response = await fetch(sketchImage);
                const blob = await response.blob();
                imageBase64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                });
            } catch (e) {
                console.error("Failed to convert default image to base64", e);
                setLoading(false);
                return;
            }
        }

        const themes = [
            "Elegant Culinary & Dining Experience",
            "Modern Minimalist Home Decor",
            "Premium Electronics Showcase",
            "Luxury Beauty & Wellness Collection",
            "Cozy Outdoor Living Space",
            "Curated Fashion & Accessories"
        ];

        try {
            const promises = themes.map(theme =>
                generateImageWithReference(
                    `Create a high-quality marketing visual based on this reference. Theme: ${theme}. Style: Professional retail marketing, premium quality, elegant, aspirational. High resolution.`,
                    imageBase64.split(',')[1]
                )
            );

            const results = await Promise.all(promises);
            const validResults = results.filter(r => r !== null).map(r => `data:image/jpeg;base64,${r}`);
            setVariations(validResults);
            setStep(2);

            // Auto-save
            await fetch('/api/save-run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    featureId: 'gen-product',
                    data: {
                        step: 2,
                        sketchImage,
                        variations: validResults,
                        timestamp: new Date().toISOString()
                    }
                })
            });

        } catch (error) {
            console.error("Failed to generate variations", error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateShowcase = async () => {
        if (!selectedVariation) return;
        setLoading(true);
        setMarketingImages([]);
        setLifestyleImages([]);

        const formats = [
            "as a hero image on a premium retail website",
            "as a lifestyle magazine spread",
            "on a mobile shopping app screen",
            "on a digital billboard in a high-end shopping district",
            "as a social media card with 'Today's Special Value' text overlay",
            "as a gourmet cooking app interface"
        ];

        const people = [
            "a home chef preparing a meal",
            "a family enjoying a movie night",
            "an active individual using high-end tech",
            "a group of friends at a dinner party",
            "someone pampering themselves with luxury beauty products",
            "a stylish person using premium accessories"
        ];

        try {
            // Marketing Assets
            const marketingPromises = formats.map(fmt =>
                generateImageWithReference(
                    `Professional marketing mockup of this design ${fmt}. High quality, photorealistic, clean lighting.`,
                    selectedVariation.split(',')[1]
                )
            );

            // Lifestyle Imagery
            const lifestylePromises = people.map(person =>
                generateImageWithReference(
                    `Lifestyle photography of ${person}, incorporating the color palette and mood of this design reference. Authentic, aspirational, balanced lighting, high quality retail marketing usage.`,
                    selectedVariation.split(',')[1]
                )
            );

            const [marketingResults, lifestyleResults] = await Promise.all([
                Promise.all(marketingPromises),
                Promise.all(lifestylePromises)
            ]);

            const validMarketing = marketingResults.filter(r => r !== null).map(r => `data:image/jpeg;base64,${r}`);
            const validLifestyle = lifestyleResults.filter(r => r !== null).map(r => `data:image/jpeg;base64,${r}`);

            setMarketingImages(validMarketing);
            setLifestyleImages(validLifestyle);
            setStep(3);

            // Auto-save
            await fetch('/api/save-run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    featureId: 'gen-product',
                    data: {
                        step: 3,
                        sketchImage,
                        variations,
                        selectedVariation,
                        globalImages: validMarketing,
                        lifestyleImages: validLifestyle,
                        timestamp: new Date().toISOString()
                    }
                })
            });

        } catch (error) {
            console.error("Failed to generate showcase", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="page-title mb-2">Campaign Asset Generator</h1>
                    <p className="page-subtitle">Upload a concept or reference, and generate professional retail marketing assets.</p>
                </div>

                <button
                    onClick={loadLastState}
                    className="btn-secondary flex items-center gap-2"
                    title="Load previous session"
                >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <RotateCcw size={16} />}
                    Load Last
                </button>
            </div>

            {/* Progress Steps */}
            <div className="flex justify-between mb-12 relative">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -z-10 transform -translate-y-1/2"></div>
                {["Upload Reference", "Generate Concepts", "Final Assets"].map((label, idx) => {
                    const s = idx + 1;
                    let isClickable = false;
                    if (s === 1) isClickable = true;
                    if (s === 2 && variations.length > 0) isClickable = true;
                    if (s === 3 && marketingImages.length > 0) isClickable = true;

                    return (
                        <button
                            key={s}
                            onClick={() => isClickable && setStep(s)}
                            disabled={!isClickable}
                            className={`flex flex-col items-center gap-2 transition-opacity ${step >= s ? 'opacity-100' : 'opacity-40'} ${isClickable ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed'}`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 transition-colors ${step >= s ? 'bg-[#0077C8] border-white text-white' : 'bg-gray-200 border-gray-100 text-gray-500'}`}>
                                {s}
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Step 1: Upload Sketch */}
            {step === 1 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="content-card max-w-2xl mx-auto text-center p-12">
                        <h3 className="section-header justify-center mb-6">Upload Reference Visual</h3>

                        {!sketchImage ? (
                            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-12 hover:border-[#0077C8] transition-colors bg-gray-50 group">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    id="sketch-upload"
                                />
                                <label htmlFor="sketch-upload" className="cursor-pointer flex flex-col items-center gap-4">
                                    <div className="p-4 bg-white rounded-full group-hover:bg-blue-50 transition-colors shadow-sm border border-gray-100">
                                        <Upload size={32} className="text-[#0077C8]" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-bold text-lg text-heading">Click to Upload or Drag & Drop</p>
                                        <p className="text-subtext text-sm">Support for PNG, JPG (Max 10MB)</p>
                                    </div>
                                </label>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="relative inline-block group">
                                    <img src={sketchImage} alt="Uploaded Sketch" className="max-h-[400px] rounded-xl shadow-2xl mx-auto" />
                                    <div className="absolute top-4 right-4 flex gap-2">
                                        <button
                                            onClick={() => {
                                                setSketchImage(null);
                                            }}
                                            className="bg-white/80 p-2 rounded-full text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 shadow-sm backdrop-blur-sm"
                                            title="Clear Image"
                                        >
                                            <RefreshCw size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex justify-center gap-4">
                                    <label htmlFor="sketch-upload-replace" className="btn-secondary cursor-pointer flex items-center gap-2">
                                        <Upload size={18} /> Replace
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                            id="sketch-upload-replace"
                                        />
                                    </label>

                                    <button
                                        onClick={handleGenerateVariations}
                                        disabled={loading}
                                        className="btn-primary flex items-center justify-center gap-3 px-8 py-3 text-lg min-w-[200px]"
                                    >
                                        {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
                                        Generate Concepts
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Step 2: Variations */}
            {step === 2 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="section-header">Select Concept Direction</h3>
                        <button onClick={() => setStep(1)} className="btn-ghost text-sm underline">Back to Upload</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {variations.length > 0 ? (
                            variations.map((img, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => setSelectedVariation(img)}
                                    className={`content-card p-2 cursor-pointer transition-all border-2 group relative ${selectedVariation === img ? 'border-[#0077C8] ring-4 ring-[#0077C8]/10' : 'border-transparent'}`}
                                >
                                    <img src={img} alt={`Variation ${idx}`} className="w-full rounded-lg" />

                                    <div className="absolute top-4 left-4 badge badge-gray opacity-0 group-hover:opacity-100 transition-opacity">
                                        Concept {idx + 1}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-3 text-center py-20 text-subtext">
                                Generating concepts...
                            </div>
                        )}
                    </div>

                    {variations.length > 0 && (
                        <div className="flex justify-center sticky bottom-6 z-20">
                            <button
                                onClick={handleGenerateShowcase}
                                disabled={!selectedVariation || loading}
                                className="btn-primary px-8 py-4 rounded-full flex items-center gap-3 text-lg shadow-xl"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <Globe size={20} />}
                                Generate Campaign Assets
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Step 3: Showcase */}
            {step === 3 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-12">
                    <div className="flex justify-between items-center">
                        <h3 className="section-header">Final Campaign Assets</h3>
                        <button onClick={() => setStep(2)} className="btn-ghost text-sm underline">Back to Concepts</button>
                    </div>

                    {/* Marketing Mockups */}
                    <section>
                        <h4 className="section-header text-xl mb-4 flex items-center gap-2">
                            <Shield className="text-[#0077C8]" />
                            Marketing Collateral
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {marketingImages.length > 0 ? marketingImages.map((img, idx) => (
                                <div key={idx} className="content-card p-0 overflow-hidden group">
                                    <div className="relative aspect-square">
                                        <img src={img} alt={`Marketing ${idx}`} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <a href={img} download={`marketing_${idx}.png`} className="p-3 bg-white rounded-full text-black hover:scale-110 transition-transform">
                                                <Download size={24} />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                Array(6).fill(0).map((_, i) => (
                                    <div key={i} className="aspect-square bg-gray-100 rounded-xl animate-pulse"></div>
                                ))
                            )}
                        </div>
                    </section>

                    {/* Lifestyle Imagery */}
                    <section>
                        <h4 className="section-header text-xl mb-4 flex items-center gap-2">
                            <Heart className="text-[#0077C8]" />
                            Lifestyle & Trust
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {lifestyleImages.length > 0 ? lifestyleImages.map((img, idx) => (
                                <div key={idx} className="content-card p-0 overflow-hidden group">
                                    <div className="relative aspect-square">
                                        <img src={img} alt={`Lifestyle ${idx}`} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <a href={img} download={`lifestyle_${idx}.png`} className="p-3 bg-white rounded-full text-black hover:scale-110 transition-transform">
                                                <Download size={24} />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                Array(6).fill(0).map((_, i) => (
                                    <div key={i} className="aspect-square bg-gray-100 rounded-xl animate-pulse"></div>
                                ))
                            )}
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
};
