import React, { useState, useEffect } from 'react';
import { Upload, Loader2, Download, Image as ImageIcon, ArrowLeft, Eye, RotateCcw } from 'lucide-react';
import { generateImageWithReference } from '../services/geminiService';
import { brandConfig } from '../config';

export const MultiImage: React.FC = () => {
    const [step, setStep] = useState(1);
    const [selectedImage, setSelectedImage] = useState<string | null>('/images/multi_image_healthcare.png');

    // Helper to convert default image path to base64 on mount if needed, 
    // but MultiImage logic handles src strings fine for display.
    // However, the generation logic expects base64 or a valid URL it can fetch. 
    // Let's ensure it handles the local path or auto-converts.
    // Actually, looking at handleGenerate: `const base64Clean = selectedImage.split(',')[1] || selectedImage;`
    // If it's a path, it might fail if the API expects raw base64. 
    // let's add an effect to load it.

    useEffect(() => {
        if (selectedImage === '/images/multi_image_healthcare.png' && !selectedImage.startsWith('data:')) {
            fetch(selectedImage)
                .then(r => r.blob())
                .then(blob => {
                    const reader = new FileReader();
                    reader.onloadend = () => setSelectedImage(reader.result as string);
                    reader.readAsDataURL(blob);
                })
                .catch(e => console.error("Failed to load default image", e));
        }
    }, []);
    const [loading, setLoading] = useState(false);
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    useEffect(() => {
        if (generatedImages.length > 0) {
            fetch('/api/save-run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    featureId: 'multi_image',
                    data: { selectedImage, generatedImages, step: 2 }
                })
            }).catch(err => console.error("Failed to save multi-image run:", err));
        }
    }, [generatedImages, selectedImage]);

    const handleLoadLast = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/load-run/multi_image');
            if (!res.ok) throw new Error("No saved run");
            const data = await res.json();
            if (data.selectedImage) setSelectedImage(data.selectedImage);
            if (data.generatedImages) {
                setGeneratedImages(data.generatedImages);
                setStep(2);
            }
        } catch (e) {
            console.warn("Load error:", e);
            alert("No saved run found.");
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                setSelectedImage(base64);
                setGeneratedImages([]);
                setError(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerate = async () => {
        if (!selectedImage) return;

        setLoading(true);
        setError(null);
        setGeneratedImages([]);

        try {
            const base64Clean = selectedImage.split(',')[1] || selectedImage;

            const variations = [
                { setting: 'Running Track', style: 'Athletic', description: 'red rubber running track, white lines, stadium background, dynamic action lighting' },
                { setting: 'Urban Street', style: 'Lifestyle', description: 'city street at dawn, asphalt texture, blurred city lights, energetic morning lighting' },
                { setting: 'Nature Trail', style: 'Outdoors', description: 'dirt trail in a forest, dappled sunlight through trees, natural earthy tones' },
                { setting: 'Locker Room', style: 'Pre-Game', description: 'clean locker room bench, athletic bag nearby, warm lighting' },
                { setting: 'Gym Setting', style: 'Active', description: 'gym bag nearby, water bottle, blurred gym equipment, energetic lighting' },
                { setting: 'Start Line', style: 'Competition', description: 'starting line of a race, bright daylight, focused tension' },
                { setting: 'Travel Case', style: 'On-the-go', description: 'open travel bag, organized compartments, passport hint, natural light' },
                { setting: 'Living Room', style: 'Morning Routine', description: 'stretching mat, foam roller, morning sunlight streaming in' },
                { setting: 'Abstract Speed', style: 'Futuristic', description: 'motion blur streaks, aerodynamic lines, neon glowing accents, speed theme' }
            ];

            const generateVariant = async (variation: { setting: string, style: string, description: string }) => {
                const prompt = `A professional healthcare photograph of the provided scenario in a ${variation.setting}.  
                The style is ${variation.style}. 
                Setting details: ${variation.description}. 
                
                The focal point is the product from the reference image.
                It must be perfectly integrated into the scene with correct lighting and shadows.
                
                The branding and label from the reference image must be perfectly preserved and clearly visible. 
                16:9 aspect ratio, high resolution, commercial photography quality.`;

                return await generateImageWithReference(prompt, base64Clean);
            };

            setStep(2);

            const results = await Promise.all(variations.map(v => generateVariant(v)));
            const validImages = results.filter(img => img !== null) as string[];
            const formattedImages = validImages.map(img => img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}`);

            setGeneratedImages(formattedImages);
        } catch (err) {
            console.error(err);
            setError('Failed to generate images. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="section-header">Multi-Image Generator</h2>
            </div>

            {step === 1 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 min-h-[600px] flex flex-col justify-center max-w-2xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                            <ImageIcon size={24} className="text-gray-500" /> Source Image
                        </h3>
                        <button
                            onClick={handleLoadLast}
                            className="text-gray-500 hover:text-blue-600 font-medium flex items-center gap-2"
                            title="Replay last run"
                        >
                            <RotateCcw size={16} /> Load Last Run
                        </button>
                    </div>

                    <div className="space-y-8">
                        {!selectedImage ? (
                            <label className="flex flex-col items-center justify-center w-full h-80 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 hover:border-blue-500 transition-all bg-white group shadow-sm">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <div className="bg-gray-100 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
                                        <Upload className="w-10 h-10 text-blue-600" />
                                    </div>
                                    <p className="mb-2 text-lg text-gray-900 font-medium">Upload a Product Image</p>
                                    <p className="text-sm text-gray-500">Click to browse or drag and drop</p>
                                </div>
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </label>
                        ) : (
                            <div className="space-y-6">
                                <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white h-80 flex items-center justify-center group">
                                    <img src={selectedImage} alt="Upload" className="max-w-full max-h-full object-contain" />
                                    <button
                                        onClick={() => { setSelectedImage(null); setGeneratedImages([]); }}
                                        className="absolute top-4 right-4 bg-white p-2 rounded-full text-gray-500 hover:text-red-500 shadow-md transition-colors border border-gray-200 opacity-0 group-hover:opacity-100"
                                        title="Remove image"
                                    >
                                        ✕
                                    </button>
                                </div>
                                <button
                                    onClick={handleGenerate}
                                    disabled={loading}
                                    className={`w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 text-lg`}
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : <><ImageIcon size={20} /> Generate 9 Variations</>}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="animate-fadeIn">
                    <button
                        onClick={() => setStep(1)}
                        className="flex items-center gap-2 text-gray-500 hover:text-blue-600 font-semibold mb-6 transition-colors"
                    >
                        <ArrowLeft size={20} /> Back to Upload
                    </button>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 min-h-[600px]">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="section-header">Generated Variations (16:9)</h3>
                            {loading && (
                                <div className="flex items-center gap-2 text-red-600 font-medium animate-pulse">
                                    <Loader2 className="animate-spin" size={18} /> Generating High-Res Images...
                                </div>
                            )}
                        </div>

                        {loading && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                                    <div key={i} className="aspect-video bg-gray-100 rounded-xl animate-pulse border border-gray-200 flex items-center justify-center">
                                        <ImageIcon className="text-gray-300" size={48} />
                                    </div>
                                ))}
                            </div>
                        )}

                        {!loading && error && (
                            <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 font-medium text-center">
                                {error}
                            </div>
                        )}

                        {!loading && generatedImages.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {generatedImages.map((img, idx) => (
                                    <div key={idx} className="aspect-video bg-white rounded-xl overflow-hidden shadow-sm relative group border border-gray-200 hover:shadow-lg transition-all transform hover:-translate-y-1">
                                        <img src={img} alt={`Variation ${idx + 1}`} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                            <button
                                                onClick={() => setPreviewImage(img)}
                                                className="bg-white text-gray-900 px-4 py-2 rounded-full font-bold shadow-lg hover:bg-gray-100 transition-colors flex items-center gap-2 transform scale-90 group-hover:scale-100 duration-200"
                                            >
                                                <Eye size={18} /> Preview
                                            </button>
                                            <a
                                                href={img}
                                                download={`nike_variant_${idx + 1}.jpg`}
                                                className="bg-white text-gray-900 px-4 py-2 rounded-full font-bold shadow-lg hover:bg-gray-100 transition-colors flex items-center gap-2 transform scale-90 group-hover:scale-100 duration-200"
                                            >
                                                <Download size={18} /> Download
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
