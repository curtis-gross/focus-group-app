import React, { useState } from 'react';
import { Play, FileText, Download, Loader2, Sparkles, PieChart, TrendingUp, Layers, Eye } from 'lucide-react';
import { brandConfig } from '../config';
import { analyzeRunwayVideo, compileRunwayAnalyses } from '../services/geminiService';

const RUNWAY_VIDEOS = [
    {
        id: '4nbyRLUpE-I',
        title: 'Spring 2025: Ralph Lauren in the Hamptons',
        url: 'https://www.youtube.com/watch?v=4nbyRLUpE-I',
        description: 'Seaside elegance and coastal Americana at Khalily Stables.'
    },
    {
        id: 'lgj4GmCtlBo',
        title: 'Fall 2024: Ralph\'s New York',
        url: 'https://www.youtube.com/watch?v=lgj4GmCtlBo',
        description: 'Understated sophistication and New York cityscapes.'
    },
    {
        id: '8kfJf8Or5sk',
        title: 'Purple Label Spring 2024: Amalfi Coast',
        url: 'https://www.youtube.com/watch?v=8kfJf8Or5sk',
        description: 'The allure of sun-drenched holidays and Mediterranean lifestyle.'
    }
];

interface TrendItem {
    title: string;
    description: string;
}

interface OutfitBreakdown {
    look: string;
    details: string;
}

interface AnalysisResult {
    trends: TrendItem[];
    outfit_breakdowns: OutfitBreakdown[];
    takeaways: string[];
    summary: string;
    timestamp: string;
    quick_takeaways?: string[];
    actionable_insights?: string[];
}

const EyeIcon = ({ size = 24, className = "" }) => <Eye size={size} className={className} />;

