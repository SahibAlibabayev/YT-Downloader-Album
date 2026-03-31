import { useEffect, useState } from 'react';
import { X, Settings, Folder, Info } from 'lucide-react';

const isElectron = !!window?.electronAPI?.isElectron;

export default function SettingsModal({ isOpen, onClose }) {
  const [version, setVersion] = useState('');
  const [downloadPath, setDownloadPath] = useState('');

  useEffect(() => {
    if (!isOpen || !isElectron) return;
    window.electronAPI.getVersion().then(v => setVersion(v));
    window.electronAPI.getDownloadPath().then(p => setDownloadPath(p));
  }, [isOpen]);

  const handleOpenDownloads = () => {
    window.electronAPI.openDownloadsFolder();
  };

  const handleChangeDownloadPath = async () => {
    const newPath = await window.electronAPI.changeDownloadPath();
    if (newPath) {
      setDownloadPath(newPath);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4 glass-card rounded-2xl overflow-hidden animate-[fadeInUp_0.3s_ease-out_forwards]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Settings size={20} className="text-[var(--theme-color-1)]" />
            <span className="font-bold text-white text-lg">Settings</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest">
              Download Location
            </label>
            <div className="bg-black/30 border border-white/5 rounded-xl p-3 mb-3 text-sm text-gray-300 break-all select-all font-mono">
              {downloadPath || "Loading..."}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleOpenDownloads}
                className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white transition-all shadow-lg"
              >
                <Folder size={18} />
                <span>Open Folder</span>
              </button>
              
              <button
                onClick={handleChangeDownloadPath}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[var(--theme-color-1)] to-[var(--theme-color-2)] hover:opacity-90 rounded-xl px-4 py-3 text-sm font-bold text-white transition-all shadow-lg"
              >
                <span>Change Location</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between bg-black/20">
          {/* Version */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Info size={12} />
            <span>v{version}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-sm font-medium">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
