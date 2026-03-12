import React, { useState, useEffect } from 'react';
import { generateMarketingBrief, generateMarketingCampaignAssets, MarketingAssets } from '../services/geminiService';
import { brandConfig } from '../config';
import { Briefcase, Send, Loader2, Globe, Target, TrendingUp, Calendar, ShieldCheck, Zap, Layout, ArrowLeft, Image, Search, Mail, Youtube, Share2, MessageCircle, ThumbsUp, Sparkles, Heart, FileText, Users, X } from 'lucide-react';
import { MarketingBriefData } from '../types';

export const MarketingBrief: React.FC = () => {
  const [context, setContext] = useState("");
  const [goal, setGoal] = useState("");
  const [brief, setBrief] = useState<MarketingBriefData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<'en' | 'es'>('en');
  const [step, setStep] = useState(1);
  const [campaignAssetsMap, setCampaignAssetsMap] = useState<Record<string, MarketingAssets> | null>(null);
  const [selectedAudience, setSelectedAudience] = useState<string>("");
  const [isAssetLoading, setIsAssetLoading] = useState(false);
  const [generationStatus, setGenerationStatus] = useState("");
  const [activeTab, setActiveTab] = useState<'social' | 'search' | 'email' | 'youtube' | 'website'>('social');
  const [availableAudiences, setAvailableAudiences] = useState<any[]>([]);
  const [selectedAudienceModal, setSelectedAudienceModal] = useState<any | null>(null);

  const currentAssets = campaignAssetsMap && selectedAudience ? campaignAssetsMap[selectedAudience] : null;

  const handleGenerate = async () => {
    setIsLoading(true);
    setGenerationStatus("Drafting Marketing Brief...");
    try {
      // 1. Generate Brief
      const result = await generateMarketingBrief(context, goal, availableAudiences);

      if (result) {
        // 2. Generate Assets immediately
        setGenerationStatus("Designing Campaign Assets (Social, Search, Email, YouTube)...");
        const productName = result.productName || "Healthco Plan";

        let finalAssetsMap: Record<string, MarketingAssets> | null = null;
        try {
          finalAssetsMap = {};
          for (const aud of result.audiences) {
            const combinedGoal = `Goal: ${result.campaignGoal}. Persona: ${aud.name}`;
            const assets = await generateMarketingCampaignAssets(productName, combinedGoal);
            finalAssetsMap[aud.name] = assets;
          }
        } catch (assetErr) {
          console.error("Failed to auto-generate assets:", assetErr);
          // Continue with brief only if assets fail
        }

        // 3. Combine and Save
        const finalBrief = { ...result, campaignAssetsMap: finalAssetsMap || undefined };

        setBrief(finalBrief);
        if (finalAssetsMap) {
          setCampaignAssetsMap(finalAssetsMap);
          setSelectedAudience(result.audiences[0]?.name || "");
        }
        setStep(2);

        // Background Save
        fetch('/api/save-run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ featureId: 'marketing_brief', data: finalBrief })
        }).catch(err => console.error("Failed to save brief to server:", err));
      }
    } catch (error) {
      console.error(error);
      alert("Failed to generate marketing brief.");
    } finally {
      setIsLoading(false);
      setGenerationStatus("");
    }
  };

  const handleRegenerateAssets = async () => {
    if (!brief) return;
    setIsAssetLoading(true);
    try {
      const productName = brief.productName || "Healthco Plan";
      const newAssetsMap: Record<string, MarketingAssets> = {};
      for (const aud of brief.audiences) {
        const combinedGoal = `Goal: ${brief.campaignGoal}. Persona: ${aud.name}`;
        const assets = await generateMarketingCampaignAssets(productName, combinedGoal);
        newAssetsMap[aud.name] = assets;
      }

      setCampaignAssetsMap(newAssetsMap);
      if (brief.audiences.length > 0) setSelectedAudience(brief.audiences[0].name);

      // Update brief with new assets and persist
      const updatedBrief = { ...brief, campaignAssetsMap: newAssetsMap };
      setBrief(updatedBrief);
      fetch('/api/save-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureId: 'marketing_brief', data: updatedBrief })
      }).catch(err => console.error("Failed to save updated brief to server:", err));
    } catch (error) {
      console.error(error);
      alert("Failed to regenerate campaign assets.");
    } finally {
      setIsAssetLoading(false);
    }
  };

  const handleLoadLast = async () => {

    setIsLoading(true);
    try {
      const res = await fetch('/api/load-run/marketing_brief');
      if (!res.ok) throw new Error("No saved run");
      const data = await res.json();
      if (data) {
        setBrief(data);
        if (data.campaignAssetsMap) {
          setCampaignAssetsMap(data.campaignAssetsMap);
          if (data.audiences?.length) setSelectedAudience(data.audiences[0].name);
        }
        setStep(2);
      }
    } catch (e) {
      // Fallback
      alert("No saved brief found.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Attempt to load generated audiences from the Audience Generator
    const fetchAudiences = async () => {
      try {
        const response = await fetch('/api/load-run/audience_generator');
        if (response.ok) {
          const data = await response.json();
          // The data might be an array of personas directly, or wrapped in an object
          const personasData = Array.isArray(data) ? data : data.personas;
          if (personasData && Array.isArray(personasData)) {
            setAvailableAudiences(personasData);
          }
        }
      } catch (err) {
        console.error("Failed to fetch available audiences:", err);
      }
    };
    fetchAudiences();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="page-header">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="text-[#0077C8]" />
            <h1 className="page-title">Marketing Brief Generator</h1>
          </div>
          <p className="text-subtext mt-1">Generate comprehensive insurance marketing strategies and assets.</p>
        </div>
      </div>

      <div className="flex-1 bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">

      {step === 1 && (
        <div className="content-card mb-12 animate-fadeIn">
          <div className="space-y-4">
            <div className="mb-4">
              <label className="form-label">Company Context</label>
              <input
                type="text"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className="input-field"
                placeholder={`e.g. ${brandConfig.companyName} - Consumer Retail`}
              />
            </div>
            <div>
              <label className="form-label">Campaign Goal</label>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="input-field h-24"
                placeholder="Describe what you want to achieve (e.g., Increase Q3 sales for new product line)..."
              />
            </div>
            
            {availableAudiences.length > 0 && (
              <div className="mb-4">
                <label className="form-label mb-2 block">Audiences - from Audience Generator</label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {availableAudiences.map((aud, index) => (
                    <div 
                      key={index}
                      onClick={() => setSelectedAudienceModal(aud)}
                      className="p-3 rounded-lg border border-gray-200 bg-white hover:border-[#0077C8] hover:bg-blue-50 cursor-pointer shadow-sm transition-all"
                    >
                      <p className="font-bold text-gray-900 text-sm truncate">{aud.name}</p>
                      <p className="text-xs text-gray-500 truncate mt-1">{aud.personaName || aud.bio || "Generated Audience"}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-blue-600 mt-2">These audiences will automatically be included in your generated brief.</p>
              </div>
            )}
            
            <div className="flex gap-4">
              <button
                onClick={handleLoadLast}
                disabled={isLoading}
                className="btn-secondary"
                title="Load Last Run"
              >
                Load Last
              </button>
              <button
                onClick={handleGenerate}
                disabled={isLoading || !context.trim() || !goal.trim()}
                className={`flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isLoading ? <Loader2 className="animate-spin" /> : <Send size={18} />}
                {isLoading ? generationStatus : "Generate Brief & Assets"}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && brief && (
        <div className="animate-fadeIn">
          <button
            onClick={() => setStep(1)}
            className="flex items-center gap-2 text-subtext hover:text-[#0077C8] font-semibold mb-6 transition-colors"
          >
            <ArrowLeft size={20} /> Back to Input
          </button>

          <div className="content-card overflow-hidden p-0">
            <div className="p-6 flex justify-between items-center border-b border-gray-100">
              <div>
                <h3 className="text-2xl font-bold text-heading">{brief.title}</h3>
                <p className="text-subtext">Timestamp: {brief.timestamp}</p>
                <p className="text-subtext mt-2 text-sm">Campaign Goal: {brief.campaignGoal}</p>
              </div>
              <div className="flex bg-gray-50 rounded-lg p-1 border border-gray-200">
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${language === 'en' ? 'bg-white text-[#0077C8] shadow-sm' : 'text-subtext hover:text-heading'}`}
                >
                  English
                </button>
                <button
                  onClick={() => setLanguage('es')}
                  className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${language === 'es' ? 'bg-white text-[#0077C8] shadow-sm' : 'text-subtext hover:text-heading'}`}
                >
                  Español
                </button>
              </div>
            </div>

            <div className="p-8 space-y-12">

              {/* 1. Assumptions & Resources */}
              <section>
                <h4 className="section-header border-b-2 border-gray-200 pb-2 uppercase tracking-wide">
                  <span className="bg-[#0077C8] text-white w-8 h-8 flex items-center justify-center rounded-md text-sm font-bold">1</span>
                  Assumptions & Resources
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <Zap className="text-yellow-500 shrink-0" size={20} />
                      <div>
                        <p className="font-bold text-xs uppercase text-subtext tracking-wider">Budget</p>
                        <p className="text-heading font-medium">{brief.assumptions.budget}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Calendar className="text-[#0077C8] shrink-0" size={20} />
                      <div>
                        <p className="font-bold text-xs uppercase text-subtext tracking-wider">Timeline</p>
                        <p className="text-heading font-medium">{brief.assumptions.timeline}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <Target className="text-red-500 shrink-0" size={20} />
                      <div>
                        <p className="font-bold text-xs uppercase text-subtext tracking-wider">Primary Sales Focus</p>
                        <p className="text-heading font-medium">{brief.assumptions.primarySalesFocus}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <ShieldCheck className="text-green-600 shrink-0" size={20} />
                      <div>
                        <p className="font-bold text-xs uppercase text-subtext tracking-wider">Mitigation Strategy</p>
                        <p className="text-heading font-medium">{brief.assumptions.mitigationStrategy}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 2. Campaign Objective */}
              <section>
                <h4 className="section-header border-b-2 border-gray-200 pb-2 uppercase tracking-wide">
                  <span className="bg-[#0077C8] text-white w-8 h-8 flex items-center justify-center rounded-md text-sm font-bold">2</span>
                  Campaign Objective
                </h4>
                <div className="p-6 rounded-xl border border-gray-100 bg-gray-50/50">
                  <div className="mb-6">
                    <p className="font-bold text-xs uppercase text-subtext mb-2 tracking-wider">Goal</p>
                    <p className="text-xl text-heading font-medium italic leading-relaxed">"{language === 'en' ? brief.objective.goal.en : brief.objective.goal.es}"</p>
                  </div>
                  <div>
                    <p className="font-bold text-xs uppercase text-subtext mb-2 tracking-wider">Target KPI</p>
                    <p className="text-lg text-heading font-semibold">{language === 'en' ? brief.objective.targetKpi.en : brief.objective.targetKpi.es}</p>
                  </div>
                </div>
              </section>

              {/* 3. Target Audiences */}
              <section>
                <h4 className="section-header border-b-2 border-gray-200 pb-2 uppercase tracking-wide">
                  <span className="bg-[#0077C8] text-white w-8 h-8 flex items-center justify-center rounded-md text-sm font-bold">3</span>
                  Target Audiences (Personas)
                </h4>
                <div className="grid grid-cols-1 gap-8">
                  {brief.audiences.map((persona, i) => (
                    <div key={i} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
                        <div>
                          <h5 className="text-lg font-bold text-heading">{persona.name}</h5>
                          <p className="text-sm text-subtext">Source: {persona.sourceSegment}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-subtext uppercase">Age Range</p>
                          <p className="text-heading font-medium">{persona.ageRange}</p>
                        </div>
                      </div>
                      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 bg-white">
                        <div>
                          <p className="font-bold text-sm uppercase text-subtext mb-3">Pain Points & Drivers</p>
                          <ul className="space-y-2">
                            {persona.painPoints.map((point, pi) => (
                              <li key={pi} className="flex gap-2 text-sm text-gray-600">
                                <span className="text-red-500">•</span> {point}
                              </li>
                            ))}
                            {persona.drivers.map((driver, di) => (
                              <li key={di} className="flex gap-2 text-sm text-gray-600">
                                <span className="text-[#0077C8]">•</span> {driver}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                          <p className="font-bold text-sm uppercase text-[#0077C8] mb-2">Messaging Angle</p>
                          <p className="text-heading font-medium italic">
                            "{language === 'en' ? persona.messagingAngle.en : persona.messagingAngle.es}"
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 9. Campaign Preview (Generated Assets) */}
              <section>
                <div className="flex items-center justify-between mb-6 border-b-2 border-gray-200 pb-2">
                  <h4 className="section-header uppercase tracking-wide mb-0">
                    <span className="bg-[#0077C8] text-white w-8 h-8 flex items-center justify-center rounded-md text-sm font-bold">9</span>
                    Campaign Creative Preview
                  </h4>
                  {!campaignAssetsMap && (
                    <button
                      onClick={handleRegenerateAssets}
                      disabled={isAssetLoading}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {isAssetLoading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                      {isAssetLoading ? "Regenerating..." : "Regenerate Assets"}
                    </button>
                  )}
                </div>

                {isAssetLoading ? (
                  <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
                    <Loader2 className="animate-spin mx-auto text-[#0077C8] mb-4" size={48} />
                    <p className="text-gray-500 font-medium">Creating multi-channel assets based on brief...</p>
                  </div>
                ) : currentAssets && campaignAssetsMap ? (
                  <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden flex flex-col">
                    {/* Audience Toggles */}
                    <div className="flex justify-center pt-6 bg-white">
                      <div className="flex bg-gray-100 rounded-full p-1 shadow-sm border border-gray-200">
                        {Object.keys(campaignAssetsMap).map((aud) => (
                          <button
                            key={aud}
                            onClick={() => setSelectedAudience(aud)}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${selectedAudience === aud
                              ? 'bg-[#0077C8] text-white shadow-md'
                              : 'text-subtext hover:text-heading'
                              }`}
                          >
                            {aud}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-gray-200 bg-white overflow-x-auto">
                      <button
                        onClick={() => setActiveTab('social')}
                        className={`flex-1 py-4 px-2 text-sm font-medium flex items-center justify-center gap-2 min-w-[80px] transition-colors ${activeTab === 'social' ? 'bg-gray-50 text-[#0077C8] border-t-2 border-[#0077C8]' : 'text-subtext hover:text-heading'}`}
                      >
                        <Share2 size={18} /> Social
                      </button>
                      <button
                        onClick={() => setActiveTab('search')}
                        className={`flex-1 py-4 px-2 text-sm font-medium flex items-center justify-center gap-2 min-w-[80px] transition-colors ${activeTab === 'search' ? 'bg-gray-50 text-[#0077C8] border-t-2 border-[#0077C8]' : 'text-subtext hover:text-heading'}`}
                      >
                        <Search size={18} /> Search
                      </button>
                      <button
                        onClick={() => setActiveTab('email')}
                        className={`flex-1 py-4 px-2 text-sm font-medium flex items-center justify-center gap-2 min-w-[80px] transition-colors ${activeTab === 'email' ? 'bg-gray-50 text-[#0077C8] border-t-2 border-[#0077C8]' : 'text-subtext hover:text-heading'}`}
                      >
                        <Mail size={18} /> Email
                      </button>
                      <button
                        onClick={() => setActiveTab('youtube')}
                        className={`flex-1 py-4 px-2 text-sm font-medium flex items-center justify-center gap-2 min-w-[80px] transition-colors ${activeTab === 'youtube' ? 'bg-gray-50 text-[#0077C8] border-t-2 border-[#0077C8]' : 'text-subtext hover:text-heading'}`}
                      >
                        <Youtube size={18} /> YouTube
                      </button>
                      <button
                        onClick={() => setActiveTab('website')}
                        className={`flex-1 py-4 px-2 text-sm font-medium flex items-center justify-center gap-2 min-w-[80px] transition-colors ${activeTab === 'website' ? 'bg-gray-50 text-[#0077C8] border-t-2 border-[#0077C8]' : 'text-subtext hover:text-heading'}`}
                      >
                        <Globe size={18} /> Website
                      </button>
                    </div>

                    {/* Content Area */}
                    <div className="p-8 bg-gray-50 flex items-center justify-center min-h-[500px]">
                      <div className={`w-full flex flex-col items-center ${activeTab === 'website' ? 'max-w-4xl' : 'max-w-lg'}`}>
                        {/* Social Media Preview */}
                        {activeTab === 'social' && (
                          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-full">
                            <div className="p-3 flex items-center gap-3 border-b border-gray-100">
                              <div className="w-8 h-8 bg-[#0077C8] rounded-full"></div>
                              <p className="font-bold text-sm text-heading">{brandConfig.companyName}</p>
                            </div>
                            <div className="aspect-square bg-gray-100">
                              {currentAssets.image ? (
                                <img src={currentAssets.image} alt="Campaign" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">Image Failed</div>
                              )}
                            </div>
                            <div className="p-4">
                              <div className="flex gap-4 mb-3">
                                <Heart size={24} className="text-gray-400" />
                                <MessageCircle size={24} className="text-gray-400" />
                                <Share2 size={24} className="text-gray-400" />
                              </div>
                              <p className="text-sm text-gray-800 mb-2">
                                <span className="font-bold mr-2 text-heading">{brandConfig.companyName}</span>
                                {currentAssets.social.caption}
                              </p>
                              <p className="text-[#0077C8] text-sm">
                                {currentAssets.social.hashtags.join(' ')}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Search Ad Preview */}
                        {activeTab === 'search' && (
                          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 w-full">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-black text-sm">Ad</span>
                              <span className="text-gray-500 text-xs">·</span>
                              <span className="text-gray-500 text-xs">{currentAssets.search.url}</span>
                            </div>
                            <h3 className="text-xl text-[#0077C8] hover:underline cursor-pointer font-medium mb-2">
                              {currentAssets.search.headline}
                            </h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                              {currentAssets.search.description}
                            </p>

                            <div className="mt-6 pt-6 border-t border-gray-100">
                              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Campaign Image Asset</h4>
                              <div className="h-32 w-48 bg-white rounded-lg overflow-hidden border border-gray-200">
                                {currentAssets.image && <img src={currentAssets.image} className="w-full h-full object-contain" />}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Email Preview */}
                        {activeTab === 'email' && (
                          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-full">
                            <div className="bg-gray-50 p-3 border-b border-gray-200 text-xs text-gray-500 flex justify-between">
                              <span>From: {brandConfig.companyName}</span>
                              <span>Just now</span>
                            </div>
                            <div className="p-5">
                              <h3 className="font-bold text-lg text-heading mb-1">{currentAssets.email.subject}</h3>
                              <p className="text-gray-500 text-sm mb-6">{currentAssets.email.preheader}</p>

                              <div className="border-t border-gray-100 pt-6">
                                {currentAssets.image && (
                                  <img src={currentAssets.image} className="w-full h-auto max-h-80 object-contain rounded-lg mb-6 bg-gray-50" />
                                )}
                                <p className="text-gray-800 text-sm leading-relaxed mb-6">
                                  {currentAssets.email.body}
                                </p>
                                <button className={`w-full py-3 rounded-full font-bold text-sm bg-[#0077C8] text-white hover:bg-[#0061a3] transition-colors`}>
                                  View Plan Details
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* YouTube Shorts Preview */}
                        {activeTab === 'youtube' && (
                          <div className="bg-black rounded-2xl shadow-xl overflow-hidden relative aspect-[9/16] max-h-[600px] mx-auto w-full max-w-[340px]">
                            {currentAssets.image && (
                              <img src={currentAssets.image} className="absolute inset-0 w-full h-full object-cover opacity-70" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80"></div>

                            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-[#0077C8] rounded-full flex items-center justify-center font-bold text-xs text-white">H</div>
                                <span className="font-bold text-sm">@{brandConfig.companyName.replace(/\s+/g, '').toLowerCase()}</span>
                                <button className="bg-white text-black text-xs font-bold px-3 py-1.5 rounded-full">Subscribe</button>
                              </div>
                              <p className="text-sm mb-2 font-bold">{currentAssets.youtube.title}</p>
                              <div className="bg-white/20 backdrop-blur-md rounded-lg p-3 mb-4 border border-white/10">
                                <p className="text-xs text-white/90 font-mono">SCRIPT:</p>
                                <p className="text-xs italic text-white/80">{currentAssets.youtube.script}</p>
                              </div>
                              <button className={`w-full py-3 rounded-lg font-bold text-sm bg-white text-black hover:bg-gray-200 transition-colors`}>
                                Learn More
                              </button>
                            </div>

                            {/* UI Icons Overlay */}
                            <div className="absolute right-2 bottom-24 flex flex-col gap-6 items-center">
                              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <ThumbsUp size={24} className="text-white fill-white/20" />
                              </div>
                              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <MessageCircle size={24} className="text-white fill-white/20" />
                              </div>
                              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <Share2 size={24} className="text-white fill-white/20" />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Website Preview */}
                        {activeTab === 'website' && (
                          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full w-full">
                            {/* Fake Nav */}
                            <div className="bg-white border-b border-gray-200 h-14 flex items-center justify-between px-4 gap-4 shrink-0">
                              <div className="text-[#0077C8] font-bold text-xl tracking-tighter">Healthco</div>
                              <div className="h-9 bg-gray-100 rounded-full w-full max-w-xs flex items-center px-4 text-gray-500 text-xs font-medium">
                                <Search size={14} className="mr-2" /> Search
                              </div>
                              <div className="text-gray-600 text-xs font-bold flex items-center gap-4">
                                <span className="hidden sm:inline">Members</span>
                                <span className="hidden sm:inline">Employers</span>
                                <span>Sign In</span>
                              </div>
                            </div>

                            <div className="p-6 flex-1 overflow-y-auto">
                              {/* Main Product Hero */}
                              <div className="flex flex-col sm:flex-row gap-8 mb-8">
                                {/* Image Container */}
                                <div className="w-full sm:w-1/2 aspect-square bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center relative group">
                                  {currentAssets.image ? (
                                    <img
                                      src={currentAssets.image}
                                      alt="Product"
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                  ) : (
                                    <div className="text-gray-400 text-sm font-medium">Image</div>
                                  )}
                                </div>

                                {/* Product Details */}
                                <div className="w-full sm:w-1/2 flex flex-col justify-center">
                                  <div className="text-green-600 text-xs font-bold mb-2">Most Popular</div>
                                  <h1 className="text-3xl font-bold text-heading leading-none tracking-tight mb-2">{brief.productName || "Healthco Plan"}</h1>
                                  <h2 className="text-lg text-subtext font-medium mb-4">Individual & Family Plans</h2>

                                  <div className="mb-6">
                                    <span className="text-2xl font-bold text-heading">Est. $340.00</span>
                                    <span className="text-subtext">/month</span>
                                  </div>

                                  <p className="text-base text-gray-800 mb-8 leading-relaxed">
                                    {currentAssets.search?.description || "Coverage that fits your life and budget."}
                                  </p>

                                  <div className="space-y-3">
                                    <button className="w-full bg-[#0077C8] text-white hover:bg-[#0061a3] py-4 rounded-full font-bold text-sm transition-colors">
                                      Get a Quote
                                    </button>
                                    <button className="w-full bg-white border border-gray-300 text-gray-900 py-4 rounded-full font-bold text-sm hover:bg-gray-50 transition-colors">
                                      View Benefits
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-gray-200 border-dashed rounded-xl p-12 text-center text-gray-500">
                    <p>Click "Generate Brief & Assets" to visualize this campaign across channels.</p>
                  </div>
                )}
              </section>

            </div>
          </div>
        </div>
      )}
        </div>
      </div>

      {/* Audience Details Modal */}
      {selectedAudienceModal && (
          <div className="fixed inset-0 bg-heading/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100 relative">
                  <div className="absolute top-0 left-0 w-full h-2 bg-[#0077C8]"></div>
                  {/* Header */}
                  <div className="bg-white p-8 border-b border-gray-50 flex justify-between items-start">
                      <div className="flex gap-6 hover:scale-[1.02] transition-transform">
                          <div className="w-24 h-24 rounded-2xl bg-gray-50 overflow-hidden shadow-sm flex-shrink-0 border border-gray-100">
                              {selectedAudienceModal.imageUrl ? <img src={selectedAudienceModal.imageUrl} className="w-full h-full object-cover" /> : <Users size={40} className="m-auto mt-8 text-subtext" />}
                          </div>
                          <div className="mt-2">
                              <div className="flex items-center gap-3 mb-2">
                                  <h3 className="text-3xl font-black text-heading">{selectedAudienceModal.name}</h3>
                                  {selectedAudienceModal.isWildcard && <span className="px-3 py-1 bg-red-50 text-red-600 text-[10px] font-black rounded-full uppercase tracking-widest border border-red-100">Wildcard</span>}
                              </div>
                              <div className="text-subtext font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-[#0077C8]" />
                                  {selectedAudienceModal.personaName}
                              </div>
                          </div>
                      </div>
                      <button onClick={() => setSelectedAudienceModal(null)} className="text-subtext hover:text-heading transition-all p-2 hover:bg-gray-100 rounded-full"><X size={24} /></button>
                  </div>

                  {/* Content */}
                  <div className="p-10 overflow-y-auto space-y-8 custom-scrollbar">
                      {/* Bio */}
                      <div>
                          <h4 className="text-[10px] font-black text-subtext uppercase tracking-widest mb-3">Bio & Lifestyle Persona</h4>
                          <p className="text-heading text-lg leading-relaxed font-medium italic">"{selectedAudienceModal.bio}"</p>
                      </div>

                      {/* Demographics */}
                      <div className="grid grid-cols-2 gap-8">
                          <div>
                              <h4 className="text-[10px] font-black text-subtext uppercase tracking-widest mb-3">Audience Demographics</h4>
                              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 font-bold text-heading text-sm shadow-sm">
                                  {selectedAudienceModal.demographics || "N/A"}
                              </div>
                          </div>
                          <div>
                              <h4 className="text-[10px] font-black text-subtext uppercase tracking-widest mb-3">Interest Tags</h4>
                              <div className="flex flex-wrap gap-2">
                                  {selectedAudienceModal.details?.lifestyle_tags?.map((tag: string, i: number) => (
                                      <span key={i} className="px-4 py-1.5 bg-blue-50 text-[#0077C8] rounded-xl text-xs font-black border border-blue-100 shadow-sm">{tag}</span>
                                  )) || <span className="text-subtext italic">No specific tags identified.</span>}
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Footer */}
                  <div className="p-6 border-t border-gray-800 bg-[#111] flex justify-end">
                      <button
                          onClick={() => setSelectedAudienceModal(null)}
                          className="px-6 py-2 bg-white text-black rounded-lg font-bold hover:bg-gray-200 transition-colors"
                      >
                          Close
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};
