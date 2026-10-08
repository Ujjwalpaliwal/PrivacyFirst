import React, { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { RawModeBanner } from './components/RawModeBanner';
import { CheckpointView } from './components/CheckpointView';
import { ProxyLogView } from './components/ProxyLogView';
import { RulesView } from './components/RulesView';
import { SettingsView } from './components/SettingsView';
import { useAppStore } from './stores/useAppStore';

export const App: React.FC = () => {
  const { activeTab, setProxyMode, addProxyLog } = useAppStore();

  useEffect(() => {
    if (window.privacyFirst) {
      // Sync initial proxy mode
      window.privacyFirst.getProxyMode().then((mode) => setProxyMode(mode));

      // Subscribe to real-time proxy log events
      const unsubscribe = window.privacyFirst.onProxyLog((log) => {
        addProxyLog(log);
      });

      return () => {
        unsubscribe();
      };
    }
    return undefined;
  }, [setProxyMode, addProxyLog]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0a0a0a] text-[#ededed] overflow-hidden select-none">
      {/* Draggable Titlebar Area */}
      <div className="h-9 bg-[#0a0a0a] border-b border-[#1c1c1c] flex items-center justify-between px-4 custom-titlebar flex-shrink-0 z-40">
        <div className="flex items-center gap-2 text-xs font-mono text-[#888888]">
          <span className="w-2 h-2 bg-amber rounded-full"></span>
          <span className="font-semibold text-[#cccccc]">PrivacyFirst</span>
          <span className="text-[10px] text-[#555555]">v0.1.0 &middot; 127.0.0.1:4040</span>
        </div>
      </div>

      {/* Raw Mode Warning Banner (if mode === PASSTHROUGH) */}
      <RawModeBanner />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <main className="flex-1 flex flex-col overflow-hidden bg-[#0d0d0d]">
          {activeTab === 'checkpoint' && <CheckpointView />}
          {activeTab === 'proxy' && <ProxyLogView />}
          {activeTab === 'rules' && <RulesView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>
    </div>
  );
};
export default App;
