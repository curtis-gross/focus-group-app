import React from 'react';
import { AppMode } from '../types';
import { brandConfig } from '../config';
import {
    Megaphone, Sparkles, MessageSquare, Users, FileText
} from 'lucide-react';

interface HomeProps {
    setMode: (mode: AppMode) => void;
}

export const Home: React.FC<HomeProps> = ({ setMode }) => {
    const tools = [
        {
            mode: AppMode.AUDIENCE_GEN,
            label: "Audiences",
            icon: <Users size={24} />,
            desc: "Segment and view audiences"
        },
        {
            mode: AppMode.MARKETING_BRIEF,
            label: "Marketing Brief",
            icon: <FileText size={24} />,
            desc: "Generate targeted marketing briefs"
        },
        {
            mode: AppMode.SYNTHETIC_FOCUS_GROUP,
            label: "Focus Group",
            icon: <MessageSquare size={24} />,
            desc: "Simulate user feedback"
        },
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center mb-16">
                <h1 className="text-4xl md:text-6xl font-bold text-heading tracking-tight mb-4">
                    Welcome to <span className="text-[#0077C8]">{brandConfig.ui.welcomeTitle}</span>
                </h1>
                <p className="text-xl text-subtext max-w-2xl mx-auto mb-8">
                    Select a tool to get started. Follow the workflow to generate dynamic campaigns:
                </p>
                
                <div className="max-w-3xl mx-auto bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-left mb-12">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">How to Use Focus Group AI</h2>
                    <ul className="space-y-3 text-gray-600">
                        <li className="flex items-start">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-[#0077C8] flex items-center justify-center font-bold text-sm mr-3">1</span>
                            <span><strong>Generate Audiences:</strong> Start here to create specialized user personas based on your target demographic data.</span>
                        </li>
                        <li className="flex items-start">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-[#0077C8] flex items-center justify-center font-bold text-sm mr-3">2</span>
                            <span><strong>Marketing Brief:</strong> Create a tailored marketing brief and assets for all your generated audiences.</span>
                        </li>
                        <li className="flex items-start">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-[#0077C8] flex items-center justify-center font-bold text-sm mr-3">3</span>
                            <span><strong>Focus Group:</strong> Test the generated marketing brief and assets against your synthetic audiences to get simulated feedback.</span>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="dashboard-grid">
                {tools.map((tool, idx) => (
                    <div
                        key={idx}
                        onClick={() => setMode(tool.mode)}
                        className="tool-card group"
                    >
                        <div className="tool-icon-wrapper">
                            {React.cloneElement(tool.icon as React.ReactElement, { className: "text-[#0077C8]" })}
                        </div>
                        <h3 className="tool-card-title">{tool.label}</h3>
                        <p className="tool-card-desc">{tool.desc}</p>
                        <span className="tool-card-action">
                            Open Tool &rarr;
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};
