import React from 'react';
import { Shield, Activity, Sliders, Settings } from 'lucide-react';
import { useAppStore, TabType } from '../stores/useAppStore';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, proxyMode } = useAppStore();

  const navItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'checkpoint', label: 'Checkpoint', icon: <Shield size={18} /> },
    { id: 'proxy', label: 'Proxy Log', icon: <Activity size={18} /> },
    { id: 'rules', label: 'Rules', icon: <Sliders size={18} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={18} /> }
  ];

  return (
    <aside className="w-16 flex-shrink-0 bg-[#0d0d0d] border-r border-[#222222] flex flex-col items-center justify-between py-4 select-none z-20">
      {/* Brand Icon & Status */}
      <div className="flex flex-col items-center gap-6">
        <div className="relative group cursor-pointer" onClick={() => setActiveTab('checkpoint')}>
          <div className="w-9 h-9 bg-[#141414] border border-[#2e2e2e] flex items-center justify-center font-bold text-amber">
            PF
          </div>
          <span
            className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${
              proxyMode === 'SANITIZE'
                ? 'bg-green-500 shadow-[0_0_6px_#22c55e]'
                : 'bg-red-500 shadow-[0_0_6px_#ef4444]'
            }`}
          />
        </div>

        {/* Nav Items */}
        <nav className="flex flex-col gap-1 w-full px-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={item.label}
                className={`w-12 h-12 flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-all ${
                  isActive
                    ? 'bg-[#181818] text-amber border border-amber/40 shadow-inner'
                    : 'text-[#888888] hover:text-[#ededed] hover:bg-[#141414] border border-transparent'
                }`}
              >
                {item.icon}
                <span className="scale-[0.85]">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Status Dot */}
      <div className="flex flex-col items-center gap-1">
        <div
          className={`w-2 h-2 rounded-full ${
            proxyMode === 'SANITIZE' ? 'bg-green-500' : 'bg-red-500 animate-pulse'
          }`}
        />
        <span className="text-[9px] font-mono text-[#666666] uppercase">
          {proxyMode === 'SANITIZE' ? '4040' : 'RAW'}
        </span>
      </div>
    </aside>
  );
};
