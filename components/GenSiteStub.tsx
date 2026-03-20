import React, { useState, useEffect } from 'react';
import { Users, FileText, Layout, ArrowRight, CheckCircle, Smartphone, Globe, Mail, RotateCcw } from 'lucide-react';
import { generatePersonalizedProducts, translateProducts, generatePersonalizedHeadlines, generateImage } from '../services/geminiService';
import { brandConfig } from '../config';

interface CustomerProfile {
    name: string;
    email: string;
    condition: string;
    location: string;
    topChannel: string;
    browse_history: string[];
}



import { useCompanyContext } from '../context/CompanyContext';

export const GenSiteStub: React.FC = () => {
    const { name, description } = useCompanyContext();
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
    const [step, setStep] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedContent, setGeneratedContent] = useState<any>(null);
    const [generatedHtml, setGeneratedHtml] = useState<string>("");
    const [lastRun, setLastRun] = useState<any>(null);

    useEffect(() => {
        fetch('/api/load-run/gensite')
            .then(res => {
                if (res.ok) return res.json();
                return null;
            })
            .then(data => {
                if (data && data.selectedCustomer) {
                    setLastRun(data);
                }
            })
            .catch(() => { });
    }, []);

    useEffect(() => {
        if (step === 3 && generatedHtml && selectedCustomer) {
            const runData = { selectedCustomer, generatedContent, generatedHtml, step: 3 };
            fetch('/api/save-run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ featureId: 'gensite', data: runData })
            }).catch(err => console.error("Failed to save run to server:", err));
            setLastRun(runData);
        }
    }, [selectedCustomer, generatedContent, generatedHtml, step]);

    const handleLoadLast = (data: any) => {
        setIsGenerating(true);
        setTimeout(() => {
            setSelectedCustomer(data.selectedCustomer);
            setGeneratedContent(data.generatedContent);
            setGeneratedHtml(data.generatedHtml);
            setStep(data.step || 3);
            setIsGenerating(false);
        }, 500);
    };

    const SAMPLE_DATA: CustomerProfile[] = [
        { name: 'Sarah Miller', email: 'sarah.m@example.com', condition: 'Growing Family', location: 'Pittsburgh, PA', topChannel: 'Web', browse_history: ['Pediatricians', 'Family Plans'] },
        { name: 'Robert Chen', email: 'r.chen88@example.com', condition: 'Retirement Planning', location: 'Erie, PA', topChannel: 'Email', browse_history: ['Medicare Advantage', 'SilverSneakers'] },
        { name: 'Emily Davis', email: 'emily.d@example.com', condition: 'Freelancer', location: 'Harrisburg, PA', topChannel: 'Mobile', browse_history: ['Individual PPO', 'Dental Coverage'] },
        { name: 'Michael Brown', email: 'mike.b@example.com', condition: 'Chronic Care', location: 'Allentown, PA', topChannel: 'Agent', browse_history: ['Diabetes Management', 'Prescription Tiers'] },
        { name: 'Jessica Wilson', email: 'jess.w@example.com', condition: 'Wellness Focused', location: 'Scranton, PA', topChannel: 'Social', browse_history: ['Gym Discounts', 'Nutrition Coaching'] },
    ];

    const handleAnalyzeAudiences = async () => {
        setIsGenerating(true);
        // Simulation of analysis
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsGenerating(false);
    };

    const handleGeneratePage = async (customer: CustomerProfile) => {
        setSelectedCustomer(customer);
        setStep(2);
        setIsGenerating(true);

        try {
            // 1. Generate Content (Parallel)
            const [productsData, headlineData] = await Promise.all([
                generatePersonalizedProducts(customer, { 
                    name: customer.condition, 
                    bio: `Customer interested in ${customer.browse_history.join(', ')}. Context: ${description}`, 
                    details: { goals: [customer.condition], preferred_products: [] } 
                }, name),
                generatePersonalizedHeadlines(customer, { 
                    name: customer.condition, 
                    details: { bio: `Customer interested in ${customer.browse_history.join(', ')}. Context: ${description}`, goals: [customer.condition] } 
                }, name)
            ]);

            // 2. Translate if needed (Simulation)
            // const translatedProducts = await translateProducts(productsData.products);

            // 3. Construct HTML
            const html = constructHtml(customer, productsData.products, headlineData);
            setGeneratedHtml(html);
            setGeneratedContent({ products: productsData.products, headlines: headlineData });
            setStep(3);

        } catch (error) {
            console.error("Generation failed", error);
        } finally {
            setIsGenerating(false);
        }
    };

    const constructHtml = (customer: CustomerProfile, products: any[], headlines: any) => {
        const heroImage = "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=2000"; // Generic health image

        return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${name} - Personalized Quote</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
            body { font-family: 'Inter', sans-serif; }
            .brand-gradient { background: linear-gradient(135deg, #0077C8 0%, #00508a 100%); }
        </style>
      </head>
      <body class="bg-gray-50 text-gray-900">
        <!-- Navigation -->
        <nav class="bg-white border-b border-gray-100 py-4">
            <div class="max-w-6xl mx-auto px-4 flex justify-between items-center">
                <div class="font-bold text-2xl text-[#0077C8]">${name}</div>
                <div class="hidden md:flex gap-8 text-sm font-medium text-gray-500">
                    <a href="#" class="hover:text-[#0077C8]">Plans</a>
                    <a href="#" class="hover:text-[#0077C8]">Find a Doctor</a>
                    <a href="#" class="hover:text-[#0077C8]">Wellness</a>
                    <a href="#" class="hover:text-[#0077C8]">Member Login</a>
                </div>
            </div>
        </nav>

        <!-- Hero Section -->
        <header class="relative bg-white overflow-hidden">
            <div class="absolute inset-0">
                <img src="${heroImage}" class="w-full h-full object-cover opacity-10" alt="Background">
                <div class="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent"></div>
            </div>
            <div class="relative max-w-6xl mx-auto px-4 py-20 md:py-32 grid md:grid-cols-2 gap-12 items-center">
                <div>
                    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#0077C8] text-sm font-semibold mb-6">
                        <span class="w-2 h-2 rounded-full bg-[#0077C8]"></span> Personalized for ${customer.name}
                    </div>
                    <h1 class="text-4xl md:text-6xl font-black tracking-tight text-gray-900 mb-6 leading-tight">
                        ${headlines.en.headline}
                    </h1>
                    <p class="text-xl text-gray-600 mb-8 leading-relaxed">
                        ${headlines.en.subheadline}
                    </p>
                    <div class="flex gap-4">
                        <button class="bg-[#0077C8] text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:bg-[#0061a3] transition-all transform hover:-translate-y-1">
                            View Your Quote
                        </button>
                        <button class="bg-white text-gray-700 px-8 py-4 rounded-xl font-bold border border-gray-200 hover:bg-gray-50 transition-all">
                            Speak to an Agent
                        </button>
                    </div>
                </div>
                <!-- Dynamic Card -->
                <div class="relative hidden md:block">
                    <div class="bg-white p-8 rounded-3xl shadow-2xl border border-gray-100 transform rotate-2 hover:rotate-0 transition-all duration-500">
                        <div class="flex items-center gap-4 mb-6">
                            <div class="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-[#0077C8]">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                            </div>
                            <div>
                                <h3 class="font-bold text-gray-900">Recommended Coverage</h3>
                                <p class="text-sm text-gray-500">Based on your needs in ${customer.location}</p>
                            </div>
                        </div>
                        <div class="space-y-4">
                            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                <span class="font-medium text-gray-700">Primary Care Visits</span>
                                <span class="font-bold text-[#0077C8]">$0 Copay</span>
                            </div>
                            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                <span class="font-medium text-gray-700">Specialist Visits</span>
                                <span class="font-bold text-[#0077C8]">$25 Copay</span>
                            </div>
                            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                <span class="font-medium text-gray-700">Deductible</span>
                                <span class="font-bold text-[#0077C8]">$500</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>

        <!-- Recommended Plans Section -->
        <section class="py-20 bg-gray-50">
            <div class="max-w-6xl mx-auto px-4">
                <div class="text-center mb-16">
                    <h2 class="text-3xl font-bold text-gray-900 mb-4">Plans Selected For You</h2>
                    <p class="text-gray-500 max-w-2xl mx-auto">We've analyzed your profile and found these options that match your lifestyle and budget.</p>
                </div>
                
                <div class="grid md:grid-cols-3 gap-8">
                    ${products.slice(0, 3).map((product: any) => `
                        <div class="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group">
                            <div class="h-48 overflow-hidden bg-gray-100 relative">
                                <!-- Placeholder for generated image if available, else gradient -->
                                 <div class="absolute inset-0 bg-gradient-to-br from-blue-50 to-white flex items-center justify-center text-blue-200">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                 </div>
                                 <div class="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-[#0077C8]">
                                    Best Match
                                 </div>
                            </div>
                            <div class="p-8">
                                <h3 class="text-xl font-bold text-gray-900 mb-2 group-hover:text-[#0077C8] transition-colors">${product.name}</h3>
                                <p class="text-gray-500 text-sm mb-6 line-clamp-2">${product.short_description}</p>
                                
                                <div class="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                                    <p class="text-xs font-bold text-[#0077C8] uppercase tracking-wider mb-1">Why it fits</p>
                                    <p class="text-sm text-blue-800 italic">"${product.reason}"</p>
                                </div>
                                
                                <div class="flex items-end justify-between border-t border-gray-50 pt-6">
                                    <div>
                                        <p class="text-xs text-gray-400 font-medium uppercase">Est. Premium</p>
                                        <p class="text-2xl font-black text-gray-900">${product.cost || "$0"}<span class="text-sm font-medium text-gray-400">/mo</span></p>
                                    </div>
                                    <button class="w-12 h-12 rounded-full bg-[#0077C8] text-white flex items-center justify-center hover:bg-[#0061a3] transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </section>

        <!-- CTA -->
        <section class="py-20 bg-white border-t border-gray-100">
            <div class="max-w-4xl mx-auto px-4 text-center">
                <h2 class="text-3xl font-bold text-gray-900 mb-6">Ready to enroll?</h2>
                <div class="flex justify-center gap-4">
                    <button class="bg-gray-900 text-white px-8 py-3 rounded-full font-semibold hover:bg-black transition-colors">
                        Start Application
                    </button>
                </div>
            </div>
        </section>
      </body>
      </html>
    `;
    };

    return (
        <div className="max-w-[1600px] mx-auto p-4 md:p-8 min-h-screen">

            {/* Header */}
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="section-header">Personalized Site Generator</h2>
                    <p className="text-subtext mt-1">Generate dynamic landing pages based on member profiles.</p>
                </div>
            </div>

            {step === 1 && (
                <div className="content-card">
                    <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-6">
                        <h3 className="text-xl font-bold text-heading flex items-center gap-2">
                            <Users size={20} className="text-[#0077C8]" /> Customer Data Source
                        </h3>
                        <div className="flex gap-4 items-center">
                            <button
                                onClick={handleAnalyzeAudiences}
                                disabled={isGenerating}
                                className="btn-primary flex items-center gap-2"
                            >
                                {isGenerating ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <CheckCircle size={18} />}
                                Analyze Segments
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 text-xs font-bold text-subtext uppercase tracking-wider">
                                    <th className="p-4">Customer Name</th>
                                    <th className="p-4">Life Stage / Goal</th>
                                    <th className="p-4">Location</th>
                                    <th className="p-4">Interests</th>
                                    <th className="p-4">Top Channel</th>
                                    <th className="p-4">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {SAMPLE_DATA.map((customer, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors group">
                                        <td className="p-4 font-medium text-heading">{customer.name}<br /><span className="text-xs text-subtext font-normal">{customer.email}</span></td>
                                        <td className="p-4">
                                            <span className="px-2.5 py-1 bg-blue-50 text-[#0077C8] rounded-full text-xs font-bold">{customer.condition}</span>
                                        </td>
                                        <td className="p-4 text-sm text-subtext">{customer.location}</td>
                                        <td className="p-4 text-xs text-subtext max-w-xs truncate">{customer.browse_history.join(', ')}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                                                {customer.topChannel === 'Web' && <Globe size={14} />}
                                                {customer.topChannel === 'Email' && <Mail size={14} />}
                                                {customer.topChannel === 'Mobile' && <Smartphone size={14} />}
                                                {customer.topChannel}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleGeneratePage(customer)}
                                                    className="transition-opacity btn-secondary text-xs py-1.5 px-3"
                                                >
                                                    Generate Page
                                                </button>
                                                {lastRun && lastRun.selectedCustomer?.name === customer.name && (
                                                    <button
                                                        onClick={() => handleLoadLast(lastRun)}
                                                        className="transition-opacity btn-secondary flex items-center gap-1 bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200 text-xs py-1.5 px-3"
                                                    >
                                                        <RotateCcw size={12} /> Load Last
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {(step === 2 || step === 3) && isGenerating && (
                <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                    <div className="w-24 h-24 border-4 border-[#0077C8] border-t-transparent rounded-full animate-spin mb-6"></div>
                    <h3 className="text-2xl font-bold text-heading animate-pulse">Generating Personalized Experience...</h3>
                    <p className="text-subtext mt-2"> analyzing {selectedCustomer?.name}'s profile...</p>
                </div>
            )}

            {step === 3 && generatedHtml && !isGenerating && (
                <div className="animate-fadeIn">
                    <button onClick={() => setStep(1)} className="mb-6 flex items-center gap-2 text-subtext hover:text-heading transition-colors font-medium">
                        <ArrowRight className="rotate-180" size={18} /> Back to Data
                    </button>
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        {/* Preview Window */}
                        <div className="lg:col-span-3">
                            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden h-[800px] flex flex-col">
                                <div className="bg-gray-100 border-b border-gray-200 p-3 flex gap-2 items-center">
                                    <div className="flex gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                    </div>
                                    <div className="bg-white rounded-md px-4 py-1.5 text-xs text-gray-400 flex-1 text-center font-mono mx-8">
                                        {name.toLowerCase().replace(/\s+/g, '')}.com/quote/{selectedCustomer?.name.toLowerCase().replace(' ', '-')}
                                    </div>
                                </div>
                                <iframe
                                    srcDoc={generatedHtml}
                                    className="w-full h-full border-0"
                                    title="Generated Preview"
                                />
                            </div>
                        </div>

                        {/* Sidebar Controls */}
                        <div className="space-y-6">
                            <div className="content-card p-6">
                                <h3 className="text-sm font-bold text-heading uppercase tracking-widest mb-4"> personalization data</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs text-subtext font-bold uppercase">Target Segment</label>
                                        <p className="text-heading font-medium">{selectedCustomer?.condition}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-subtext font-bold uppercase">Primary Interest</label>
                                        <p className="text-heading font-medium">{selectedCustomer?.browse_history[0]}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-subtext font-bold uppercase">Generated Plans</label>
                                        <p className="text-heading font-medium">{generatedContent?.products?.length || 0} Options</p>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-gray-100">
                                    <button className="w-full btn-primary mb-3">Publish to Staging</button>
                                    <button className="w-full btn-ghost">Download HTML</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
