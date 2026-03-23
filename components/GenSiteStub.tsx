import React, { useState } from 'react';
import { generateJson, generatePersonalizedProducts, translateProducts, generatePersonalizedHeadlines, generateImage } from '../services/geminiService';
import { brandConfig } from '../config';
import { Schema } from "@google/genai";
import { Users, RotateCcw, ArrowLeft } from 'lucide-react';

const SAMPLE_DATA = [
    { user_id: 1, email: 'sarah.m@example.com', name: 'Sarah Miller', location: 'Pittsburgh, PA', topChannel: 'Web', condition: 'Home Chef', Browse_history: 'Cookware Sets, Air Fryers, Gourmet Food', preferred_language: 'English', weather: 'sunny' },
    { user_id: 2, email: 'r.chen88@example.com', name: 'Robert Chen', location: 'Erie, PA', topChannel: 'Email', condition: 'Tech Enthusiast', Browse_history: 'Laptops, Smart Home Devices, TVs', preferred_language: 'English', weather: 'cloudy' },
    { user_id: 3, email: 'emily.d@example.com', name: 'Emily Davis', location: 'Harrisburg, PA', topChannel: 'Mobile', condition: 'Fashion Lover', Browse_history: 'Designer Handbags, Fall Coats, Jewelry', preferred_language: 'English', weather: 'sunny' },
    { user_id: 4, email: 'mike.b@example.com', name: 'Michael Brown', location: 'Allentown, PA', topChannel: 'TV (QVC)', condition: 'Home Improver', Browse_history: 'Outdoor Furniture, Cleaning Supplies', preferred_language: 'English', weather: 'snow' },
    { user_id: 5, email: 'jess.w@example.com', name: 'Jessica Wilson', location: 'Scranton, PA', topChannel: 'Social', condition: 'Beauty Guru', Browse_history: 'Skincare Routines, Anti-Aging Cosmetics', preferred_language: 'English', weather: 'sunny' },
    { user_id: 6, email: 'david.j@example.com', name: 'David Jones', location: 'Philadelphia, PA', topChannel: 'Web', condition: 'Fitness Buff', Browse_history: 'Home Gym Equipment, Protein Powder, Activewear', preferred_language: 'English', weather: 'rain' },
    { user_id: 7, email: 'amanda.r@example.com', name: 'Amanda Rose', location: 'Lancaster, PA', topChannel: 'Mobile', condition: 'Bargain Hunter', Browse_history: "Clearance Apparel, Today's Special Value, Handbags", preferred_language: 'English', weather: 'sunny' },
    { user_id: 8, email: 'james.t@example.com', name: 'James Taylor', location: 'State College, PA', topChannel: 'Web', condition: 'Gift Shopper', Browse_history: 'Toys, Electronics, Gourmet Chocolates', preferred_language: 'English', weather: 'cloudy' }
];

