import React, { useState } from 'react';
import { MarketingCampaign } from './MarketingCampaign';
import { AudienceGenerator } from './AudienceGenerator';
import { AudienceScoring } from './AudienceScoring';
import { MarketingBrief } from './MarketingBrief';
import { Megaphone, Users, Briefcase, Brain } from 'lucide-react';
import { CombinedPersona } from '../types';
import { brandConfig } from '../config';
import { scoreAudienceSegments } from '../services/geminiService';

export const MarketingHub: React.FC = () => {
    console.log("Rendering MarketingHub");
    const [activeTab, setActiveTab] = useState<'CAMPAIGN' | 'AUDIENCE' | 'SCORING' | 'BRIEF'>('BRIEF');

    // Lifted State
    const [context, setContext] = useState(`${brandConfig.companyName} - Sports and Lifestyle Innovation`);
    const [personas, setPersonas] = useState<CombinedPersona[]>([]);
    const [isScoring, setIsScoring] = useState(false);

    const handleGenerateScores = async () => {
        setIsScoring(true);
        try {
            const scores = await scoreAudienceSegments(personas, context);
            if (scores && scores.length === personas.length) {
                const updatedPersonas = personas.map((p, i) => ({
                    ...p,
                    score: scores[i]
                }));
                // Save updated personas with scores
                setPersonas(updatedPersonas);

                // Trigger save to backend
                fetch('/api/save-run', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        featureId: 'audience_generator',
                        data: { personas: updatedPersonas, context }
                    })
                }).catch(err => console.error("Failed to save scaled audiences:", err));
            }
        } catch (error) {
            console.error("Failed to generate scores:", error);
            alert("Failed to generate audience scores.");
        } finally {
            setIsScoring(false);
        }
    };

    const handleLoadLast = async () => {
        try {
            const res = await fetch('/api/load-run/audience_generator');
            if (!res.ok) throw new Error("No saved run found");
            const data = await res.json();

            if (data.personas) setPersonas(data.personas);
            if (data.context) setContext(data.context);
        } catch (error) {
            console.warn(error);
            alert("No previous session found.");
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            {/* Top Bar */}
            <div className="page-header">
                <div className="max-w-7xl mx-auto px-6 w-full">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <Megaphone className="text-[#0077C8]" size={24} />
                            <h1 className="page-title">Marketing Experience Hub</h1>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="tab-scroll-container">
                        <button
                            onClick={() => setActiveTab('BRIEF')}
                            className={`tab-button ${activeTab === 'BRIEF' ? 'active' : 'inactive'}`}
                        >
                            <Briefcase size={18} /> Marketing Brief
                        </button>
                        <button
                            onClick={() => setActiveTab('AUDIENCE')}
                            className={`tab-button ${activeTab === 'AUDIENCE' ? 'active' : 'inactive'}`}
                        >
                            <Users size={18} /> Audience Generator
                        </button>
                        <button
                            onClick={() => setActiveTab('SCORING')}
                            className={`tab-button ${activeTab === 'SCORING' ? 'active' : 'inactive'}`}
                        >
                            <Brain size={18} /> Audience Scoring
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 bg-gray-100">
                <div className="max-w-7xl mx-auto">
                    {activeTab === 'BRIEF' && <MarketingBrief />}
                    {activeTab === 'AUDIENCE' && (
                        <AudienceGenerator
                            personas={personas}
                            setPersonas={setPersonas}
                            context={context}
                            setContext={setContext}
                        />
                    )}
                    {activeTab === 'SCORING' && (
                        <AudienceScoring
                            personas={personas}
                            setPersonas={setPersonas}
                            onGenerateScores={handleGenerateScores}
                            onLoadLast={handleLoadLast}
                            isScoring={isScoring}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};
