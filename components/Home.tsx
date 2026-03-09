import React from 'react';
import { AppMode } from '../types';
import { brandConfig } from '../config';
import {
    Megaphone, Sparkles, MessageSquare
} from 'lucide-react';

interface HomeProps {
    setMode: (mode: AppMode) => void;
}

export const Home: React.FC<HomeProps> = ({ setMode }) => {
    const tools = [
        {
            mode: AppMode.MARKETING_HUB,
            label: "Marketing Hub",
            icon: <Megaphone size={24} />,
            desc: "Campaign central & assets"
        },
        {
            mode: AppMode.PDP_HUB,
            label: "Product Hub",
            icon: <Sparkles size={24} />,
            desc: "Product enrichment & variants"
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
                <p className="text-xl text-subtext max-w-2xl mx-auto">
                    Select a tool to get started.
                </p>
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