export const GenSiteStub: React.FC = () => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState("");

    // Step 1 & 2 Data
    const [audiences, setAudiences] = useState<any[]>([]);
    const [storedAudiences, setStoredAudiences] = useState<any[]>([]); // Audiences from Audience Generator
    const [selectedUserId, setSelectedUserId] = useState<number | string>(SAMPLE_DATA[0].user_id);

    // Step 4 Data
    const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);

    // Load Stored Audiences on Mount
    React.useEffect(() => {
        const loadStoredAudiences = async () => {
            try {
                const res = await fetch('/api/load-run/audience_generator');
                if (res.ok) {
                    const data = await res.json();
                    if (data.personas && Array.isArray(data.personas)) {
                        console.log("Loaded stored audiences:", data.personas.length);
                        setStoredAudiences(data.personas);
                    }
                }
            } catch (error) {
                console.warn("Failed to load stored audiences:", error);
            }
        };
        loadStoredAudiences();
    }, []);

    // Auto-Save Effect
    React.useEffect(() => {
        if (step > 1 && audiences.length > 0) {
            const runData = {
                audiences,
                selectedUserId,
                generatedHtml,
                step
            };

            // Save to Server
            console.log("Saving GenSite Run:", { audiences: audiences.length, step, hasHtml: !!generatedHtml });
            fetch('/api/save-run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ featureId: 'gensite', data: runData })
            })
                .then(() => console.log("GenSite Saved Successfully"))
                .catch(err => console.error("Failed to save GenSite run to server:", err));
        } else {
            console.log("Not Saving GenSite:", { step, audiences: audiences.length });
        }
    }, [audiences, selectedUserId, generatedHtml, step]);

    const handleLoadLast = async () => {
        setLoading(true);
        setStatus("Restoring previous session...");

        try {
            const res = await fetch('/api/load-run/gensite');
            if (!res.ok) throw new Error("No saved run");
            const data = await res.json();

            // 1. Simulate Loader
            setTimeout(() => {
                console.log("Restoring GenSite Data:", data);
                if (data.audiences) setAudiences(data.audiences);

                // Restore step based on data
                const savedStep = data.step || 2;

                // 2. If we had a page, restore it
                if (savedStep >= 3) {
                    setSelectedUserId(data.selectedUserId);

                    // If we have HTML, go to step 4
                    if (data.generatedHtml) {
                        setGeneratedHtml(data.generatedHtml);
                        setStep(4);
                        setStatus("");
                        setLoading(false);
                        return;
                    }
                }

                // Default fallback
                setStep(2);
                setLoading(false);
            }, 1000);

        } catch (e) {
            console.warn("Could not load GenSite run:", e);
            setLoading(false);
            alert("No previous run found or failed to load.");
        }
    };

    const handleAnalyzeAudiences = async () => {
        setLoading(true);
        setStatus("Analyzing customer data to identify segments...");
        try {
            let prompt = "";

            if (storedAudiences.length > 0) {
                const audienceDescriptions = storedAudiences.map(a => `- **${a.name || a.personaName}**: ${a.bio || a.description}`).join('\n');

                prompt = `
                Company: ${brandConfig.companyName}
                Task: Analyze the provided user data and map each user to one of the following EXISTING Audience Segments:
                
                ${audienceDescriptions}
                
                STRICTLY map users to ONLY these segments. Do not create new segments.
                For each audience, returned the exact name from the list above, and the list of user_ids that belong to it.
                Data: ${JSON.stringify(SAMPLE_DATA)}`
                ;
            } else {
                prompt = `
                Company: ${brandConfig.companyName}
                Task: Analyze the provided user data and group them into 3 distinct, meaningful Audience Segments based on their style preferences, shopping goals, and browsing behavior.
                Do not force them into pre-defined archetypes unless they naturally fit.

                For each audience, provide a creative name, a brief description of the commonalities, and a list of user_ids that belong to it.
                All users must be in a single audience.
                Data: ${JSON.stringify(SAMPLE_DATA)}`
                ;
            }
            const schema: Schema = {
                type: "OBJECT",
                properties: {
                    audiences: {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: {
                                audience_name: { type: "STRING" },
                                description: { type: "STRING" },
                                user_ids: { type: "ARRAY", items: { type: "NUMBER" } }
                            },
                            required: ["audience_name", "description", "user_ids"]
                        }
                    }
                },
                required: ["audiences"]
            };

            const result = await generateJson(prompt, schema);
            if (result && result.audiences) {
                setAudiences(result.audiences);
                setStep(2);
            }
        } catch (error) {
            console.error(error);
            alert("Failed to analyze audiences.");
        } finally {
            setLoading(false);
        }
    };

    const handleGeneratePage = async () => {
        const user = SAMPLE_DATA.find(u => u.user_id === Number(selectedUserId));
        if (!user) return;

        setStep(3);
        setLoading(true);

        try {
            // Find matching audience context
            // We match user.condition (e.g. "Data-Driven Athlete") to storedAudiences.name or segment name
            const audienceContext = storedAudiences.find(a =>
                (a.name && user.condition && a.name.toLowerCase().includes(user.condition.toLowerCase())) ||
                (a.personaName && user.condition && a.personaName.toLowerCase().includes(user.condition.toLowerCase()))
            );

            if (audienceContext) {
                console.log("Found matching audience context:", audienceContext.name);
            } else {
                console.log("No matching audience context found for condition:", user.condition);
            }

            // 1. Recommendations
            setStatus("1/5: Asking Gemini for tailored product recommendations...");
            const prodData = await generatePersonalizedProducts(user, audienceContext);
            const products = prodData.products || [];

            // 2. Translation
            setStatus("2/5: Translating recommendations to Spanish...");
            const transData = await translateProducts(products);
            const productsEs = transData.products || [];

            // 3. Headlines
            setStatus("3/5: Writing personalized headlines...");
            const headlines = await generatePersonalizedHeadlines(user, audienceContext);

            // 4. Images
            setStatus("4/5: Generating product images with Gemini...");
            const images: (string | null)[] = [];
            const batchSize = 3;
            
            for (let i = 0; i < products.length; i += batchSize) {
                const batch = products.slice(i, i + batchSize);
                const batchResults = await Promise.all(batch.map((p: any) =>
                    generateImage(p.image_prompt + ", high quality, photorealistic, isolated on white background")
                ));
                images.push(...batchResults);
            }

            // 5. Assembly
            setStatus("5/5: Assembling the final page...");
            const html = constructHtml(user, products, productsEs, headlines, images);
            setGeneratedHtml(html);
            setStep(4);

        } catch (error) {
            console.error(error);
            alert("Failed to generate page.");
            setStep(2); // Go back
        } finally {
            setLoading(false);
        }
    };

    const constructHtml = (user: any, productsEn: any[], productsEs: any[], headlines: any, images: (string | null)[]) => {
        let cardsHtml = "";

        productsEn.forEach((prod, i) => {
            const prodEs = productsEs[i] || prod;
            const imgBase64 = images[i] ? `data:image/jpeg;base64,${images[i]}` : 'https://via.placeholder.com/400?text=Image+Failed';

            cardsHtml += `
                <div class="product-card">
                    <img src="${imgBase64}" alt="${prod.name}">
                    <div class="product-info">
                        <h3>
                            <span class="lang-en">${prod.name}</span>
                            <span class="lang-es">${prodEs.name}</span>
                        </h3>
                        <p class="description">
                            <span class="lang-en">${prod.short_description}</span>
                            <span class="lang-es">${prodEs.short_description}</span>
                        </p>
                        <p class="price">${prod.cost}</p>
                    </div>
                    <div class="reason-overlay">
                        <p>
                            <span class="lang-en">${prod.reason}</span>
                            <span class="lang-es">${prodEs.reason}</span>
                        </p>
                    </div>
                </div>
            `;
        });

        return `
            <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Special Selection for ${user.name}</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
                :root { --bg-primary: #F0F2F6; --bg-content: #FFFFFF; --text-primary: #262730; --text-secondary: #5E6C84; --accent-primary: #E22026; --accent-light: #F3F4F6; --border-color: #DFE1E6; }
                body { font-family: 'Inter', sans-serif; margin: 0; background-color: var(--bg-primary); color: var(--text-primary); line-height: 1.6; }
                .lang-es { display: none; }
                .header { background-color: var(--bg-content); padding: 40px; text-align: center; border-bottom: 2px solid var(--border-color); }
                .header h1 { margin: 0; font-size: 2.5rem; color: var(--text-primary); }
                .header p { margin: 20px auto 0; font-size: 1.15rem; color: var(--text-secondary); max-width: 800px; }
                .lang-toggle { padding: 15px; text-align: center; background: var(--bg-content); border-bottom: 1px solid var(--border-color); }
                .lang-toggle button { background: var(--bg-primary); border: 1px solid var(--border-color); padding: 8px 20px; margin: 0 5px; border-radius: 6px; cursor: pointer; }
                .lang-toggle button.active { background: var(--accent-primary); color: #fff; border-color: var(--accent-primary); }
                .container { max-width: 1200px; margin: 40px auto; padding: 0 20px; }
                .products-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; }
                .product-card { background: var(--bg-content); border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); overflow: hidden; position: relative; transition: transform 0.3s; }
                .product-card:hover { transform: translateY(-5px); }
                .product-card img { width: 100%; height: 300px; object-fit: contain; padding: 20px; background: white; }
                .product-info { padding: 20px; }
                .product-info h3 { margin: 0 0 10px; font-size: 1.2rem; }
                .product-info .price { color: var(--accent-primary); font-weight: bold; font-size: 1.2rem; margin-top: 10px; }
                .reason-overlay { position: absolute; inset: 0; background: rgba(226, 32, 38, 0.95); color: white; display: flex; align-items: center; justify-content: center; padding: 20px; opacity: 0; transition: opacity 0.3s; text-align: center; }
                .product-card:hover .reason-overlay { opacity: 1; }
            </style>
            </head><body>
            <div class="header">
                <h1><span class="lang-en">${headlines.en.headline}</span><span class="lang-es">${headlines.es.headline}</span></h1>
                <p><span class="lang-en">${headlines.en.subheadline}</span><span class="lang-es">${headlines.es.subheadline}</span></p>
            </div>
            <div class="lang-toggle">
                <button id="btn-en" class="active" onclick="toggleLanguage('en')">English</button>
                <button id="btn-es" onclick="toggleLanguage('es')">Español</button>
            </div>
            <div class="container"><div class="products-grid">${cardsHtml}</div></div>
            <script>
                function toggleLanguage(lang) {
                    const en = document.querySelectorAll('.lang-en');
                    const es = document.querySelectorAll('.lang-es');
                    document.getElementById('btn-en').classList.toggle('active', lang === 'en');
                    document.getElementById('btn-es').classList.toggle('active', lang === 'es');
                    en.forEach(e => e.style.display = lang === 'en' ? 'inline' : 'none');
                    es.forEach(e => e.style.display = lang === 'es' ? 'inline' : 'none');
                }
            </script>
            </body></html>
        `;
    };

    return (
        <div className="max-w-[1600px] mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="section-header">Generative Site Building</h2>
            </div>

            {step > 1 && !loading && (
                <button
                    onClick={() => { setStep(1); setGeneratedHtml(null); setAudiences([]); }}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-semibold mb-6 transition-colors"
                >
                    <ArrowLeft size={20} /> Back to Data
                </button>
            )}

            {step === 1 && !loading && (
                <div className="content-card p-8">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-xl font-semibold text-gray-900 font-bold mb-1 flex items-center gap-2">
                                <Users size={20} className="text-[#0077C8]" /> Customer Data Source
                            </h3>
                        </div>
                        <div className="flex gap-4 items-center">
                            <button
                                onClick={handleLoadLast}
                                className="text-gray-500 hover:text-gray-900 font-medium flex items-center gap-2"
                                title="Replay last run"
                            >
                                <RotateCcw size={16} /> Load Last Run
                            </button>
                            <button
                                onClick={handleAnalyzeAudiences}
                                className={`btn-primary px-6 py-3 rounded-lg font-bold shadow-md hover:shadow-lg transition-all`}
                            >
                                Analyze Audiences
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Channel</th>
                                    <th>Goal/Focus</th>
                                    <th>Browse History</th>
                                    <th>Location</th>
                                </tr>
                            </thead>
                            <tbody>
                                {SAMPLE_DATA.map(user => (
                                    <tr key={user.user_id}>
                                        <td className="font-medium text-gray-900">{user.name}</td>
                                        <td className="text-sm text-gray-500">{user.email}</td>
                                        <td><span className="badge badge-gray">{user.topChannel}</span></td>
                                        <td className="text-sm text-gray-900 font-medium max-w-xs truncate">{user.condition}</td>
                                        <td className="text-sm text-gray-500 max-w-xs truncate">{user.Browse_history}</td>
                                        <td className="text-sm text-gray-500">{user.location}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#0077C8] mb-4"></div>
                        <p className="text-xl font-semibold text-gray-900 mb-2">Building Site...</p>
                        <p className="text-gray-500 animate-pulse">{status}</p>
                    </div>
                </div>
            )}

            {/* Step 2: Select Audience/User */}
            {step === 2 && !loading && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {audiences.map((aud, idx) => (
                            <div key={idx} className="content-card border-t-4 border-[#0077C8]">
                                <h3 className="text-lg font-bold text-gray-900 mb-2">{aud.audience_name}</h3>
                                <p className="text-sm text-gray-600 mb-4">{aud.description}</p>
                                <div className="text-xs text-gray-500">
                                    <strong>Users: </strong>
                                    {aud.user_ids.map((uid: number) => SAMPLE_DATA.find(u => u.user_id === uid)?.name).join(', ')}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="content-card text-center p-8">
                        <h3 className="section-header justify-center mb-4">Select a User to Target</h3>
                        <div className="flex justify-center gap-4">
                            <select
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                                className="p-3 rounded-lg border border-gray-200 bg-white text-gray-900 min-w-[200px]"
                            >
                                {SAMPLE_DATA.map(user => (
                                    <option key={user.user_id} value={user.user_id}>{user.name} ({user.location})</option>
                                ))}
                            </select>
                            <button onClick={handleGeneratePage} className={`btn-primary px-8 py-3 rounded-lg font-bold transition-colors shadow-lg`}>
                                Generate Personalized Site
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 4: Preview */}
            {step === 4 && generatedHtml && (
                <div className="space-y-8">
                    {/* Context: Audiences */}
                    <div className="bg-gray-50 p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Target Audiences Identified</h3>
                            <button
                                onClick={() => setStep(2)}
                                className="text-sm text-gray-500 hover:text-gray-900 font-medium"
                            >
                                Change Selection
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {audiences.map((aud, idx) => (
                                <div key={idx} className={`p-4 rounded-lg border ${aud.user_ids.includes(Number(selectedUserId)) ? 'bg-[#0077C8]/5 border-[#0077C8]/30 ring-1 ring-[#0077C8]/20' : 'bg-white border-gray-200 opacity-70'}`}>
                                    <h4 className="font-bold text-gray-900 text-sm mb-1">{aud.audience_name}</h4>
                                    <p className="text-xs text-gray-600 line-clamp-2">{aud.description}</p>
                                    {aud.user_ids.includes(Number(selectedUserId)) && (
                                        <div className="mt-2 text-xs font-bold text-[#0077C8] bg-[#0077C8]/10 inline-block px-2 py-1 rounded">
                                            Current Target
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Generated Site */}
                    <div className="content-card p-0 overflow-hidden">
                        <div className="bg-gray-100 p-2 border-b border-gray-200 flex gap-2 items-center">
                            <div className="flex gap-1.5 ml-2">
                                <div className="w-3 h-3 rounded-full bg-red-400/60"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-400/60"></div>
                                <div className="w-3 h-3 rounded-full bg-green-400/60"></div>
                            </div>
                            <div className="flex-1 bg-white mx-4 py-1 px-3 rounded text-xs text-center text-gray-500 font-mono border border-gray-200 shadow-inner">
                                {brandConfig.companyName.replace(/\s+/g, '').toLowerCase()}.com/personalized/{SAMPLE_DATA.find(u => u.user_id === Number(selectedUserId))?.name.toLowerCase()}
                            </div>
                        </div>
                        <iframe
                            srcDoc={generatedHtml}
                            className="w-full h-[800px] border-none"
                            title="Generated Site"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