export const RunwayAnalysis: React.FC = () => {
    const [selectedVideoId, setSelectedVideoId] = useState(RUNWAY_VIDEOS[0].id);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

    const [activeTab, setActiveTab] = useState<'individual' | 'compiled'>('individual');
    const [isCompiling, setIsCompiling] = useState(false);
    const [compiledAnalysis, setCompiledAnalysis] = useState<AnalysisResult | null>(null);

    const selectedVideo = RUNWAY_VIDEOS.find(v => v.id === selectedVideoId)!;

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        try {
            const result = await analyzeRunwayVideo(selectedVideo.url);
            if (result) {
                setAnalysis(result);
                // Trigger save with video-specific ID
                fetch('/api/save-run', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        featureId: `runway_analysis_${selectedVideoId}`,
                        data: { ...result, videoId: selectedVideoId }
                    })
                });
            }
        } catch (error) {
            console.error("Analysis failed:", error);
            alert("Analysis failed. Please try again.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleLoadLast = async () => {
        try {
            const res = await fetch(`/api/load-run/runway_analysis_${selectedVideoId}`);
            if (!res.ok) throw new Error("No saved run found for this video");
            const data = await res.json();
            setAnalysis(data);
        } catch (error) {
            console.warn(error);
            alert("No previous analysis found for this specific collection.");
        }
    };

    const handleLoadCompiledAnalysis = async () => {
        try {
            const res = await fetch('/api/load-run/runway_analysis_compiled');
            if (!res.ok) throw new Error("No saved compiled run found");
            const data = await res.json();
            setCompiledAnalysis(data);
        } catch (error) {
            console.warn(error);
            alert("No previous compiled analysis found.");
        }
    };

    const handleCompileAnalysis = async () => {
        setIsCompiling(true);
        try {
            // Fetch the saved runs based on the hardcoded specific ID pattern
            const analysesToCompile = [];
            for (const video of RUNWAY_VIDEOS) {
                const res = await fetch(`/api/load-run/runway_analysis_${video.id}`);
                if (res.ok) {
                    analysesToCompile.push(await res.json());
                }
            }

            if (analysesToCompile.length === 0) {
                alert("No saved runway analyses found. Please load or analyze individual videos first.");
                setIsCompiling(false);
                return;
            }

            const result = await compileRunwayAnalyses(analysesToCompile);
            if (result) {
                setCompiledAnalysis(result);
                fetch('/api/save-run', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        featureId: 'runway_analysis_compiled',
                        data: { ...result }
                    })
                });
            }
        } catch (error) {
            console.error("Compile analysis failed:", error);
            alert("Compile analysis failed. Please try again.");
        } finally {
            setIsCompiling(false);
        }
    };

    return (
        <div className="app-container flex flex-col">
            {/* Top Bar - Styled to match Marketing Hub */}
            <div className="page-header">
                <div className="max-w-7xl mx-auto px-6 w-full">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <Eye className="text-[#0077C8]" size={24} />
                            <h1 className="page-title">Insights</h1>
                        </div>
                    </div>

                    {/* Navigation / Tabs Placeholder for sub-features if needed */}
                    <div className="tab-scroll-container">
                        <button 
                            className={`tab-button ${activeTab === 'individual' ? 'active' : 'inactive'}`}
                            onClick={() => setActiveTab('individual')}
                        >
                            <Play size={18} /> Runway Analysis
                        </button>
                        <button 
                            className={`tab-button ${activeTab === 'compiled' ? 'active' : 'inactive'}`}
                            onClick={() => setActiveTab('compiled')}
                        >
                            <Layers size={18} /> Compiled Analysis
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto w-full px-6 py-8">
                {activeTab === 'individual' && (
                <div className="grid grid-cols-1 gap-8">
                    {/* Video Selection & Preview */}
                    <div className="space-y-6">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-50 rounded-lg">
                                    <Play size={20} className="text-[#0077C8]" />
                                </div>
                                <label className="text-xl font-bold text-gray-900 tracking-wider uppercase">Collection Selector</label>
                            </div>
                            <select 
                                value={selectedVideoId}
                                onChange={(e) => {
                                    setSelectedVideoId(e.target.value);
                                    setAnalysis(null); // Clear analysis when switching
                                }}
                                className="input-field mb-6 font-mono text-sm border-gray-200"
                            >
                                {RUNWAY_VIDEOS.map(v => (
                                    <option key={v.id} value={v.id}>{v.url}</option>
                                ))}
                            </select>
                            
                            <div className="aspect-video rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                                <iframe
                                    width="100%"
                                    height="100%"
                                    src={`https://www.youtube.com/embed/${selectedVideoId}`}
                                    title="Runway Preview"
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                ></iframe>
                            </div>

                            <div className="flex justify-between items-start mt-8">
                                <div className="max-w-xl">
                                </div>
                                
                                <div className="flex gap-4">
                                    <button 
                                        onClick={handleLoadLast}
                                        className="btn-secondary flex items-center gap-2"
                                    >
                                        <Download size={18} /> Load History
                                    </button>
                                    <button 
                                        onClick={handleAnalyze}
                                        disabled={isAnalyzing}
                                        className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${brandConfig.ui.button.primary} ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                                        {isAnalyzing ? 'Reasoning...' : 'Analyze Runway'}
                                    </button>
                                </div>
                            </div>

                            {isAnalyzing && (
                                <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 rounded-xl border border-blue-200 animate-pulse mt-8">
                                    <Loader2 className="animate-spin text-[#0077C8]" size={16} />
                                    <span className="text-xs font-bold text-[#0077C8] uppercase tracking-widest">Gemini 3.1 Pro is processing runway visual cues...</span>
                                </div>
                            )}

                            {/* Full Analysis Results Section - All Below Video */}
                            {analysis && !isAnalyzing && (
                                <div className="mt-12 pt-12 border-t border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-1000 space-y-12">
                                
                                {/* 1. Key Trends - Detailed */}
                                <div>
                                    <h3 className="flex items-center gap-2 text-[#0077C8] font-bold text-sm uppercase tracking-[0.1em] mb-6">
                                        <TrendingUp size={16} /> Collection Trend Reports
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {analysis.trends.map((trend, i) => (
                                            <div key={i} className="flex flex-col gap-3 p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:border-[#0077C8]/30 transition-all group">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-[#0077C8] font-bold text-xs shrink-0 border border-blue-100">
                                                        {i + 1}
                                                    </div>
                                                    <h4 className="text-gray-900 font-bold tracking-wider uppercase text-sm">{trend.title}</h4>
                                                </div>
                                                <p className="text-gray-600 text-sm leading-relaxed transition-colors">
                                                    {trend.description}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 2. Outfit Breakdowns */}
                                {analysis.outfit_breakdowns && (
                                    <div>
                                        <h3 className="flex items-center gap-2 text-[#0077C8] font-bold text-sm uppercase tracking-[0.1em] mb-6">
                                            <EyeIcon size={16} /> Look-by-Look Intelligence
                                        </h3>
                                        <div className="grid grid-cols-1 gap-4">
                                            {analysis.outfit_breakdowns.map((item, i) => (
                                                <div key={i} className="p-6 bg-gradient-to-r from-gray-50 to-white rounded-2xl border-l-2 border-[#0077C8] border-y border-r border-gray-100">
                                                    <h4 className="text-[#0077C8] font-bold text-xs uppercase tracking-widest mb-2">{item.look}</h4>
                                                    <p className="text-gray-600 text-sm leading-relaxed">{item.details}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 3. Strategic Intelligence & Market Vision */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <h3 className="flex items-center gap-2 text-[#0077C8] font-bold text-sm uppercase tracking-[0.1em]">
                                            <Layers size={16} /> Strategic Intelligence
                                        </h3>
                                        <div className="space-y-4">
                                            {analysis.takeaways.map((takeaway, i) => (
                                                <p key={i} className="text-sm text-gray-900 font-medium border-l-[3px] border-[#0077C8] pl-6 py-4 leading-relaxed bg-gray-50 rounded-r-2xl border border-gray-100 border-l-0">
                                                    {takeaway}
                                                </p>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <h3 className="flex items-center gap-2 text-[#0077C8] font-bold text-sm uppercase tracking-[0.1em]">
                                            <PieChart size={16} /> Market Vision
                                        </h3>
                                        <div className="bg-gradient-to-br from-blue-50 to-white p-8 rounded-3xl border border-blue-100 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#0077C8] rounded-full blur-[60px] -mr-16 -mt-16 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity"></div>
                                            <p className="text-gray-800 text-base leading-relaxed relative z-10">
                                                {analysis.summary}
                                            </p>
                                            <div className="mt-8 flex items-center gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-t border-gray-100 pt-4">
                                                <Sparkles size={12} className="text-[#0077C8]" /> ARCHIVAL CURATION BY GEMINI 3.1 PRO
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            )}

                {activeTab === 'compiled' && (
                <div className="grid grid-cols-1 gap-8">
                    <div className="space-y-6">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 rounded-lg">
                                        <Layers size={20} className="text-[#0077C8]" />
                                    </div>
                                    <label className="text-xl font-bold text-gray-900 tracking-wider uppercase">Overarching Trend Analysis</label>
                                </div>
                                <div className="flex gap-4">
                                    <button 
                                        onClick={handleLoadCompiledAnalysis}
                                        className="btn-secondary flex items-center gap-2"
                                    >
                                        <Download size={18} /> Load Last
                                    </button>
                                    <button 
                                        onClick={handleCompileAnalysis}
                                        disabled={isCompiling}
                                        className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${brandConfig.ui.button.primary} ${isCompiling ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {isCompiling ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                                        {isCompiling ? 'Compiling...' : 'Generate New Analysis'}
                                    </button>
                                </div>
                            </div>

                            <p className="text-gray-600 mb-8 max-w-2xl text-sm">
                                This feature utilizes Gemini 3.1 Pro to synthesize insights across all previously analyzed collections ({RUNWAY_VIDEOS.length} collections total), 
                                delivering an overarching strategic market vision and unified brand identity report.
                            </p>

                            {isCompiling && (
                                <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 rounded-xl border border-blue-200 animate-pulse mt-8">
                                    <Loader2 className="animate-spin text-[#0077C8]" size={16} />
                                    <span className="text-xs font-bold text-[#0077C8] uppercase tracking-widest">Gemini 3.1 Pro is compiling cross-collection trends...</span>
                                </div>
                            )}

                            {compiledAnalysis && !isCompiling && (
                                <div className="mt-12 pt-12 border-t border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-1000 space-y-12">
                                
                                {/* 0. Quick Takeaways */}
                                {compiledAnalysis.quick_takeaways && (
                                    <div className="mb-12">
                                        <h3 className="flex items-center gap-2 text-[#0077C8] font-bold text-sm uppercase tracking-wider mb-6">
                                            <Sparkles size={16} /> Quick Dominant Takeaways
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {compiledAnalysis.quick_takeaways.map((takeaway, i) => (
                                                <div key={i} className="flex flex-col gap-3 p-6 bg-gradient-to-b from-blue-50/50 to-white rounded-2xl border border-gray-100 hover:border-[#0077C8]/50 transition-all items-center text-center">
                                                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#0077C8] font-bold text-lg mb-2 border border-blue-100">
                                                        {i + 1}
                                                    </div>
                                                    <p className="text-gray-900 text-sm leading-relaxed font-bold">
                                                        {takeaway}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 1. Key Trends - Detailed */}
                                <div>
                                    <h3 className="flex items-center gap-2 text-[#0077C8] font-bold text-sm uppercase tracking-wider mb-6">
                                        <TrendingUp size={16} /> Overarching Trends
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {compiledAnalysis.trends.map((trend, i) => (
                                            <div key={i} className="flex flex-col gap-3 p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:border-[#0077C8]/30 transition-all group">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-[#0077C8] font-bold text-xs shrink-0 border border-blue-100">
                                                        {i + 1}
                                                    </div>
                                                    <h4 className="text-gray-900 font-bold tracking-wider uppercase text-sm">{trend.title}</h4>
                                                </div>
                                                <p className="text-gray-600 text-sm leading-relaxed transition-colors">
                                                    {trend.description}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 2. Outfit Breakdowns */}
                                {compiledAnalysis.outfit_breakdowns && (
                                    <div>
                                        <h3 className="flex items-center gap-2 text-[#0077C8] font-bold text-sm uppercase tracking-wider mb-6">
                                            <EyeIcon size={16} /> Recurring Master Silhouettes
                                        </h3>
                                        <div className="grid grid-cols-1 gap-4">
                                            {compiledAnalysis.outfit_breakdowns.map((item, i) => (
                                                <div key={i} className="p-6 bg-gradient-to-r from-gray-50 to-white rounded-2xl border-l-[3px] border-[#0077C8] border-y border-r border-gray-100">
                                                    <h4 className="text-[#0077C8] font-bold text-xs uppercase tracking-widest mb-2">{item.look}</h4>
                                                    <p className="text-gray-600 text-sm leading-relaxed">{item.details}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 3. Strategic Intelligence & Market Vision */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <h3 className="flex items-center gap-2 text-[#0077C8] font-bold text-sm uppercase tracking-wider">
                                            <Layers size={16} /> Strategic Intelligence (Macro)
                                        </h3>
                                        <div className="space-y-4">
                                            {compiledAnalysis.takeaways.map((takeaway, i) => (
                                                <p key={i} className="text-sm text-gray-900 font-medium border-l-[3px] border-[#0077C8] pl-6 py-4 leading-relaxed bg-gray-50 rounded-r-2xl border border-gray-100 border-l-0">
                                                    {takeaway}
                                                </p>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <h3 className="flex items-center gap-2 text-[#0077C8] font-bold text-sm uppercase tracking-wider">
                                            <PieChart size={16} /> Overarching Market Vision
                                        </h3>
                                        <div className="bg-gradient-to-br from-blue-50 to-white p-8 rounded-3xl border border-blue-100 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#0077C8] rounded-full blur-[60px] -mr-16 -mt-16 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity"></div>
                                            <p className="text-gray-800 text-base leading-relaxed relative z-10">
                                                {compiledAnalysis.summary}
                                            </p>
                                            <div className="mt-8 flex items-center gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-t border-gray-100 pt-4">
                                                <Sparkles size={12} className="text-[#0077C8]" /> ARCHIVAL CURATION BY GEMINI 3.1 PRO (COMPILED)
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* 4. Actionable Insights */}
                                {compiledAnalysis.actionable_insights && (
                                    <div className="mt-8 pt-8 border-t border-gray-100">
                                        <h3 className="flex items-center gap-2 text-[#0077C8] font-bold text-sm uppercase tracking-wider mb-6">
                                            <FileText size={16} /> Actionable Intelligence for Future Collections
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {compiledAnalysis.actionable_insights.map((insight, i) => (
                                                <div key={i} className="p-6 bg-blue-50/50 rounded-2xl border-l-[3px] border-[#0077C8] border-y border-r border-gray-100">
                                                    <p className="text-gray-800 text-sm leading-relaxed flex gap-3">
                                                        <span className="text-[#0077C8] mt-0.5"><TrendingUp size={14} /></span>
                                                        {insight}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            )}
                        </div>
                    </div>
                </div>
                )}
            </div>
        </div>
    );
};
