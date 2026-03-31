"""
downloader.py — YouTube video / playlist indirme motoru.
yt-dlp ve FFmpeg kullanır. Flask (app.py) tarafından çağrılır.
"""

import os
from typing import Optional
import yt_dlp


# İndirmeler: Electron YTDL_DOWNLOAD_FOLDER env değişkenini set ederse onu kullan,
# yoksa projenin kökündeki 'downloads' klasörüne kaydet.
_env_folder = os.environ.get('YTDL_DOWNLOAD_FOLDER', '')
DOWNLOAD_FOLDER = _env_folder if _env_folder else os.path.abspath(
    os.path.join(os.path.dirname(__file__), '..', 'downloads')
)

# Canlı indirme ilerlemelerini tutmak için in-memory sözlük (task_id -> modül bilgileri)
progress_store: dict[str, dict] = {}
# İptal isteklerini tutmak için sözlük (task_id -> True/False)
cancel_store:   dict[str, bool] = {}
print(f'[DEBUG] Downloads will be saved to: {DOWNLOAD_FOLDER}')

def set_download_folder(new_folder: str):
    global DOWNLOAD_FOLDER
    if new_folder:
        DOWNLOAD_FOLDER = new_folder
        print(f'[DEBUG] Download folder updated to: {DOWNLOAD_FOLDER}')

# -----------------------------------------------------------------------
# Kalite → yt-dlp format string tabloları
# -----------------------------------------------------------------------
_MP4_QUALITY_MAP: dict[str, str] = {
    '1080p': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best[height<=1080]/best',
    '720p':  'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=720]+bestaudio/best[height<=720]/best',
    '480p':  'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=480]+bestaudio/best[height<=480]/best',
    '360p':  'bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=360]+bestaudio/best[height<=360]/best',
}

_MP3_QUALITY_MAP: dict[str, str] = {
    '320kbps': '320',
    '192kbps': '192',
    '128kbps': '128',
}


# -----------------------------------------------------------------------
# Yardımcı fonksiyonlar
# -----------------------------------------------------------------------

def _get_best_thumbnail(info: dict) -> str:
    """
    yt-dlp'nin döndürdüğü bilgiden en yüksek kaliteli thumbnail URL'ini alır.
    Thumbnails listesi varsa sonuncusunu (genellikle en büyüğü) döndürür.
    """
    thumbnails = info.get('thumbnails')
    if isinstance(thumbnails, list) and thumbnails:
        return thumbnails[-1].get('url', '')
    return info.get('thumbnail', '')


def _seconds_to_str(seconds) -> str:
    """Saniye sayısını 'M:SS' veya 'H:MM:SS' formatına çevirir."""
    try:
        s = int(seconds or 0)
        m, s = divmod(s, 60)
        h, m = divmod(m, 60)
        if h:
            return f'{h}:{m:02d}:{s:02d}'
        return f'{m}:{s:02d}'
    except Exception:
        return ''


# -----------------------------------------------------------------------
# Ana fonksiyonlar
# -----------------------------------------------------------------------

