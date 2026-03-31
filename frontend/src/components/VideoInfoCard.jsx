import { useTranslation } from 'react-i18next';
import { useRef, useState } from 'react';
import { Download, Film, Headphones, ListMusic, Loader2, Pencil, X, CheckSquare, Square, HardDrive, GripVertical } from 'lucide-react';
import { Reorder } from 'framer-motion';

// ── Yardımcı: byte sayısını okunabilir formata çevir ──────────────────────────
function formatSize(bytes) {
  if (!bytes || bytes <= 0) return null;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ── Yardımcı: süre + bitrate'den MP3 boyutu tahmini (byte) ──────────────────
function estimateMp3Bytes(durationSeconds, bitrateKbps) {
  if (!durationSeconds || durationSeconds <= 0) return null;
  return Math.round((bitrateKbps * 1000 / 8) * durationSeconds);
}

const GENRE_KEYS = ['pop', 'rock', 'hiphop', 'electronic', 'classical', 'jazz', 'metal', 'acoustic', 'afrobeat', 'alternative', 'ambient', 'blues', 'bossanova', 'chillout', 'country', 'dance', 'disco', 'dubstep', 'edm', 'folk', 'funk', 'gospel', 'house', 'indie', 'instrumental', 'kpop', 'latin', 'lofi', 'rnb', 'reggae', 'soul', 'soundtrack', 'synthwave', 'techno', 'trance'];

export default function VideoInfoCard({
  videoInfo, setVideoInfo, format, setFormat, quality, setQuality,
  trackMetadata, setTrackMetadata, onDownload, onCancel, isDownloading, progress, downloadMode,
  selectedTracks, setSelectedTracks
}) {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);

  const [isCustomGenre, setIsCustomGenre] = useState(false);

  const handleGenreSelect = (e) => {
    const val = e.target.value;
    if (val === 'custom') {
      setIsCustomGenre(true);
      setTrackMetadata({ ...trackMetadata, genre: '' });
    } else {
      setIsCustomGenre(false);
      setTrackMetadata({ ...trackMetadata, genre: val });
    }
  };

  const toggleTrack = (id) => {
    if (!selectedTracks) return;
    if (selectedTracks.includes(id)) {
      setSelectedTracks(selectedTracks.filter(tId => tId !== id));
    } else {
      setSelectedTracks([...selectedTracks, id]);
    }
  };

  const toggleAllTracks = () => {
    if (!selectedTracks || !videoInfo?.items) return;
    if (selectedTracks.length === videoInfo.items.length) {
      setSelectedTracks([]);
    } else {
      setSelectedTracks(videoInfo.items.map(item => item.id));
    }
  };

  // Canvas ile kare kırpma: ortalanmış kare alanı al, 1000x1000 jpeg’e yaz
  const handleCoverChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const size = Math.min(img.width, img.height);
        const canvas = document.createElement('canvas');
        canvas.width = 1000;
        canvas.height = 1000;
        const ctx = canvas.getContext('2d');
        // Ortalanmış kare kırpma (müzik endüstrisi standardı 1:1)
        const sx = (img.width  - size) / 2;
        const sy = (img.height - size) / 2;
        ctx.drawImage(img, sx, sy, size, size, 0, 0, 1000, 1000);
        const base64 = canvas.toDataURL('image/jpeg', 0.93);
        setTrackMetadata(prev => ({ ...prev, customThumbnail: base64 }));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  return (
    <div className="glass-card rounded-2xl mb-8 relative overflow-hidden animate-[fadeInUp_0.6s_ease-out_forwards]">
      {/* Shine effect */}
      <div className="absolute top-0 -left-[100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-[-20deg] animate-[shine_8s_infinite] pointer-events-none" />

      <div className="p-4 sm:p-6 lg:p-10">
        {/* ── Top Section: Thumbnail + Title ── */}
        <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start mb-6">
          {/* Thumbnail + kapak değiştirme dügmesi */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-36 sm:w-44 flex-shrink-0 rounded-xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.5)] relative group">
              {/* görüntü: özel thumbnail seçildiyse onu, yoksa YouTube thumbnail’ını göster */}
              {(trackMetadata?.customThumbnail || videoInfo.thumbnail) ? (
                <img
                  src={trackMetadata?.customThumbnail || videoInfo.thumbnail}
                  alt="Thumbnail"
                  className="w-full aspect-square object-cover transform transition-transform duration-700 group-hover:scale-110"
                />
              ) : (
                <div className="w-full aspect-square bg-white/5 flex items-center justify-center">
                  <Film size={32} className="text-gray-500" />
                </div>
              )}

              {/* Hover overlay: pencil edit button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2 cursor-pointer"
              >
                <Pencil size={22} className="text-white" />
                <span className="text-white text-xs font-semibold">{t('changeCover')}</span>
              </button>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleCoverChange}
              />
            </div>

            {/* Recommended size hint — sadece album/playlist modda */}
            {(downloadMode === 'album' || downloadMode === 'playlist') && (
              <p className="text-[10px] text-gray-500 text-center max-w-[160px] leading-tight">
                {t('recommendedCoverSize')}
              </p>
            )}
          </div>

          {/* Title + Author */}
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <h3 className="text-lg sm:text-2xl font-extrabold mb-1 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 leading-snug break-words">
              {videoInfo.title}
            </h3>
            <p className="text-[var(--theme-color-2)] font-medium flex items-center justify-center sm:justify-start gap-2 flex-wrap mb-3">
              {videoInfo.author}
            </p>
          </div>
        </div>

        {/* ── Playlist Items ── */}
        {videoInfo.type === 'playlist' && (() => {
          // Seçili parçaların toplam boyutunu hesapla
          const bitrateMap = { '320kbps': 320, '192kbps': 192, '128kbps': 128 };
          const videoBitrateMap = { '1080p': 4000, '720p': 2000, '480p': 1000, '360p': 600 };
          const selectedBitrate = bitrateMap[quality] || 192;
          const selectedVideoBitrate = videoBitrateMap[quality] || 2000;
          const selectedItems = videoInfo.items.filter(it => selectedTracks?.includes(it.id));
          const totalBytes = selectedItems.reduce((acc, it) => {
            const b = format === 'mp3'
              ? (estimateMp3Bytes(it.duration_seconds, selectedBitrate) || 0)
              : Math.round(((selectedVideoBitrate + 128) * 1000 / 8) * (it.duration_seconds || 0));
            return acc + b;
          }, 0);
          const totalSizeStr = formatSize(totalBytes);

          return (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-semibold">{selectedTracks?.length || 0} / {videoInfo.items.length} selected</span>
                  {totalSizeStr && (
                    <span className="flex items-center gap-1 text-xs bg-white/10 text-gray-300 px-2 py-0.5 rounded-full">
                      <HardDrive size={10} />
                      ~{totalSizeStr}
                    </span>
                  )}
                </div>
                <button onClick={toggleAllTracks} className="text-xs text-[var(--theme-color-1)] font-bold hover:underline cursor-pointer">
                  {selectedTracks?.length === videoInfo.items.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <Reorder.Group 
                axis="y" 
                values={videoInfo.items || []} 
                onReorder={(newOrder) => setVideoInfo && setVideoInfo({ ...videoInfo, items: newOrder })}
                className="min-h-[120px] max-h-[320px] overflow-y-auto custom-scrollbar space-y-2 rounded-xl pr-1"
              >
                {videoInfo.items.map((item, index) => {
                  const trackBytes = format === 'mp3'
                    ? estimateMp3Bytes(item.duration_seconds, selectedBitrate)
                    : Math.round(((selectedVideoBitrate + 128) * 1000 / 8) * (item.duration_seconds || 0));
                  const trackSizeStr = formatSize(trackBytes);
                  return (
                    <Reorder.Item
                      key={item.id}
                      value={item}
                      className="flex items-center gap-2 sm:gap-3 bg-black/40 hover:bg-black/60 p-2 rounded-xl border border-white/5 transition-colors group cursor-grab active:cursor-grabbing"
                    >
                      {/* Drag Handle */}
                      <div className="flex-shrink-0 text-gray-600 group-hover:text-gray-300 transition-colors hidden sm:block">
                        <GripVertical size={16} />
                      </div>

                      {/* Checkbox */}
                      <div 
                        className="flex-shrink-0 text-gray-400 transition-colors cursor-pointer"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          toggleTrack(item.id);
                        }}
                      >
                        {selectedTracks?.includes(item.id) ? (
                          <CheckSquare size={18} className="text-[var(--theme-color-1)]" />
                        ) : (
                          <Square size={18} />
                        )}
                      </div>
                      <span className="text-gray-500 font-bold w-5 text-center text-xs flex-shrink-0 group-hover:text-[var(--theme-color-1)]">{index + 1}</span>
                      <div className="w-12 h-8 rounded-md overflow-hidden flex-shrink-0">
                        <img src={item.thumbnail} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="" />
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className={`text-xs sm:text-sm font-semibold truncate transition-colors ${selectedTracks?.includes(item.id) ? 'text-gray-200 group-hover:text-white' : 'text-gray-500 line-through group-hover:text-gray-400'}`}>{item.title}</p>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                        <span className="text-xs text-gray-500 font-medium whitespace-nowrap">{item.duration}</span>
                        {trackSizeStr && (
                          <span className="text-[10px] text-gray-600 whitespace-nowrap">~{trackSizeStr}</span>
                        )}
                      </div>
                    </Reorder.Item>
                  );
                })}
              </Reorder.Group>
            </div>
          );
        })()}

        {/* ── Divider + Format Label ── */}
        <div className="border-t border-[var(--border-subtle)] pt-5 mt-2">
          <div className="text-xs font-semibold text-[var(--text-muted)] mb-3 tracking-widest uppercase flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gradient-to-r after:from-[var(--border-subtle)] after:to-transparent">
            {t('formatLabel')}
          </div>

          {/* Format Toggle */}
          <div className="relative flex bg-black/30 rounded-full p-1 mb-6 border border-[var(--border-subtle)] overflow-hidden">
            <button
              onClick={() => setFormat('mp4')}
              className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 px-3 rounded-full font-semibold text-sm transition-all duration-200 z-10 ${
                format === 'mp4' ? 'text-white' : 'text-[var(--text-muted)]'
              }`}
            >
              <Film size={16} /> {t('formatVideo')}
            </button>
            <button
              onClick={() => setFormat('mp3')}
              className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 px-3 rounded-full font-semibold text-sm transition-all duration-200 z-10 ${
                format === 'mp3' ? 'text-white' : 'text-[var(--text-muted)]'
              }`}
            >
              <Headphones size={16} /> {t('formatAudio')}
            </button>
            {/* Sliding background */}
            <div
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-all duration-400 ease-[cubic-bezier(0.25,1,0.5,1)] z-0 ${
                format === 'mp4'
                  ? 'left-1 bg-[var(--theme-gradient)] shadow-[0_4px_15px_var(--theme-glow)]'
                  : 'left-[calc(50%+4px)] bg-gradient-to-br from-emerald-500 to-green-600 shadow-[0_4px_15px_rgba(16,185,129,0.4)]'
              }`}
            />
          </div>

          {/* Quality Label */}
          <div className="text-xs font-semibold text-gray-400 mb-3 tracking-widest uppercase flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gradient-to-r after:from-white/10 after:to-transparent">
            {t('qualityLabel')}
          </div>

          {/* Quality Buttons — her zaman yan yana */}
          <div className="flex flex-row gap-3 mb-6">
            {format === 'mp4' ? (
              (videoInfo.available_qualities?.length
                ? videoInfo.available_qualities
                : [
                    { val: '1080p', label: 'FHD' },
                    { val: '720p',  label: 'HD'  },
                    { val: '480p',  label: 'SD'  },
                    { val: '360p',  label: 'Low' },
                  ]
              ).map((q) => {
                const sizeStr = formatSize(q.filesize);
                return (
                  <button
                    key={q.val}
                    onClick={() => setQuality(q.val)}
                    className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border font-semibold text-base transition-all duration-200 ${
                      quality === q.val
                        ? 'bg-[var(--theme-color-1)]/10 border-[var(--theme-color-1)] text-white shadow-[0_0_0_1px_var(--theme-color-1)]'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {q.val}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${quality === q.val ? 'bg-[var(--theme-color-1)] text-white' : 'bg-white/10 text-gray-400'}`}>
                      {q.label}
                    </span>
                    {sizeStr && (
                      <span className={`text-[10px] font-normal ${
                        quality === q.val ? 'text-[var(--theme-color-2)]' : 'text-gray-600'
                      }`}>~{sizeStr}</span>
                    )}
                  </button>
                );
              })
            ) : (
              [
                { val: '320kbps', title: '320k', label: 'High',   kbps: 320 },
                { val: '192kbps', title: '192k', label: 'Medium', kbps: 192 },
                { val: '128kbps', title: '128k', label: 'Low',    kbps: 128 },
              ].map((q) => {
                const durSecs = videoInfo.duration_seconds || 0;
                const estBytes = estimateMp3Bytes(durSecs, q.kbps);
                const sizeStr = formatSize(estBytes);
                return (
                  <button
                    key={q.val}
                    onClick={() => setQuality(q.val)}
                    className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border font-semibold text-base transition-all duration-200 ${
                      quality === q.val
                        ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-[0_0_0_1px_#10b981]'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {q.title}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${quality === q.val ? 'bg-emerald-500 text-white' : 'bg-white/10 text-gray-400'}`}>
                      {q.label}
                    </span>
                    {sizeStr && (
                      <span className={`text-[10px] font-normal ${
                        quality === q.val ? 'text-emerald-300' : 'text-gray-600'
                      }`}>~{sizeStr}</span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* —— Metadata Section —— sadece single ve album modda göster */}
          {downloadMode !== 'playlist' && (
          <div className="border-t border-[var(--border-subtle)] pt-5 mt-2">
            <div className="text-xs font-semibold text-[var(--theme-color-1)] mb-4 tracking-widest uppercase flex items-center gap-2">
              <ListMusic size={14} /> {t('metadataTitle')}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              {[
                { key: 'artist', label: t('metaArtist'), type: 'text' },
                { key: 'album',  label: t('metaAlbum'),  type: 'text' },
              ].map(({ key, label, type }) => (
                <div key={key} className="min-w-0">
                  <label className="block text-xs text-gray-400 mb-1">{label}</label>
                  <input
                    type={type}
                    value={trackMetadata?.[key] || ''}
                    onChange={(e) => setTrackMetadata({ ...trackMetadata, [key]: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 text-white px-3 py-2 rounded-xl outline-none focus:border-[var(--theme-color-1)] focus:ring-2 focus:ring-[var(--theme-color-1)]/20 transition-all text-sm"
                  />
                </div>
              ))}

              {/* Genre */}
              {/* Genre */}
              <div className="min-w-0 flex flex-col gap-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">{t('metaGenre')}</label>
                  <div className="relative">
                    <select
                      value={isCustomGenre ? 'custom' : (GENRE_KEYS.includes(trackMetadata?.genre) ? trackMetadata.genre : (trackMetadata?.genre ? 'custom' : 'pop'))}
                      onChange={handleGenreSelect}
                      className="w-full bg-black/40 border border-white/10 text-white pl-3 pr-8 py-2 rounded-xl appearance-none outline-none focus:border-[var(--theme-color-1)] focus:ring-2 focus:ring-[var(--theme-color-1)]/20 transition-all cursor-pointer text-sm"
                    >
                      {GENRE_KEYS.map(g => (
                        <option key={g} value={g} className="bg-gray-900 text-white">{t(`genres.${g}`)}</option>
                      ))}
                      <option value="custom" className="bg-gray-900 text-[var(--theme-color-1)] font-bold">{t('genres.custom')}</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-400" />
                  </div>
                </div>
                {(isCustomGenre || (!GENRE_KEYS.includes(trackMetadata?.genre) && trackMetadata?.genre)) && (
                  <input
                    type="text"
                    placeholder={t('genres.custom')}
                    value={trackMetadata?.genre || ''}
                    onChange={(e) => setTrackMetadata({ ...trackMetadata, genre: e.target.value })}
                    className="w-full bg-black/40 border border-[var(--theme-color-1)]/50 text-white px-3 py-2 rounded-xl outline-none focus:border-[var(--theme-color-1)] focus:ring-2 focus:ring-[var(--theme-color-1)]/20 transition-all text-sm animate-[fadeInUp_0.2s_ease-out_forwards]"
                    autoFocus={isCustomGenre}
                  />
                )}
              </div>

              {/* Year */}
              <div className="min-w-0">
                <label className="block text-xs text-gray-400 mb-1">{t('metaYear')}</label>
                <input
                  type="number" min="1900" max="2099"
                  value={trackMetadata?.year || ''}
                  onChange={(e) => setTrackMetadata({ ...trackMetadata, year: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 text-white px-3 py-2 rounded-xl outline-none focus:border-[var(--theme-color-1)] focus:ring-2 focus:ring-[var(--theme-color-1)]/20 transition-all text-sm"
                />
              </div>

              {/* Track - Sadece Single Modda */}
              {downloadMode === 'single' && (
                <div className="min-w-0">
                  <label className="block text-xs text-gray-400 mb-1">{t('metaTrack')}</label>
                  <input
                    type="number" min="1"
                    value={trackMetadata?.track || ''}
                    onChange={(e) => setTrackMetadata({ ...trackMetadata, track: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 text-white px-3 py-2 rounded-xl outline-none focus:border-[var(--theme-color-1)] focus:ring-2 focus:ring-[var(--theme-color-1)]/20 transition-all text-sm"
                  />
                </div>
              )}
            </div>
          </div>
          )} {/* end downloadMode !== 'playlist' */}

          {/* ── Download / Progress ── */}
          <div className="mt-4">
            {isDownloading && progress ? (
              <div className="w-full bg-black/40 rounded-2xl p-4 border border-white/10">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-semibold text-white flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-[var(--theme-color-1)]" />
                    {progress.status === 'downloading' ? t('downloading') : t('processing')}
                    {progress.status_text && <span className="text-gray-400 ml-1 font-mono">{progress.status_text}</span>}
                  </span>
                  <span className="text-sm font-bold text-[var(--theme-color-1)]">{progress.percent}%</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-gradient-to-r from-[var(--theme-color-1)] to-[var(--theme-color-2)] transition-all duration-300 relative"
                    style={{ width: `${progress.percent}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  </div>
                </div>
                {progress.status === 'downloading' && (
                  <div className="flex justify-between text-xs text-gray-400 px-1">
                    <span>{progress.speed}</span>
                    <span>ETA: {progress.eta}</span>
                  </div>
                )}
                <button
                  onClick={onCancel}
                  className="mt-3 w-full py-2 flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors text-sm font-semibold"
                >
                  <X size={16} /> {t('cancelBtn') || "Cancel"}
                </button>
              </div>
            ) : (
              <button
                className="btn-primary w-full flex items-center justify-center gap-2"
                onClick={onDownload}
                disabled={isDownloading}
              >
                <Download size={18} /> {t('downloadButton')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
