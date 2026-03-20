import React from 'react';
import { AppMode } from '../types';
import { brandConfig } from '../config';
import { 
  BarChart3, 
  Users, 
  Target, 
  MessageSquare, 
  CheckCircle2, 
  FileText, 
  Zap, 
  Search,
  ArrowRight,
  Eye,
  UserPlus,
  Layers,
  Sparkles
} from 'lucide-react';
import { useCompanyContext } from '../context/CompanyContext';

interface HomeProps {
    setMode: (mode: AppMode) => void;
}

export const Home: React.FC<HomeProps> = ({ setMode }) => {
    const { name } = useCompanyContext();
    const tools = [
        {
            mode: AppMode.INSIGHTS,
            label: "Insights",
            icon: <Eye size={24} />,
            desc: "Analyze live broadcast performance and viral shopping trends."
        },
        {
            mode: AppMode.AUDIENCE_GEN,
            label: "Audiences",
            icon: <Users size={24} />,
            desc: "Segment shoppers and generate deep AI personas."
        },
        {
            mode: AppMode.SYNTHETIC_USERS,
            label: "Synthetic Users",
            icon: <UserPlus size={24} />,
            desc: "Build and interact with a database of synthetic customers."
        },
        {
            mode: AppMode.MARKETING_BRIEF,
            label: "Marketing Brief",
            icon: <FileText size={24} />,
            desc: "Generate multi-channel strategies and creative assets."
        },
        {
            mode: AppMode.PDP_HUB,
            label: "Content Hub",
            icon: <Layers size={24} />,
            desc: "Personalize product content and lifestyle imagery."
        },
        {
            mode: AppMode.SYNTHETIC_FOCUS_GROUP,
            label: "Focus Group",
            icon: <MessageSquare size={24} />,
            desc: "Simulate real-time feedback from target segments."
        },
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center mb-16">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="p-3 bg-[#0077C8]/10 rounded-2xl backdrop-blur-md">
                    <BarChart3 className="w-8 h-8 text-[#0077C8]" />
                  </div>
                  <h1 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tight">
                    Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0077C8] to-[#005a9e]">{name} AI</span>
                  </h1>
                </div>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto font-medium leading-relaxed">
                  The centralized commerce intelligence hub. Tailor your brand's growth with AI-powered shopper insights, synthetic focus groups, and automated marketing strategies.
                </p>
                
                <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-left mb-12">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Sparkles className="text-[#0077C8]" size={20} />
                        The QVC AI Workflow
                    </h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="space-y-2">
                            <div className="w-8 h-8 rounded-full bg-blue-50 text-[#0077C8] flex items-center justify-center font-bold text-sm">1</div>
                            <h3 className="font-bold text-gray-900">Define Audiences</h3>
                            <p className="text-sm text-gray-600">Start by creating detailed synthetic personas based on your shopper data.</p>
                        </div>
                        <div className="space-y-2">
                            <div className="w-8 h-8 rounded-full bg-blue-50 text-[#0077C8] flex items-center justify-center font-bold text-sm">2</div>
                            <h3 className="font-bold text-gray-900">Build Campaign</h3>
                            <p className="text-sm text-gray-600">Generate a marketing brief and tailored creative assets for each segment.</p>
                        </div>
                        <div className="space-y-2">
                            <div className="w-8 h-8 rounded-full bg-blue-50 text-[#0077C8] flex items-center justify-center font-bold text-sm">3</div>
                            <h3 className="font-bold text-gray-900">Simulate Results</h3>
                            <p className="text-sm text-gray-600">Test your content in the focus group to get instant simulated feedback.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tools.map((tool, idx) => (
                    <div
                        key={idx}
                        onClick={() => setMode(tool.mode)}
                        className="tool-card group p-8 bg-white rounded-2xl border border-gray-100 hover:border-[#0077C8] transition-all duration-300 cursor-pointer shadow-sm hover:shadow-xl relative overflow-hidden h-full flex flex-col"
                    >
                        <div className="tool-icon-wrapper mb-6 w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-[#0077C8] group-hover:text-white transition-colors">
                            {React.cloneElement(tool.icon as React.ReactElement<any>, { className: "text-[#0077C8] group-hover:text-white" })}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-[#0077C8] transition-colors">{tool.label}</h3>
                        <p className="text-gray-600 text-sm leading-relaxed mb-6 flex-grow">{tool.desc}</p>
                        <div className="flex items-center text-[#0077C8] font-bold text-sm">
                            Open Tool 
                            <span className="ml-2 transform group-hover:translate-x-1 transition-transform">&rarr;</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