def get_video_info(url: str) -> dict:
    """
    Verilen YouTube URL'inden video veya playlist bilgilerini çeker.
    İndirme yapmaz; yalnızca metadata okur.

    Döndürdüğü dict örneği:
    {
        'success': True,
        'type': 'single' | 'playlist',
        'title': '...',
        'author': '...',
        'thumbnail': 'https://...',
        'duration': '14:20',
        'item_count': 1,
        'metadata': { 'artist': '...', 'album': '', 'genre': '', 'year': '2026', 'track_number': '1' },
        'items': [...]   # Playlist ise dolu, single ise boş
    }
    """
    ydl_opts_flat = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': True,  # hızlı bilgi çekmek için playlist de dahil
    }
    ydl_opts_full = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,  # format listesi için tam bilgi çek
    }

    # Shorts linkini standart formata cevir: /shorts/ID -> /watch?v=ID
    import re as _re
    shorts_match = _re.search(r'youtube\.com/shorts/([A-Za-z0-9_-]+)', url)
    if shorts_match:
        url = f'https://www.youtube.com/watch?v={shorts_match.group(1)}'

    try:
        with yt_dlp.YoutubeDL(ydl_opts_flat) as ydl:
            info = ydl.extract_info(url, download=False)

        is_playlist = 'entries' in info

        # Playlist için Fallback: ilk geçerli videoyu bul (silinmemiş olan)
        first_valid_entry = None
        if is_playlist:
            for entry in info.get('entries', []):
                if entry and isinstance(entry, dict):
                    first_valid_entry = entry
                    break

        artist = info.get('artist') or info.get('uploader')
        if not artist and first_valid_entry:
            artist = first_valid_entry.get('artist') or first_valid_entry.get('uploader') or ''

        album  = info.get('album', '')
        genre  = info.get('genre', '')

        import re
        def _extract_real_year(data_dict: dict) -> str:
            # YouTube Müzik'te gerçek çıkış yılı, açıklamada "Released on: 2011-04-12" şeklinde gizlenir
            desc = data_dict.get('description') or ''
            match = re.search(r'(?i)released on:\s*(?:.*\s)?(\d{4})', desc)
            if match:
                return match.group(1)
            # Standart meta
            y = str(data_dict.get('release_year') or '').strip()
            if y: return y
            ud = str(data_dict.get('upload_date') or '').strip()
            if ud: return ud[:4]
            return ''

        year = _extract_real_year(info)
        if not year and first_valid_entry:
            year = _extract_real_year(first_valid_entry)

        # Thumbnail Fallback
        thumb = _get_best_thumbnail(info)
        if not thumb and first_valid_entry:
            thumb = _get_best_thumbnail(first_valid_entry)

        # Playlist mode: ilk şarkının detaylı metadatasını çek (extract_flat=False ile sadece o videoyu)
        if is_playlist and first_valid_entry and first_valid_entry.get('id'):
            try:
                ydl_opts_single = {'quiet': True, 'no_warnings': True, 'extract_flat': False}
                with yt_dlp.YoutubeDL(ydl_opts_single) as ydl_single:
                    first_full = ydl_single.extract_info(f"https://www.youtube.com/watch?v={first_valid_entry['id']}", download=False)
                    
                    if not album: album = first_full.get('album', '')
                    if not artist: artist = first_full.get('artist') or first_full.get('uploader') or ''
                    if not genre: genre = first_full.get('genre', '')
                    if not year: year = _extract_real_year(first_full)
            except Exception:
                pass

        response: dict = {
            'success':        True,
            'type':           'playlist' if is_playlist else 'single',
            'title':          info.get('title', 'Unknown Title'),
            'author':         artist or 'Unknown Artist',
            'thumbnail':      thumb,
            'duration':       info.get('duration_string', '') or _seconds_to_str(info.get('duration')),
            'duration_seconds': int(info.get('duration') or 0),
            'item_count':     len(info.get('entries', [])) if is_playlist else 1,
            'metadata': {
                'artist':       artist or '',
                'album':        album,
                'genre':        genre,
                'year':         year,
                'track_number': '1',
            },
            'items': [],
            'available_qualities': [],  # Dinamik kalite listesi (tek video için)
        }

        # Tek video: müsait formatı öğrenmek için format listesini al
        if not is_playlist:
            try:
                with yt_dlp.YoutubeDL(ydl_opts_full) as ydl2:
                    full_info = ydl2.extract_info(url, download=False)

                duration_secs = int(full_info.get('duration') or 0)

                # Video formatında olan yükseklikleri topla
                heights = set()
                for f in full_info.get('formats', []):
                    h = f.get('height')
                    vcodec = f.get('vcodec', '')
                    if h and h > 0 and vcodec and vcodec != 'none':
                        heights.add(h)

                # Ses akışlarından en iyi boyutu bul (her kaliteye eklenir)
                audio_size = 0
                for f in full_info.get('formats', []):
                    vcodec = (f.get('vcodec') or 'none').lower()
                    acodec = (f.get('acodec') or 'none').lower()
                    if vcodec == 'none' and acodec != 'none':
                        fs = f.get('filesize') or f.get('filesize_approx') or 0
                        if fs > audio_size:
                            audio_size = fs

                # Her kalite seviyesi için tipik YouTube bitrate'lerinden boyut tahmini (fallback)
                _typical_kbps = {1080: 4000, 720: 2000, 480: 1000, 360: 600, 240: 350, 144: 200}

                # Standart kalite sınıflarımızla eşleştir
                standard_map = [
                    (1080, '1080p', 'FHD'),
                    (720,  '720p',  'HD'),
                    (480,  '480p',  'SD'),
                    (360,  '360p',  '360p'),
                    (240,  '240p',  '240p'),
                    (144,  '144p',  '144p'),
                ]
                available = []
                for target_h, val, label in standard_map:
                    if any(h >= target_h for h in heights):
                        # Gerçek video stream boyutunu bulmaya çalış
                        video_size = 0
                        for f in full_info.get('formats', []):
                            h = f.get('height')
                            vcodec = (f.get('vcodec') or 'none').lower()
                            if h and h <= target_h and vcodec != 'none':
                                fs = f.get('filesize') or f.get('filesize_approx') or 0
                                if fs > video_size:
                                    video_size = fs

                        total_size = video_size + audio_size

                        # Gerçek boyut yoksa süre × tipik bitrate ile tahmin et
                        if total_size == 0 and duration_secs:
                            kbps = _typical_kbps.get(target_h, 1000) + 128  # +128 ses için
                            total_size = int(kbps * 1000 / 8 * duration_secs)

                        available.append({'val': val, 'label': label, 'filesize': total_size})

                if available:
                    response['available_qualities'] = available
                    response['default_quality'] = available[0]['val']
            except Exception:
                pass  # Format çekme başarısız olursa standart listeye düş

        # Playlist ise her girdiyi listeye ekle
        if is_playlist:
            entries = info.get('entries') or []
            for idx, entry in enumerate(entries, start=1):
                if not entry:
                    continue  # Silinmiş / gizli video
                dur = entry.get('duration_string', '') or _seconds_to_str(entry.get('duration'))
                response['items'].append({
                    'id':             entry.get('id', ''),
                    'track_number':   idx,
                    'title':          entry.get('title', 'Unknown Video'),
                    'duration':       dur,
                    'duration_seconds': int(entry.get('duration') or 0),
                    'thumbnail':      _get_best_thumbnail(entry),
                })

        return response

    except Exception as exc:
        return {'success': False, 'error': f'Could not fetch video info: {exc}'}


