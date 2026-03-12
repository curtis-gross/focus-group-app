import React from 'react';
import { AppMode } from '../types';
import { brandConfig } from '../config';
import {
  Home,
  Menu,
  X,
  Megaphone,
  Sparkles,
  MessageSquare,
  TrendingUp,
  HeartHandshake,
  Monitor
} from 'lucide-react';

interface NavigationProps {
  currentMode: AppMode;
  setMode: (mode: AppMode) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentMode, setMode, isMobileMenuOpen, setIsMobileMenuOpen }) => {

  const navItems = [
    { id: AppMode.HOME, label: 'Home', icon: Home },
    { id: AppMode.MARKETING_HUB, label: 'Marketing Hub', icon: Megaphone },
    { id: AppMode.SYNTHETIC_FOCUS_GROUP, label: 'Focus Group', icon: MessageSquare },
    { id: AppMode.PDP_HUB, label: 'Product Hub', icon: Sparkles },
    { id: AppMode.FEASIBILITY_ANALYSIS, label: 'Feasibility Analysis', icon: TrendingUp },
    { id: AppMode.ASSISTANT, label: 'Assistant', icon: HeartHandshake },
    { id: AppMode.CONCIERGE, label: 'Concierge', icon: Monitor },
  ];

  return (
    <>
      {/* Mobile Header */}
      <div className={`md:hidden fixed top-0 left-0 w-full ${brandConfig.ui.button.primary} h-16 flex items-center justify-between px-4 z-50 text-white shadow-md`}>
        <div className="flex items-center gap-2">
          {/* Fallback to text if logo missing, but trying image first */}
          <span className="font-bold text-xl tracking-tight">{brandConfig.companyName}</span>
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
          <span className="text-2xl font-bold text-[#0077C8]">Healthco</span>
        </div>

        <div className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon!;
            const isActive = currentMode === item.id;
            return (
              <button
                key={item.id}
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
            );
          })}
        </div>

        <div className="w-full p-6 border-t border-gray-200 bg-white mt-auto">
          <div className="flex items-center space-x-3">
            <div
              className="w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-lg"
              style={{ backgroundColor: brandConfig.colors.accent }}
            >
              P
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{brandConfig.companyName} User</p>
              <p className="text-xs text-gray-500">AI Lab Beta</p>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};
