import React from 'react';
import { motion } from 'framer-motion';

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface BottomTabsProps {
  activeTab: string;
  onTabChange: (id: string) => void;
}

const tabs: Tab[] = [
  {
    id: 'home',
    label: 'Phim',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" className="h-5 w-5">
        <path d="M3 7h18M7 3l3 4M14 3l3 4M5 7v12a2 2 0 002 2h10a2 2 0 002-2V7" />
      </svg>
    )
  },
  {
    id: 'driver',
    label: 'Drive',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" className="h-5 w-5">
        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
      </svg>
    )
  },
  {
    id: 'profile',
    label: 'Tôi',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" className="h-5 w-5">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    )
  }
];

const BottomTabs: React.FC<BottomTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 px-4 pt-6 bg-linear-to-t from-[#05070a] via-[#05070a]/86 to-transparent pointer-events-none"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.55rem)' }}
    >
      <nav className="pointer-events-auto mx-auto flex h-[4.35rem] max-w-md items-center justify-around rounded-[1.55rem] border border-white/12 bg-[#070b12]/78 px-2.5 shadow-[0_-18px_60px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`relative flex h-[3.15rem] flex-1 items-center justify-center gap-2 rounded-[1.15rem] text-xs font-black uppercase tracking-[0.16em] transition ${
                active ? 'text-black' : 'text-white/42 active:text-white'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              {active && (
                <motion.span
                  layoutId="bottom-tab-active"
                  className="absolute inset-0 rounded-[1.15rem] bg-linear-to-br from-primary to-cyan-300 shadow-[0_12px_30px_rgba(6,182,212,0.34)]"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative z-10">{tab.icon}</span>
              <span className={`relative z-10 transition ${active ? 'max-w-20 opacity-100' : 'max-w-0 overflow-hidden opacity-0'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default React.memo(BottomTabs);
