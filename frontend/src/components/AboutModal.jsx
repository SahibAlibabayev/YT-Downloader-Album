import { useTranslation } from 'react-i18next';
import { X, Info, Download, Github, ListMusic, HardDrive, Image as ImageIcon } from 'lucide-react';

export default function AboutModal({ isOpen, onClose }) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto glass-card rounded-2xl animate-[fadeInUp_0.3s_ease-out_forwards] border border-white/10 shadow-2xl">
        
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 glass-card border-b border-white/10 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Info size={24} className="text-[var(--theme-color-1)]" />
            <span className="font-bold text-white text-xl">{t('aboutTitle')}</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 space-y-8 text-gray-300">
          
          {/* Logo & Intro */}
          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-[var(--theme-color-1)] to-[var(--theme-color-2)] flex items-center justify-center shadow-[0_0_30px_rgba(var(--theme-color-1-rgb),0.3)]">
               <Download size={40} className="text-white" />
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">{t('appTitle')} 1.0</h2>
            <div className="flex items-center justify-center gap-2 text-base text-gray-400 font-medium">
              <span>Developed by</span>
              <span className="text-[var(--theme-color-2)] font-bold tracking-wide">Sahib Əlibabayev</span>
            </div>
            <p className="max-w-md mx-auto text-base leading-relaxed text-gray-300 mt-2">
              {t('aboutP1')}
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 mt-8">
            
            {/* Feature 1 */}
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl hover:bg-white/10 transition-colors group">
              <div className="bg-[var(--theme-color-1)]/20 w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <HardDrive size={20} className="text-[var(--theme-color-1)]" />
              </div>
              <h3 className="text-white text-lg font-bold mb-2">{t('aboutF1Title')}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{t('aboutF1Desc')}</p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl hover:bg-white/10 transition-colors group">
              <div className="bg-[var(--theme-color-1)]/20 w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ListMusic size={20} className="text-[var(--theme-color-1)]" />
              </div>
              <h3 className="text-white text-lg font-bold mb-2">{t('aboutF2Title')}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{t('aboutF2Desc')}</p>
            </div>

            {/* Feature 3 (Full Width) */}
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl hover:bg-white/10 transition-colors group md:col-span-2">
              <div className="bg-[var(--theme-color-1)]/20 w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ImageIcon size={20} className="text-[var(--theme-color-1)]" />
              </div>
              <h3 className="text-white text-lg font-bold mb-2">{t('aboutF3Title')}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{t('aboutF3Desc')}</p>
            </div>
            
          </div>

          {/* Links / Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-white/10">
            <button
              onClick={() => {
                const url = "https://github.com/SahibAlibabayev/YT-Downloader-Album";
                if (window?.electronAPI?.openExternal) window.electronAPI.openExternal(url);
                else window.open(url, "_blank");
              }}
              className="flex-1 flex items-center justify-center gap-3 bg-[#24292e] hover:bg-[#2f363d] text-white py-3 px-6 rounded-xl font-bold transition-all border border-white/10"
            >
              <Github size={18} />
              <span>{t('aboutGithubBtn')}</span>
            </button>
            
            <button
              onClick={() => {
                const url = "https://github.com/SahibAlibabayev/YT-Downloader-Album/releases/latest";
                if (window?.electronAPI?.openExternal) window.electronAPI.openExternal(url);
                else window.open(url, "_blank");
              }}
              className="flex-1 flex items-center justify-center gap-3 bg-gradient-to-r from-[var(--theme-color-1)] to-[var(--theme-color-2)] hover:opacity-90 text-white py-3 px-6 rounded-xl font-bold transition-all"
            >
              <Download size={18} />
              <span>{t('aboutDownloadBtn')}</span>
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}
