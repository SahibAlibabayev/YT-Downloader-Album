import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Sun, Moon, Settings, Info } from "lucide-react";
import { fetchVideoInfo, startDownload, fetchProgress, cancelDownload, BASE_URL } from "./services/api";

// Components
import ThemeLanguageSelector from "./components/ThemeLanguageSelector";
import SearchInput from "./components/SearchInput";
import VideoInfoCard from "./components/VideoInfoCard";
import SettingsModal from "./components/SettingsModal";
import AboutModal from "./components/AboutModal";

import "./index.css";

function App() {
  const { t } = useTranslation();

  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);     // fetching video info
  const [isDownloading, setIsDownloading] = useState(false); // download in progress
  const [videoInfo, setVideoInfo] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null); // success toast message
  const [playlistWarning, setPlaylistWarning] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [selectedTracks, setSelectedTracks] = useState([]); // user-selected tracks
  
  // Download progress state
  const [progress, setProgress] = useState({ percent: 0, status: '', speed: '', eta: '' });
  const downloadIntervalRef = useRef(null);
  const activeTaskRef = useRef(null); // used to detect cancellation from inside the closure
  
  // Download mode (single, playlist, album) and extra metadata (for music albums)
  const [downloadMode, setDownloadMode] = useState(null);
  const [trackMetadata, setTrackMetadata] = useState({
    artist: "",
    album: "",
    genre: "pop",
    year: new Date().getFullYear().toString(),
    track: "1"
  });

  // Modals
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const isElectron = !!window?.electronAPI?.isElectron;

  // Download options (format, quality) — defaults to MP3, persisted across the session
  const [format, setFormat] = useState("mp3");
  const [quality, setQuality] = useState("320kbps");

  // Theme & colour settings
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeColor, setActiveColor] = useState("blue");

  // Modern Tema Renk Paletleri
  const colorThemes = {
    blue: {
      c1: "#4f46e5",
      c2: "#ec4899",
      glow: "79, 70, 229",
      glow2: "236, 72, 153",
    }, // Indigo & Pink
    purple: {
      c1: "#8b5cf6",
      c2: "#d946ef",
      glow: "139, 92, 246",
      glow2: "217, 70, 239",
    }, // Violet & Fuchsia
    emerald: {
      c1: "#10b981",
      c2: "#3b82f6",
      glow: "16, 185, 129",
      glow2: "59, 130, 246",
    }, // Emerald & Blue
    rose: {
      c1: "#f43f5e",
      c2: "#f97316",
      glow: "244, 63, 94",
      glow2: "249, 115, 22",
    }, // Rose & Orange
  };

  // Toggle dark/light mode on the HTML element
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
      root.classList.remove("light");
      root.setAttribute("data-theme", "dark");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
    }
  }, [isDarkMode]);

  // Update CSS custom properties when the colour theme changes
  useEffect(() => {
    const root = document.documentElement;
    const theme = colorThemes[activeColor];

    root.style.setProperty("--theme-color-1", theme.c1);
    root.style.setProperty("--theme-color-2", theme.c2);
    root.style.setProperty("--theme-glow", `rgba(${theme.glow}, 0.4)`);
    root.style.setProperty("--theme-glow-rgb", theme.glow);
    root.style.setProperty("--theme-glow2-rgb", theme.glow2);
  }, [activeColor]);

  // Reset quality to a sensible default when the format changes
  useEffect(() => {
    if (format === "mp4") setQuality("1080p");
    else if (format === "mp3") setQuality("320kbps");
  }, [format]);

  // ---- GET INFO ----
  const handleFetchInfo = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    let targetUrl = url;
    setPlaylistWarning(false);

    try {
      const urlObj = new URL(targetUrl);
      const listId = urlObj.searchParams.get('list') || '';

      // YouTube Mix / Radio playlists (start with 'RD') are ephemeral and cannot be accessed directly
      if ((downloadMode === 'playlist' || downloadMode === 'album') && listId.startsWith('RD')) {
        setError(t('mixPlaylistError'));
        return;
      }

      // If the user is in Single mode but pasted a playlist URL (list=), strip the list param
      if (downloadMode === 'single' && urlObj.searchParams.has('list')) {
        urlObj.searchParams.delete('list');
        targetUrl = urlObj.toString();
        setUrl(targetUrl);
        setPlaylistWarning(true);
      }

      // If the user is in Playlist/Album mode but pasted a mixed watch?v=&list= URL, normalise it
      if ((downloadMode === 'playlist' || downloadMode === 'album') && listId) {
        targetUrl = `https://www.youtube.com/playlist?list=${listId}`;
        setUrl(targetUrl);
      }
    } catch (err) {
      console.error('URL Parse error', err);
    }


    setIsLoading(true);
    setError(null);
    setVideoInfo(null);
    setProgress({ percent: 0, status: '', speed: '', eta: '' });

    try {
      const data = await fetchVideoInfo(targetUrl);

      // Guard: if the mode requires a playlist but the URL resolves to a single video, throw
      if ((downloadMode === 'playlist' || downloadMode === 'album') && data.type !== 'playlist') {
        throw new Error(t('notPlaylistError'));
      }

      setTrackMetadata({
        artist: data.metadata?.artist || data.author || '',
        album:  data.metadata?.album || '',
        genre:  data.metadata?.genre  || 'pop',
        year:   data.metadata?.year   || new Date().getFullYear().toString(),
        track:  data.metadata?.track_number || '1',
      });

      // Auto-select the best available quality for video downloads
      if (format === 'mp4' && data.default_quality) {
        setQuality(data.default_quality);
      }

      setVideoInfo(data);
      if (data.items) {
        setSelectedTracks(data.items.map(item => item.id)); // Default all selected
      } else {
        setSelectedTracks([]);
      }
    } catch (err) {
      setError(err.message || 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // ---- DOWNLOAD ----
  const handleDownload = async () => {
    if (!videoInfo || isDownloading) return;

    setIsDownloading(true);
    setError(null);
    setProgress({ percent: 0, status: 'starting', speed: '', eta: '' });

    const taskId = Math.random().toString(36).substring(2, 10);
    setCurrentTaskId(taskId);
    activeTaskRef.current = taskId;

    // Start polling for progress immediately
    downloadIntervalRef.current = setInterval(async () => {
      try {
        const progData = await fetchProgress(taskId);
        if (progData) {
          setProgress(prev => ({
            percent: Math.max(prev.percent || 0, progData.percent || 0), // never go backwards
            status: progData.status || prev.status,
            status_text: progData.status_text || '',
            speed: progData.speed || prev.speed,
            eta: progData.eta || prev.eta
          }));
        }
      } catch (err) {
        // Polling errors can be ignored
      }
    }, 1000);

    try {
      // Build a trackMap to preserve the original playlist order: { videoId: originalTrackNumber }
      // Track numbers remain stable regardless of which tracks were filtered out
      const trackMap = {};
      if (videoInfo?.items) {
        videoInfo.items.forEach((item, idx) => {
          trackMap[item.id] = idx + 1;
        });
      }

      console.log('=== DOWNLOAD STARTING ===', { url, format, quality, mode: downloadMode });
      
      await startDownload({
        url,
        format,
        quality,
        mode: downloadMode,
        metadata: trackMetadata,
        taskId: taskId,
        selectedTracks: selectedTracks,
        trackMap: trackMap,
        isWeb: !isElectron
      });
      
      console.log('=== DOWNLOAD COMPLETED ===');

      // If the taskRef changed (or was cleared) while we were awaiting,
      // the user cancelled — exit silently without updating state.
      if (activeTaskRef.current !== taskId) {
        return;
      }

      setProgress(prev => {
        if (prev.status === '') return prev; // already reset, don't touch
        return { ...prev, percent: 100, status: 'finished' };
      });
      
      // In web mode, redirect the browser to the serve endpoint to trigger the file download
      if (!isElectron) {
        window.location.href = `${BASE_URL}/api/serve?task_id=${taskId}`;
      }
      
      // Show success toast
      setSuccess(t('successMessage'));
      setTimeout(() => setSuccess(null), 5000);
      
    } catch (err) {
      if (activeTaskRef.current === taskId && !err.message.toLowerCase().includes('cancel')) {
        setError(err.message || 'Download failed.');
      }
    } finally {
      if (activeTaskRef.current === taskId) {
        clearInterval(downloadIntervalRef.current);
        setIsDownloading(false);
        setCurrentTaskId(null);
        activeTaskRef.current = null;
      }
    }
  };

  // ---- CANCEL DOWNLOAD ----
  const handleCancel = async () => {
    const activeTaskId = currentTaskId;
    setCurrentTaskId(null);
    activeTaskRef.current = null; // signal cancellation to the in-flight closure

    setIsDownloading(false);
    setProgress({ percent: 0, status: '', speed: '', eta: '' });
    setError(t('downloadCancelled') || "Download cancelled.");

    if (downloadIntervalRef.current) clearInterval(downloadIntervalRef.current);

    if (activeTaskId) {
      await cancelDownload(activeTaskId);
    }
  };

  // Cleanup: clear the polling interval when the component unmounts
  useEffect(() => {
    return () => {
      if (downloadIntervalRef.current) clearInterval(downloadIntervalRef.current);
    }
  }, []);

  // Auto-dismiss error toast after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 w-full flex flex-col relative z-10 transition-all">
      {/* Top control panel */}
      <ThemeLanguageSelector
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        activeColor={activeColor}
        setActiveColor={setActiveColor}
        colorThemes={colorThemes}
        SunIcon={Sun}
        MoonIcon={Moon}
        SettingsButton={
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowAbout(true)}
              className="p-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-200"
              title="About"
            >
              <Info size={18} />
            </button>
            {isElectron && (
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-200"
                title="Settings"
              >
                <Settings size={18} />
              </button>
            )}
          </div>
        }
      />

      {/* Page header */}
      <header className="text-center mb-14 relative animate-[fadeInDown_0.8s_ease-out_forwards]">

        <h1
          className="font-geologica text-[3.5rem] font-extrabold mb-2 tracking-tight bg-clip-text text-transparent"
          style={{ backgroundImage: "var(--theme-gradient)" }}
        >
          {t("appTitle")}
        </h1>
        <p className="text-[1.1rem] text-gray-400 font-light">
          {t("appSubtitle")}
        </p>
      </header>

      {/* Search input */}
      <SearchInput
        url={url}
        setUrl={setUrl}
        handleFetchInfo={handleFetchInfo}
        isLoading={isLoading}
        downloadMode={downloadMode}
        setDownloadMode={setDownloadMode}
      />

      {/* Warning banner — shown when a playlist URL is stripped to a single video */}
      {playlistWarning && (
        <div className="glass-card rounded-[16px] p-4 mb-6 border border-yellow-500/30 bg-yellow-500/10 text-yellow-500 text-sm flex items-center gap-2">
          <span>⚠</span> {t('playlistWarning')}
        </div>
      )}

      {/* Toast notifications (success & error/cancel) */}
      <div className="fixed bottom-10 right-10 z-50 flex flex-col gap-3 pointer-events-none">
        
        {/* Error / cancel toast */}
        {error && (
          <div className="glass-card pointer-events-auto rounded-[16px] p-4 border border-red-500/30 bg-red-500/10 text-red-400 text-sm flex items-center gap-3 animate-[fadeInUp_0.4s_ease-out_forwards] shadow-[0_10px_40px_rgba(239,68,68,0.3)] min-w-[300px] max-w-sm">
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
               <span className="text-red-500 font-bold text-lg">✗</span>
            </div>
            <div>
              <p className="font-bold text-white">Notification</p>
              <p className="break-words">{error}</p>
            </div>
          </div>
        )}

        {/* Success toast */}
        {success && (
          <div className="glass-card pointer-events-auto rounded-[16px] p-4 border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm flex items-center gap-3 animate-[fadeInUp_0.4s_ease-out_forwards] shadow-[0_10px_40px_rgba(16,185,129,0.3)] min-w-[300px] max-w-sm">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
               <span className="text-emerald-500 font-bold text-lg">✓</span>
            </div>
            <div>
              <p className="font-bold text-white">Excellent!</p>
              <p>{success}</p>
            </div>
          </div>
        )}
      </div>

      {/* Download options card */}
      {videoInfo && (
        <VideoInfoCard
          videoInfo={videoInfo}
          format={format}
          setFormat={setFormat}
          quality={quality}
          setQuality={setQuality}
          trackMetadata={trackMetadata}
          setTrackMetadata={setTrackMetadata}
          onDownload={handleDownload}
          onCancel={handleCancel}
          isDownloading={isDownloading}
          progress={progress}
          downloadMode={downloadMode}
          selectedTracks={selectedTracks}
          setSelectedTracks={setSelectedTracks}
          setVideoInfo={setVideoInfo}
        />
      )}
    </div>

    {/* Modals */}
    {isElectron && (
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    )}
    
    <AboutModal
      isOpen={showAbout}
      onClose={() => setShowAbout(false)}
    />
    </>
  );
}

export default App;
