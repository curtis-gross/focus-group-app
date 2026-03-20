import React from 'react';
import { AppMode } from '../types';
import { brandConfig } from '../config';
import {
  Home,
  Menu,
  X,
  Users,
  FileText,
  Sparkles,
  MessageSquare,
  TrendingUp,
  HeartHandshake,
  Monitor,
  UserPlus,
  Eye,
  Layers,
  Settings,
  Save,
  RotateCcw,
  Loader2
} from 'lucide-react';
import { useCompanyContext } from '../context/CompanyContext';

interface NavigationProps {
  currentMode: AppMode;
  setMode: (mode: AppMode) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
  
  
}

export const Navigation: React.FC<NavigationProps> = ({ currentMode, setMode, isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const { name, description, setName, setDescription, saveContext, loadLast } = useCompanyContext();
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [tempName, setTempName] = React.useState(name);
  const [tempDesc, setTempDesc] = React.useState(description);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isLoadingLast, setIsLoadingLast] = React.useState(false);

  // Sync temp state when modal opens
  React.useEffect(() => {
    if (isSettingsOpen) {
      setTempName(name);
      setTempDesc(description);
    }
  }, [isSettingsOpen, name, description]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await saveContext(tempName, tempDesc);
      setIsSettingsOpen(false);
    } catch (e) {
      alert("Failed to save company context to filesystem.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadLast = async () => {
    setIsLoadingLast(true);
    try {
      await loadLast();
    } catch (e) {
      alert("Failed to load last context.");
    } finally {
      setIsLoadingLast(false);
    }
  };

  const navItems = [
    { id: AppMode.HOME, label: 'Home', icon: Home },
    { id: AppMode.INSIGHTS, label: 'Insights', icon: Eye },
    { id: AppMode.AUDIENCE_GEN, label: 'Audiences', icon: Users },
    { id: AppMode.SYNTHETIC_USERS, label: 'Synthetic Users', icon: UserPlus },
    { id: AppMode.MARKETING_BRIEF, label: 'Marketing Brief', icon: FileText },
    { id: AppMode.PDP_HUB, label: 'Content', icon: Layers },
    { id: AppMode.SYNTHETIC_FOCUS_GROUP, label: 'Focus Group', icon: MessageSquare },
  ];

  return (
    <>
      {/* Mobile Header */}
      <div className={`md:hidden fixed top-0 left-0 w-full ${brandConfig.ui.button.primary} h-16 flex items-center justify-between px-4 z-50 text-white shadow-md`}>
        <div className="flex items-center gap-2">
          {/* Fallback to text if logo missing, but trying image first */}
          <span className="font-bold text-xl tracking-tight">{name}</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar (Desktop & Mobile Overlay) */}
      <nav className={`
        nav-sidebar transition-transform duration-300 ease-in-out pt-16 md:pt-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="hidden md:flex items-center justify-center p-6 border-b border-gray-200">
          <img src={brandConfig.logo.sidebar} alt="QVC AI" className="h-16 w-auto" />
        </div>

        <div className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon!;
            const isActive = currentMode === item.id;
            return (
              <React.Fragment key={item.id}>
                <button
                  onClick={() => {
                    setMode(item.id as AppMode);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`
                    w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium text-sm
                    ${isActive
                      ? `${brandConfig.ui.button.primary}`
                      : `text-gray-600 hover:bg-gray-100 hover:text-[#0077C8]`}
                  `}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
                
                {/* Company Context button removed from here, accessible via user settings instead */}
              </React.Fragment>
            );
          })}
        </div>

        <div className="w-full p-6 border-t border-gray-200 bg-white mt-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div
                className="w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-lg shrink-0"
                style={{ backgroundColor: brandConfig.colors.accent }}
              >
                {name.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-gray-900 truncate">{name} AI User</p>
                <p className="text-xs text-gray-500">AI Lab Beta</p>
              </div>
            </div>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-gray-400 hover:text-[#0077C8] transition-colors rounded-lg hover:bg-gray-50"
              title="Company Context Settings"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#0077C8]/10 rounded-lg text-[#0077C8]">
                  <Settings size={20} />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Company Context</h2>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Company Name</label>
                <input 
                  type="text" 
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0077C8] focus:border-transparent transition-all outline-none font-medium text-gray-900"
                  placeholder="e.g. QVC"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Company Description / Context</label>
                <textarea 
                  value={tempDesc}
                  onChange={(e) => setTempDesc(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0077C8] focus:border-transparent transition-all outline-none font-medium text-gray-900 resize-none"
                  placeholder="Describe what your company does and who your customers are..."
                />
                <p className="mt-2 text-[11px] text-gray-400 italic">
                  This context is used to calibrate all AI features (marketing briefs, audiences, focus groups, etc.) to your specific brand goals.
                </p>
              </div>
            </div>
            
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button 
                onClick={handleLoadLast}
                disabled={isLoadingLast}
                className="mr-auto px-4 py-2.5 text-xs font-bold text-gray-500 hover:text-[#0077C8] transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                <RotateCcw size={14} className={isLoadingLast ? 'animate-spin' : ''} />
                {isLoadingLast ? 'Loading...' : 'Load Last Saved'}
              </button>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="px-6 py-2.5 bg-[#0077C8] text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
