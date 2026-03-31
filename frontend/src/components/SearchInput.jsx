import { useTranslation } from 'react-i18next';
import { Search, Loader2, Video, ListVideo, Disc3, Calendar, ListMusic } from 'lucide-react';

export default function SearchInput({ 
  url, setUrl, handleFetchInfo, isLoading, 
  downloadMode, setDownloadMode
}) {
  const { t } = useTranslation();

  const isLocked = downloadMode === null;

  return (
    <div className="glass-card rounded-[20px] p-6 sm:p-10 mb-8 w-full transition-all duration-300">
      
      {/* İndirme Modu Seçimi (Segmented Control) */}
      <div className="flex bg-black/30 rounded-[16px] p-[0.35rem] mb-6 border border-[var(--border-subtle)] relative max-w-2xl mx-auto shadow-inner">
        
        {/* Hareketli Arka Plan */}
        <div
          className={`absolute top-[0.35rem] bottom-[0.35rem] w-[calc(33.333%-0.25rem)] rounded-[12px] transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] shadow-[0_4px_15px_var(--theme-glow)] ${
            downloadMode === 'single' ? 'left-[0.35rem] bg-[var(--theme-color-1)] opacity-100' :
            downloadMode === 'playlist' ? 'left-[calc(33.333%+0.1rem)] bg-[var(--theme-color-1)] opacity-100' :
            downloadMode === 'album' ? 'left-[calc(66.666%-0.15rem)] bg-[var(--theme-color-1)] opacity-100' :
            'opacity-0 z-0'
          }`}
        />

        {/* Butonlar */}
        {[
          { id: 'single', icon: Video, label: t('modeSingle') },
          { id: 'playlist', icon: ListVideo, label: t('modePlaylist') },
          { id: 'album', icon: Disc3, label: t('modeAlbum') }
        ].map((mode) => {
          const isActive = downloadMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => setDownloadMode(mode.id)}
              className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-2 py-3 px-2 rounded-[12px] font-semibold text-[0.95rem] transition-all duration-300 z-10 ${
                isActive ? 'text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <mode.icon size={20} className={isActive ? 'animate-pulse text-white' : ''} />
              <span>{mode.label}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleFetchInfo} className="flex flex-col md:flex-row gap-4 relative">
        <input
          type="text"
          placeholder={isLocked ? t('modeNotSelected') : t('urlPlaceholder')}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isLocked}
          className={`w-full md:flex-1 px-6 py-[1.2rem] rounded-full text-[1rem] sm:text-[1.1rem] font-sans font-normal transition-all duration-300 outline-none
            ${isLocked 
              ? 'bg-white/5 border border-white/5 text-gray-500 cursor-not-allowed placeholder:text-gray-600' 
              : 'bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-main)] shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] placeholder:text-[var(--text-muted)] focus:border-[var(--theme-color-1)] focus:bg-white/5 focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.1),_0_0_0_4px_var(--theme-glow)]'
            }
          `}
        />
        <button
          type="submit"
          className={`flex items-center justify-center gap-2 transition-all duration-300 w-full md:w-auto py-4 md:py-0 ${
            isLocked 
              ? 'bg-white/10 text-gray-500 px-8 rounded-full font-semibold cursor-not-allowed' 
              : 'btn-primary'
          }`}
          disabled={isLocked || isLoading}
        >
          {isLoading ? (
            <Loader2 className="animate-spin" size={24} />
          ) : (
            <Search size={24} />
          )}
          <span>{t('fetchButton')}</span>
        </button>
      </form>
    </div>
  );
}
