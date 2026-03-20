import React, { useState, useEffect } from 'react';
import { ShoppingCart, Search as SearchIcon, Menu, Star, Heart, User, Plus, Trash2, Check, Sparkles, Globe, ShoppingBag, Briefcase } from 'lucide-react';
import { generatePersonalizedPDPContent, generateLifestyleScene } from '../services/geminiService';
import { brandConfig } from '../config';

interface Audience {
    id: string;
    name: string;
    whyPerfect: string;
    description: string;
    image: string; // URL or Base64
    isDefault?: boolean;
}

const DEFAULT_PRODUCT_NAME = "LOGO by Lori Goldstein Regular Cotton Patchwork Print Midi Dress";
const DEFAULT_PRICE = "$40.99";
// Remote URL for high quality image, fallback to local if needed
const DEFAULT_IMAGE_PATH = "/images/qvc-pdp.png";

const DEFAULT_AUDIENCES: Audience[] = [
    {
        id: 'default_standard',
        name: 'Standard View',
        whyPerfect: 'Let your love for lively prints take center stage at everything from afternoon brunches to garden soirees in this soft cotton patchwork dress. Elbow-length sleeves and a classic boat neckline lend timeless appeal, while handy pockets keep essentials close as you mingle and catch up with friends. From LOGO by Lori Goldstein®.',
        description: 'Quality and comfort designed for your peace of mind and overall wellbeing.',
        image: DEFAULT_IMAGE_PATH,
        isDefault: true
    },
    {
        id: 'default_skeptic',
        name: 'The Practical Shopper',
        whyPerfect: 'Tailored perfectly for those who want comfort and convenience without sacrificing style.',
        description: 'Focuses on the 100% cotton fabrication, machine-washable care, and handy pockets for an easy-going lifestyle.',
        image: '/images/pdp1.png',
        isDefault: true
    },
    {
        id: 'default_enthusiast',
        name: 'The Fashion Enthusiast',
        whyPerfect: 'A vibrant patchwork aesthetic that turns heads at any garden soiree.',
        description: 'Your go-to statement piece for afternoon text brunches or lively outdoor get-togethers.',
        image: '/images/pdp2.png',
        isDefault: true
    }
];



import { useCompanyContext } from '../context/CompanyContext';

