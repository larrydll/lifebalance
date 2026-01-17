
import React from 'react';
import { AppView } from '../types';

interface NavigationProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentView, onNavigate }) => {
  const tabs = [
    { id: 'DAILY_TRACK' as AppView, label: '首页', icon: 'today' },
    { id: 'PROGRESS' as AppView, label: '洞察', icon: 'monitoring' },
    { id: 'ASSESSMENT' as AppView, label: '测评', icon: 'donut_large' },
    { id: 'ACTION_PLAN' as AppView, label: '计划', icon: 'track_changes' },
    { id: 'SUPPORT' as AppView, label: '咨询', icon: 'support_agent' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto h-20 bg-background-dark/80 backdrop-blur-xl border-t border-white/10 px-6 flex items-center justify-between z-50">
      {tabs.map((tab, idx) => {
        const isActive = currentView === tab.id;
        if (idx === 2) { // Middle button
          return (
            <div key={tab.id} className="relative -top-8">
              <button 
                onClick={() => onNavigate('ASSESSMENT')}
                className="flex size-14 items-center justify-center bg-primary rounded-full shadow-lg shadow-primary/30 text-background-dark border-4 border-background-dark active:scale-90 transition-transform"
              >
                <span className="material-symbols-outlined text-[32px] font-bold">add</span>
              </button>
            </div>
          );
        }
        return (
          <button 
            key={tab.id} 
            onClick={() => onNavigate(tab.id)}
            className={`flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-primary' : 'text-slate-400'}`}
          >
            <span className={`material-symbols-outlined text-[28px] ${isActive ? 'fill-1' : ''}`}>{tab.icon}</span>
            <span className="text-[10px] font-bold">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default Navigation;