def download_media(
    url: str,
    format_type: str = 'mp4',
    quality: str = 'best',
    mode: str = 'single',
    metadata: Optional[dict] = None,
    task_id: str = None,
    selected_tracks: list = None,
    track_map: dict = None
) -> dict:
    """
    Verilen URL'i ister tek video, ister playlist olarak indirir.

    Parametreler:
        url         : YouTube video / playlist linki
        format_type : 'mp4' veya 'mp3'
        quality     : '1080p' / '720p' / '480p' / '360p'  (video)
                      '320kbps' / '192kbps' / '128kbps'   (ses)
        mode        : 'single' | 'playlist' | 'album'
        metadata    : {'artist', 'album', 'genre', 'year', 'track_number'}
        task_id     : İndirme ilerlemesini takip etmek için eşsiz ID
    """
    if metadata is None:
        metadata = {}

    os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)

    # Çıkış şablonu — Playlist veya Albüm modundaysa, playlist adında bir alt klasör oluştururuz
    if mode in ('playlist', 'album'):
        # %(playlist_title|Playlist)s yt-dlp'nin eğer playlist adını bulamazsa "Playlist" klasörüne atmasını sağlar
        out_template = os.path.join(DOWNLOAD_FOLDER, '%(playlist_title|Playlist)s', '%(title)s.%(ext)s')
    else:
        out_template = os.path.join(DOWNLOAD_FOLDER, '%(title)s.%(ext)s')

    # Progress alanını hook üzerinden güncelleyecek iç fonksiyon
    def progress_hook(d):
        if not task_id: return

        # Iptal istegi var mi? Varsa hemen dur
        if cancel_store.get(task_id):
            progress_store[task_id] = {'status': 'cancelled', 'percent': 0, 'speed': '', 'eta': ''}
            raise Exception('Download cancelled by user')

        status = d.get('status', 'starting')
        if status == 'downloading':
            import re
            def clean_ansi(text):
                if text is None: return ''
                return re.sub(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])', '', str(text))
            
            percent_str = clean_ansi(d.get('_percent_str', '0')).replace('%', '').strip()
            try:
                current_percent = float(percent_str)
            except ValueError:
                current_percent = 0.0
            
            # Ümumi (Global) Playlist İlerlemesini Hesaplama
            info_dict = d.get('info_dict') or {}
            playlist_index = info_dict.get('playlist_index')
            n_entries = info_dict.get('n_entries')
            
            # Seçili parça sayısını kullan (tüm playlist yerine)
            effective_total = len(selected_tracks) if selected_tracks else (n_entries or 1)
            
            if playlist_index and effective_total and effective_total > 1:
                # Kaçıncı seçili parçada olduğumuzu bul
                video_id = info_dict.get('id')
                if selected_tracks and video_id and video_id in selected_tracks:
                    idx = selected_tracks.index(video_id) + 1
                else:
                    idx = max(1, playlist_index)
                
                global_percent = ((idx - 1) / effective_total) * 100 + (current_percent / effective_total)
                percent_to_show = round(global_percent, 2)
                status_text = f" {idx}/{effective_total}"
            else:
                percent_to_show = round(current_percent, 2)
                status_text = ""
            
            speed = clean_ansi(d.get('_speed_str', ''))
            eta = clean_ansi(d.get('_eta_str', ''))
            
            # Mevcut yüzdeden daha küçükse güncelleme — asla geriye gitme
            prev_percent = progress_store.get(task_id, {}).get('percent', 0)
            safe_percent  = max(prev_percent, percent_to_show)

            progress_store[task_id] = {
                'status': 'downloading',
                'status_text': status_text,
                'percent': safe_percent,
                'speed': speed.strip(),
                'eta': eta.strip(),
                'filename': d.get('filename') # Temizlik islemi icin dosya yolunu kaydet
            }
        elif status == 'finished':
            info_dict = d.get('info_dict') or {}
            playlist_index = info_dict.get('playlist_index')
            n_entries = info_dict.get('n_entries')
            
            effective_total = len(selected_tracks) if selected_tracks else (n_entries or 1)
            
            if playlist_index and effective_total and effective_total > 1:
                video_id = info_dict.get('id')
                if selected_tracks and video_id and video_id in selected_tracks:
                    idx = selected_tracks.index(video_id) + 1
                else:
                    idx = max(1, playlist_index)
                    
                global_percent = (idx / effective_total) * 100
                progress_store[task_id] = {
                    'status': 'processing',
                    'status_text': f" {idx}/{effective_total}",
                    'percent': round(global_percent, 2),
                    'message': 'Processing media (FFmpeg needed)...',
                    'speed': progress_store.get(task_id, {}).get('speed', ''),
                    'eta': ''
                }
            else:
                progress_store[task_id] = {
                    'status': 'processing',
                    'status_text': '',
                    'percent': 100,
                    'message': 'Processing media (FFmpeg needed)...',
                    'speed': '',
                    'eta': ''
                }

    # Postprocessors listesini ayrı oluşturup sona ydl_opts'a atıyoruz.
    # Böylece Pylance tip çıkarımı karışmıyor.
    postprocessors: list[dict] = []
    postprocessor_args: dict[str, list[str]] = {}

    if format_type == 'mp3':
        bitrate = _MP3_QUALITY_MAP.get(quality, '192')

        # 1) Sesi MP3'e dönüştür
        postprocessors.append({
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': bitrate,
        })

        # 2) ID3 metadata göm
        postprocessors.append({
            'key': 'FFmpegMetadata',
            'add_metadata': True,
        })

        # 3) Kapak resmini MP3 içine göm
        postprocessors.append({
            'key': 'EmbedThumbnail',
        })

        # Samsung Music gibi playerların Türkçe/Özel karakterleri bozmadan düzgün okuyabilmesi 
        # ve doğru ID3 versiyonunu kullanması için ID3v2.3 (UTF-16 encoding ile) zorluyoruz.
        # Ayrıca cover art'ı vs daha stabil yazar.
        postprocessor_args['ffmpeg'] = ['-id3v2_version', '3']

        fmt = 'bestaudio/best'
        write_thumb = True

    else:
        # MP4 — Kaliteye göre en iyi akışı birleştir
        fmt = _MP4_QUALITY_MAP.get(
            quality,
            'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        )
        write_thumb = False

    def my_match_filter(info, *args, **kwargs):
        video_id = info.get('id')
        # Single modda filtreleme yok
        if mode == 'single':
            return None
        # Eğer hiç seçim yapılmamışsa (boş liste), tümünü indir
        if not selected_tracks:
            return None
        # video_id henüz belli değilse (playlist seviyesi), atla
        if not video_id:
            return None
        # Seçili listede varsa indir
        if video_id in selected_tracks:
            return None
        return 'Skipped by user selection'

    ydl_opts: dict = {
        'outtmpl':            out_template,
        'format':             fmt,
        'quiet':              True,
        'noplaylist':         (mode == 'single'),
        'match_filter':       my_match_filter,
        'writethumbnail':     write_thumb,
        'overwrites':         True,
        'enable_file_urls':   True,   # Özel kapak resmi file:// URL'i kullandığı için gerekli
        'concurrent_fragment_downloads': 10,
        'postprocessors':     postprocessors,
        'postprocessor_args': postprocessor_args,
        'progress_hooks':     [progress_hook] if task_id else [],
        # Playlist içindeki silinmiş/telif hakkı alınmış/gizli videoları ATLA
        'ignoreerrors':       True,
    }

    import re as _re, base64 as _b64, tempfile as _tmp, os as _os

    def _strip_ansi(text: str) -> str:
        return _re.sub(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])', '', text)

    # Kullanıcı özel kapak resmi seçtiyse, base64'ü temp dosyaya çöz
    custom_thumb_path: Optional[str] = None
    custom_b64 = metadata.get('customThumbnail', '')
    if custom_b64 and ',' in custom_b64:
        try:
            b64_data = custom_b64.split(',', 1)[1]
            img_bytes = _b64.b64decode(b64_data)
            # Temp jpg dosyası oluştur
            fd, custom_thumb_path = _tmp.mkstemp(suffix='.jpg', prefix='ytdl_cover_', dir=DOWNLOAD_FOLDER)
            _os.close(fd)
            with open(custom_thumb_path, 'wb') as f:
                f.write(img_bytes)
        except Exception as e:
            print(f'[WARN] Custom thumbnail decode failed: {e}')
            custom_thumb_path = None

    try:
        class MetadataOverridePP(yt_dlp.postprocessor.common.PostProcessor):
            def run(self, info):
                if metadata.get('artist'): info['artist'] = metadata['artist']
                if metadata.get('album'): info['album'] = metadata['album']
                if metadata.get('genre'): info['genre'] = metadata['genre']
                if metadata.get('year'): 
                    val = str(metadata['year']).strip()
                    info['release_year'] = int(val) if val.isdigit() else val
                    
                    # yt-dlp FFmpegMetadata, orijinal upload_date veya release_date'i önceliklendirir.
                    # Eğer onları ezmezsek, YouTube'un yükleme tarihi (örn. 2018) yılı ezer.
                    formatted_date = (val + '0101') if (val.isdigit() and len(val) == 4) else val
                    info['release_date'] = formatted_date
                    info['upload_date'] = formatted_date
                    info['date'] = val
                # Track numarasını belirle:
                # Öncelik: frontend'den gelen track_map (orijinal playlist sırasını her zaman korur)
                # Fallback 1: yt-dlp'nin playlist_index'i (filtrelemedeyse yanlış olabilir)
                # Fallback 2: Kullanıcının manualolarak girdigi track number
                video_id = info.get('id', '')
                if track_map and video_id and str(video_id) in track_map:
                    # trackMap'ten orijinal sirayı alı — hiçbir filtreden etkilenmez
                    info['track_number'] = int(track_map[str(video_id)])
                    print(f'[DEBUG] track_number from trackMap: {info["track_number"]} for {video_id}')
                else:
                    playlist_index = info.get('playlist_index')
                    if playlist_index and int(playlist_index) > 0:
                        info['track_number'] = int(playlist_index)
                    else:
                        # Tekli videolarda kullanıcının girdigi (veya 1) numarayı kullan
                        trk = metadata.get('track') or metadata.get('track_number')
                        if trk: 
                            val = str(trk).strip()
                            info['track_number'] = int(val) if val.isdigit() else 1

                # Özel kapak varsa, yt-dlp'nin kendi thumbnail URL'ini bizim dosyamızla değiştir
                # Bu sayede EmbedThumbnail bizim dosyayı kullanır
                if custom_thumb_path and _os.path.exists(custom_thumb_path):
                    info['thumbnails'] = [{'url': f'file:///{custom_thumb_path.replace(chr(92), "/")}', 'id': 'custom'}]
                    info['thumbnail']  = f'file:///{custom_thumb_path.replace(chr(92), "/")}'

                return [], info

        # ---------------------------------------------------------------
        # mutagen ile ID3 year tag'ını GARANTI altına alan PostProcessor.
        # FFmpegMetadata çoğu zaman upload_date'i yazar, bu da yanlış yıl
        # gösterir. Bu PP, dosya tamamen oluştuktan SONRA çalışarak doğrudan
        # ID3 TYER (v2.3) ve TDRC (v2.4) etiketlerini kullanıcının girdiği
        # yıl ile değiştirir.
        # ---------------------------------------------------------------
        class MutagenYearPP(yt_dlp.postprocessor.common.PostProcessor):
            def run(self, info):
                if format_type != 'mp3':
                    return [], info
                year_val = str(metadata.get('year', '')).strip()
                if not year_val:
                    return [], info

                filepath = info.get('filepath', '')
                if not filepath or not filepath.lower().endswith('.mp3'):
                    return [], info

                try:
                    from mutagen.id3 import ID3, TYER, TDRC, ID3NoHeaderError
                    try:
                        tags = ID3(filepath)
                    except ID3NoHeaderError:
                        tags = ID3()

                    # ID3v2.3 — TYER (Samsung Music, Windows Media Player bunu okur)
                    tags.delall('TYER')
                    tags.add(TYER(encoding=3, text=[year_val]))

                    # ID3v2.4 — TDRC (modern player'lar bunu okur)
                    tags.delall('TDRC')
                    tags.add(TDRC(encoding=3, text=[year_val]))

                    # Ayrıca TDRL (release date) varsa onu da düzelt
                    tags.delall('TDRL')

                    tags.save(filepath, v2_version=3)
                    print(f'[MUTAGEN] Year tag fixed -> {year_val} for {_os.path.basename(filepath)}')
                except ImportError:
                    print('[WARN] mutagen not installed, skipping year tag fix')
                except Exception as e:
                    print(f'[WARN] mutagen year fix failed: {e}')

                return [], info
        class TDL_Logger:
            def __init__(self):
                self.errors = []
            def debug(self, msg): print(msg)
            def info(self, msg): print(msg)
            def warning(self, msg): print("[WARN]", msg)
            def error(self, msg):
                print("[ERROR]", msg)
                self.errors.append(msg)
                
        my_logger = TDL_Logger()
        ydl_opts['logger'] = my_logger

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # 1) Pre-process: info dict'teki metadata'yı kullanıcının girdisiyle değiştir
            ydl.add_post_processor(MetadataOverridePP(), when='pre_process')
            # 2) Post-process: Dosya tamamen yazıldıktan sonra mutagen ile ID3 year tag'ını düzelt
            ydl.add_post_processor(MutagenYearPP(), when='after_move')
            
            retcode = ydl.download([url])
            
            if retcode != 0:
                # Eger indirme basarisiz olursa UI'a sahte bir basari yerine gercek hatayi ilet.
                err_msg = my_logger.errors[-1] if my_logger.errors else f"Unknown yt-dlp error (code {retcode})"
                if "ffmpeg" in err_msg.lower() or "ffprobe" in err_msg.lower():
                    err_msg = "Sisteminizde FFmpeg bulunamadı! MP3 dönüşümü için FFmpeg kurulu olmalıdır."
                return {
                    'success': False,
                    'error': err_msg
                }

        # Indirme bittikten sonra kalan .part / .ytdl dosyalarini temizle
        # (match_filter ile atlanan videolarin artiklari olabilir)
        try:
            import glob as _glob
            download_dir = DOWNLOAD_FOLDER
            if mode in ('playlist', 'album'):
                # Alt klasörlerde de ara
                for pattern in ['**/*.part', '**/*.ytdl', '**/*.part-Frag*']:
                    for leftover in _glob.glob(_os.path.join(download_dir, pattern), recursive=True):
                        try:
                            _os.remove(leftover)
                            print(f'[CLEANUP] Removed leftover: {_os.path.basename(leftover)}')
                        except Exception:
                            pass
        except Exception:
            pass

        # Kapak resmi artıklarını temizle (.jpg/.webp/.png - EmbedThumbnail sonrası kalan dosyalar)
        try:
            import glob as _glob
            search_dir = DOWNLOAD_FOLDER
            if mode in ('playlist', 'album'):
                thumb_patterns = ['**/*.jpg', '**/*.webp', '**/*.png']
            else:
                thumb_patterns = ['*.jpg', '*.webp', '*.png']
            for pattern in thumb_patterns:
                for thumb_file in _glob.glob(_os.path.join(search_dir, pattern), recursive=True):
                    try:
                        # Sadece küçük boyutlu dosyaları sil (kapak resimleri genelde < 5MB)
                        if _os.path.getsize(thumb_file) < 5 * 1024 * 1024:
                            _os.remove(thumb_file)
                    except Exception:
                        pass
        except Exception:
            pass

        return {
            'success': True,
            'message': f'{mode.capitalize()} downloaded successfully as {format_type.upper()}!',
        }
    except Exception as exc:
        clean_msg = _strip_ansi(str(exc))
        # Eğer indirme kullanıcı tarafından iptal edildiyse, youtube-dl'nin bıraktığı .part/.ytdl vb. sil.
        if 'cancelled by user' in clean_msg.lower() and task_id and task_id in progress_store:
            partial_file = progress_store[task_id].get('filename')
            if partial_file:
                try:
                    import glob, time, re
                    # Windows'ta yt-dlp kapansa bile dosya kilidinin kalkmasi biraz zaman alir
                    time.sleep(1)
                    
                    base_name = partial_file
                    if base_name.endswith('.part'): base_name = base_name[:-5]
                    if base_name.endswith('.ytdl'): base_name = base_name[:-5]
                    
                    # Eger format id eklenmisse (.f137, .f140, .f18 vb) bunu temizleyerek kok title'i bulalim
                    base_clean = re.sub(r'\.f\d+[a-zA-Z0-9]*$', '', _os.path.splitext(base_name)[0])
                    
                    search_pattern = glob.escape(base_clean) + '*'
                    print(f'[DEBUG] Cancel cleanup looking for: {search_pattern}')
                    
                    for f_path in glob.glob(search_pattern):
                        try:
                            _os.remove(f_path)
                            print(f"[DEBUG] Deleted cancelled fragment: {f_path}")
                        except Exception as e:
                            print(f"[DEBUG] Cleanup failed for {f_path}: {e}")
                except Exception as ex:
                    print(f"[DEBUG] Cleanup error: {ex}")
        return {'success': False, 'error': f'Download failed: {clean_msg}'}
    finally:
        # Geçici kapak dosyasını temizle
        if custom_thumb_path and _os.path.exists(custom_thumb_path):
            try:
                _os.remove(custom_thumb_path)
            except Exception:
                pass