export const PDPPersonalization: React.FC = () => {
    const { name, description, guidelines } = useCompanyContext();
    const productName = `${name} ${DEFAULT_PRODUCT_NAME}`;
    console.log("PDPPersonalization rendering...");
    const [audiences, setAudiences] = useState<Audience[]>(DEFAULT_AUDIENCES);
    const [selectedAudienceId, setSelectedAudienceId] = useState<string>('default_standard');
    const [newAudienceName, setNewAudienceName] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const selectedAudience = audiences.find(a => a.id === selectedAudienceId) || audiences[0];



    const saveAudiences = async (newAudiences: Audience[]) => {
        // 1. Save to Server (Persistent)
        await saveAudiencesToServer(newAudiences);
    };

    const saveAudiencesToServer = async (newAudiences: Audience[]) => {
        try {
            await fetch('/api/audiences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newAudiences)
            });
        } catch (e) {
            console.error("Failed to save audiences to server", e);
        }
    };

    const saveDebugInfo = async (prompt: string, imageUrl: string) => {
        try {
            await fetch('/api/debug-log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, imageUrl, timestamp: new Date().toISOString() })
            });
        } catch (e) {
            console.error("Failed to save debug log", e);
        }
    };

    const handleCreateAudience = async () => {
        if (!newAudienceName.trim()) return;
        setIsGenerating(true);

        try {
            // 1. Generate Text Content
            const contentPromise = generatePersonalizedPDPContent(newAudienceName, productName, name);
            const content = await contentPromise;

            let scenePrompt = content.imagePrompt || `A clean, athletic, dynamic shot of ${DEFAULT_PRODUCT_NAME} for ${newAudienceName}`;

            // Add specific product constraints
            scenePrompt += `. CRITICAL: Create a photorealistic lifestyle image representing the promotional needs of ${newAudienceName} for ${name}. The image should NOT show any physical products or footwear unless they are essential. Focus on the core benefits: ${description}. Guidelines: ${companyContext.guidelines}. Use a clean, bright, and professional aesthetic.`;

            // Save debug info before image generation
            console.log("FINAL PROMPT SENT TO SERVICE:", scenePrompt);
            await saveDebugInfo(scenePrompt, DEFAULT_IMAGE_PATH);

            // Now generate image using the specific lifestyle scene function
            // Ensure absolute URL for image fetching
            const imagePath = DEFAULT_IMAGE_PATH.startsWith('/') ? `${window.location.origin}${DEFAULT_IMAGE_PATH}` : DEFAULT_IMAGE_PATH;
            const image = await generateLifestyleScene(imagePath, scenePrompt);

            const newAudience: Audience = {
                id: Date.now().toString(),
                name: newAudienceName,
                whyPerfect: content.whyPerfect || "Perfect for your lifestyle.",
                description: content.description || "The refreshing taste you love.",
                image: image || DEFAULT_IMAGE_PATH,
                isDefault: false
            };

            const updatedAudiences = [...audiences, newAudience];
            setAudiences(updatedAudiences);
            setSelectedAudienceId(newAudience.id);
            setNewAudienceName('');
            saveAudiences(updatedAudiences);

        } catch (error) {
            console.error("Failed to generate audience content", error);
            alert("Failed to generate content. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDeleteAudience = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newList = audiences.filter(a => a.id !== id);
        setAudiences(newList);
        if (selectedAudienceId === id) {
            setSelectedAudienceId(newList[0].id);
        }
        saveAudiences(newList);
    };

    useEffect(() => {
        const loadAudiences = async () => {
            let finalAudiences: Audience[] = [DEFAULT_AUDIENCES[0]]; // Always start with Standard View

            try {
                // 1. Fetch Dynamic Audiences from Marketing Hub
                const hubRes = await fetch('/api/load-run/audience_generator');
                if (hubRes.ok) {
                    const hubData = await hubRes.json();
                    if (hubData && hubData.personas && Array.isArray(hubData.personas) && hubData.personas.length > 0) {
                        const marketingHubAudiences: Audience[] = hubData.personas.map((p: any, index: number) => ({
                            id: `hub_audience_${index}`,
                            name: p.name || p.personaName || 'Unknown Audience',
                            whyPerfect: `Tailored completely for ${p.name || 'this audience'} based on their unique demographic and lifestyle profile.`,
                            description: p.details?.bio || p.bio || 'An exclusive view into how this product matches exactly what you need.',
                            image: p.imageUrl || DEFAULT_IMAGE_PATH,
                            isDefault: true
                        }));
                        finalAudiences = [...finalAudiences, ...marketingHubAudiences];
                    } else {
                        // Fallback to static defaults if no hub data
                        finalAudiences = [...DEFAULT_AUDIENCES];
                    }
                } else {
                    finalAudiences = [...DEFAULT_AUDIENCES];
                }
            } catch (e) {
                console.warn("Failed to fetch Marketing Hub audiences, falling back to defaults", e);
                finalAudiences = [...DEFAULT_AUDIENCES];
            }

            // 2. Fetch User-Generated Custom Audiences from PDP server/localStorage
            try {
                const res = await fetch('/api/audiences');
                if (res.ok) {
                    const serverData = await res.json();
                    if (Array.isArray(serverData) && serverData.length > 0) {
                        const customAudiences = serverData.filter(a => !a.isDefault);
                        finalAudiences = [...finalAudiences, ...customAudiences];
                    }
                } else {
                    console.warn("Server unavailable for custom audiences or empty response.");
                }
            } catch (e) {
                console.warn("Server unavailable for custom audiences.");
            }

            setAudiences(finalAudiences);

            // Set selected audience to Standard View or whatever was selected if it exists
            if (!finalAudiences.find(a => a.id === selectedAudienceId)) {
                setSelectedAudienceId(finalAudiences[0].id);
            }
        };

        loadAudiences();
    }, []);

    return (
        <div className="font-sans text-[#2D3142] w-full min-h-screen bg-[#F8F9FA] flex flex-col">

            {/* QVC Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
                    {/* Left: Logo & Nav */}
                    <div className="flex items-center gap-12">
                        <div className="flex flex-col">
                            {/* QVC Logo */}
                            <span className="text-3xl font-bold text-[#E22026] max-w-[200px]">QVC</span>
                        </div>

                        <nav className="hidden lg:flex items-center gap-8 text-[#2D3142] font-semibold text-sm">
                            <a href="#" className="flex flex-col items-center gap-1 group hover:text-[#E22026]">
                                <span className="transition-colors">Fashion</span>
                            </a>
                            <a href="#" className="flex flex-col items-center gap-1 group hover:text-[#E22026]">
                                <span className="transition-colors">Beauty</span>
                            </a>
                            <a href="#" className="flex flex-col items-center gap-1 group hover:text-[#E22026]">
                                <span className="transition-colors">Home</span>
                            </a>
                            <a href="#" className="flex flex-col items-center gap-1 group hover:text-[#E22026]">
                                <span className="transition-colors">Electronics</span>
                            </a>
                        </nav>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-6 text-[#2D3142] font-medium text-sm">
                        <a href="#" className="hidden md:block hover:text-[#0077C8] transition-colors">Find a Doctor</a>
                        <a href="#" className="hidden md:block hover:text-[#0077C8] transition-colors">Help</a>
                        <span className="hidden md:block border-l border-gray-300 h-4 mx-2"></span>
                        <SearchIcon size={20} className="cursor-pointer hover:text-[#0077C8] transition-colors" />
                        <User size={20} className="cursor-pointer hover:text-[#0077C8] transition-colors" />
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto p-6 md:p-12">
                {/* Breadcrumbs */}
                <div className="text-sm text-gray-500 mb-8 font-medium">
                    Home / Fashion / Dresses / Midi Dresses
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-12 bg-white rounded-3xl border border-gray-200 shadow-sm p-8">

                    {/* Left Column: Product Image (7 cols) */}
                    <div className="md:col-span-7">
                        <div className="aspect-square relative z-0 group bg-gray-50 border border-gray-200 rounded-3xl overflow-hidden p-8 flex items-center justify-center shadow-inner">
                            <img
                                src={selectedAudience.image}
                                alt={selectedAudience.name}
                                className="w-full h-full object-contain rounded-xl hover:scale-105 transition-transform duration-500 shadow-md"
                                onError={(e) => {
                                    // Fallback if image fails
                                    e.currentTarget.src = "/images/pdp1.png";
                                }}
                            />

                            {/* Audience Label Overlay */}
                            <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur px-5 py-2.5 rounded-full text-sm font-bold text-[#E22026] shadow-lg flex items-center gap-2 border border-red-100">
                                <User size={16} className="text-[#E22026]" />
                                View: {selectedAudience.name}
                            </div>
                        </div>

                        {/* Audience Selector */}
                        <div className="mt-8 bg-gray-50 p-8 rounded-3xl border border-gray-200">
                            <h3 className="font-bold text-[#2D3142] mb-6 flex items-center gap-2 text-xl tracking-tight">
                                <Sparkles size={24} className="text-[#0077C8]" />
                                Customize Your Experience
                            </h3>

                            <div className="flex flex-wrap gap-3 mb-8">
                                {audiences.map(aud => (
                                    <button
                                        key={aud.id}
                                        onClick={() => setSelectedAudienceId(aud.id)}
                                        className={`px-6 py-3 rounded-full text-sm font-bold border transition-all flex items-center gap-2
                                            ${selectedAudienceId === aud.id
                                            ? 'bg-[#0077C8] text-white border-[#0077C8] shadow-md transform -translate-y-0.5'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:text-[#2D3142] shadow-sm'
                                            }`}
                                    >
                                        {aud.name}
                                        {!aud.isDefault && (
                                            <span
                                                onClick={(e) => handleDeleteAudience(aud.id, e)}
                                                className="hover:text-red-500 ml-2 p-0.5"
                                            >
                                                <Trash2 size={14} />
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={newAudienceName}
                                    onChange={(e) => setNewAudienceName(e.target.value)}
                                    placeholder="Try: 'Freelance Designer', 'Retiree', 'First-Time Parents'..."
                                    className="flex-1 input-field font-medium bg-white border border-gray-200 text-[#2D3142]"
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreateAudience()}
                                    disabled={isGenerating}
                                />
                                <button
                                    onClick={handleCreateAudience}
                                    disabled={!newAudienceName || isGenerating}
                                    className="bg-[#0077C8] text-white px-8 py-4 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-md"
                                >
                                    {isGenerating ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div> : <Plus size={20} />}
                                    Generate Campaign
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Product Details (5 cols) */}
                    <div className="md:col-span-5 space-y-8 pt-6">
                        <div>
                            <h2 className="text-[#E22026] font-bold tracking-widest uppercase text-xs mb-3">Primetime Special Price</h2>
                            <h1 className="text-3xl md:text-5xl font-black text-[#2D3142] leading-none tracking-tighter mb-2">
                                {DEFAULT_PRODUCT_NAME}
                            </h1>
                            <h3 className="text-xl font-medium text-gray-600 mb-4">LOGO by Lori Goldstein</h3>

                            {/* Reviews */}
                            <div className="flex items-center gap-4 mt-4">
                                <div className="flex text-[#FFB900] gap-0.5">
                                    {[1, 2, 3, 4, 5].map(i => <Star key={i} size={20} fill="currentColor" className="text-[#FFB900]" />)}
                                </div>
                                <span className="text-sm font-bold underline cursor-pointer text-gray-500 hover:text-[#E22026]">4.9 (12,403 Reviews)</span>
                            </div>

                            <div className="mt-8 space-y-3 text-sm text-[#2D3142] bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <div className="flex justify-between border-b border-gray-200 pb-2">
                                    <span className="text-gray-500 w-1/3">Fabrication</span>
                                    <span className="font-bold text-right w-2/3">knit</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-200 pb-2">
                                    <span className="text-gray-500 w-1/3">Features</span>
                                    <span className="font-bold text-right w-2/3">patchwork print, elbow-length sleeves, boat neckline, set-in pockets</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-200 pb-2">
                                    <span className="text-gray-500 w-1/3">Content</span>
                                    <span className="font-bold text-right w-2/3">100% cotton</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 w-1/3">Care</span>
                                    <span className="font-bold text-right w-2/3">machine wash, tumble dry</span>
                                </div>
                            </div>
                        </div>

                        {/* Price */}
                        <div>
                            <div className="text-4xl font-black tracking-tight text-[#E22026]">{DEFAULT_PRICE}</div>
                            <div className="text-md text-gray-500 font-medium mt-1">
                                QVC PRICE: <span className="line-through">$63.00</span> <span className="text-[#188038] font-bold">Save 34%</span>
                            </div>
                            <div className="text-sm text-gray-500 font-medium mt-1">S&H: $3.50</div>
                        </div>

                        {/* Personalized Description Box */}
                        <div className="relative border-l-4 border-[#E22026] pl-6 py-1">
                            <p className="text-lg text-[#2D3142] leading-relaxed mb-3 font-medium">
                                "{selectedAudience.description}"
                            </p>
                            <button className="text-[#E22026] font-bold text-xs uppercase tracking-widest hover:underline transition-all">
                                Read full product details
                            </button>
                        </div>

                        {/* Why Important for Audience Box */}
                        <div
                            className="bg-red-50 p-6 rounded-2xl mt-4 mb-6 border border-red-100 shadow-sm"
                        >
                            <h3 className="font-bold text-[#E22026] text-xs mb-3 flex items-center gap-2 uppercase tracking-widest">
                                <Heart size={14} className="text-[#E22026] fill-current" />
                                Why we love this for: {selectedAudience.name}
                            </h3>
                            <p className="text-[#2D3142] text-base italic leading-relaxed font-serif">
                                "{selectedAudience.whyPerfect}"
                            </p>
                        </div>

                        {/* Quantity Options */}
                        <div className="space-y-3 pb-4">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Quantity</label>
                            <div className="flex items-center gap-6">
                                <div className="flex items-center border border-gray-200 rounded-full px-2 py-1 bg-white shadow-sm">
                                    <button className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-[#E22026] transition-colors font-bold text-xl">
                                        -
                                    </button>
                                    <span className="text-xl font-bold text-[#2D3142] w-8 text-center">1</span>
                                    <button className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-[#E22026] transition-colors font-bold text-xl">
                                        +
                                    </button>
                                </div>
                                <span className="text-[#188038] text-sm font-semibold flex items-center gap-1">
                                    In Stock
                                </span>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-4 pt-4 border-t border-gray-200">
                            <button className="flex-1 bg-[#E22026] text-white font-bold tracking-wide py-5 px-8 rounded-2xl hover:bg-red-700 transition-all shadow-md flex items-center justify-center gap-3 text-lg">
                                <ShoppingCart size={24} />
                                Add to Cart
                            </button>
                            <button className="p-5 bg-white border border-gray-200 rounded-2xl text-gray-400 hover:border-[#E22026] hover:text-[#E22026] transition-colors shadow-sm">
                                <Heart size={24} />
                            </button>
                        </div>

                        <div className="text-xs text-gray-500 font-medium pt-2 text-center">
                            Need help? Call 1-800-555-0199 for an agent.
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};
