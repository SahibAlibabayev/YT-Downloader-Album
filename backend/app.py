import sys, os

# Windows'ta konsol encoding'i charmap (cp1252) olur ve Unicode karakterler (Japonca, emoji vb.) çöker.
# stdout/stderr'i UTF-8'e zorla — bu sayede yt-dlp'nin yazdığı her karakter sorunsuz geçer.
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# app.py'nin bulunduğu klasörü her zaman Python path'e ekle
# Böylece packaged modda cwd ne olursa olsun downloader.py bulunur
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, request, jsonify
from flask_cors import CORS
from downloader import get_video_info, download_media, progress_store, cancel_store, set_download_folder

import re, traceback

app = Flask(__name__)
CORS(app)   # React (port 5173) → Flask (port 5000) arasındaki CORS engelini kaldırır

# -----------------------------------------------------------------------
# Global hata yakalayıcılar — her zaman JSON döndürür, HTML değil
# -----------------------------------------------------------------------
@app.errorhandler(Exception)
def handle_exception(e):
    traceback.print_exc()
    return jsonify({'success': False, 'message': str(e)}), 500

@app.errorhandler(404)
def handle_404(e):
    return jsonify({'success': False, 'message': 'Endpoint not found'}), 404


# -----------------------------------------------------------------------
# POST /api/settings
# Ayarları günceller (şimdilik sadece indirme klasörü)
# -----------------------------------------------------------------------
@app.route('/api/settings', methods=['POST'])
def api_set_settings():
    data = request.json or {}
    new_folder = data.get('downloadFolder')
    if new_folder:
        set_download_folder(new_folder)
        return jsonify({'success': True, 'message': 'Download folder updated'})
    return jsonify({'success': False, 'message': 'No download folder provided'}), 400

# -----------------------------------------------------------------------
# POST /api/cancel — İndirmeyi iptal et
# -----------------------------------------------------------------------
@app.route('/api/cancel', methods=['POST'])
def api_cancel():
    data = request.json or {}
    task_id = data.get('task_id')
    if task_id:
        cancel_store[task_id] = True
        return jsonify({'success': True, 'message': 'Cancellation requested'})
    return jsonify({'success': False, 'message': 'task_id required'}), 400

# -----------------------------------------------------------------------
# GET /api/info?url=<youtube_url>
# -----------------------------------------------------------------------
@app.route('/api/info', methods=['GET'])
def api_get_info():
    """
    Frontend'den gelen YouTube linkini alır.
    Döndürdüğü JSON örneği:
    {
      "success": true,
      "type": "single" | "playlist",
      "title": "...",
      "author": "...",
      "thumbnail": "https://...",
      "duration": "14:20",
      "item_count": 1,
      "metadata": { "artist": "...", "album": "", "genre": "", "year": "2026", "track_number": "1" },
      "items": [...]     ← Playlist ise dolu, single ise boş
    }
    """
    url = request.args.get('url', '').strip()

    if not url:
        return jsonify({'success': False, 'message': 'Please provide a valid URL.'}), 400

    print(f'\n[INFO REQUEST] {url}')
    result = get_video_info(url)

    if result.get('success'):
        return jsonify(result), 200
    else:
        return jsonify({'success': False, 'message': result.get('error', 'Unknown error')}), 500


# -----------------------------------------------------------------------
# POST /api/download
# -----------------------------------------------------------------------
@app.route('/api/download', methods=['POST'])
def api_download():
    """
    Frontend indirme butonuna basıldığında çağrılır.
    Beklenen JSON gövdesi:
    {
      "url":      "https://...",
      "format":   "mp3" | "mp4",
      "quality":  "320kbps" | "192kbps" | "128kbps" | "1080p" | "720p" | "480p" | "360p",
      "mode":     "single" | "playlist" | "album",
      "metadata": { "artist": "...", "album": "...", "genre": "...", "year": "...", "track_number": "..." }
    }
    """
    data = request.get_json(force=True, silent=True)

    if not data:
        return jsonify({'success': False, 'message': 'Request body must be valid JSON.'}), 400

    url         = data.get('url', '').strip()
    format_type     = data.get('format', 'mp4').lower()
    quality         = data.get('quality', 'best')
    mode            = data.get('mode', 'single')
    metadata        = data.get('metadata', {})
    task_id         = data.get('task_id', None)
    selected_tracks = data.get('selected_tracks', [])
    track_map       = data.get('track_map', {})

    if not url:
        return jsonify({'success': False, 'message': 'A URL is required to download.'}), 400

    print(f'\n{"="*60}')
    print(f'[DOWNLOAD REQUEST RECEIVED] mode={mode} | format={format_type} | quality={quality}')
    print(f'[URL] {url}')
    print(f'[TASK_ID] {task_id}')
    print(f'{"="*60}')

    result = download_media(url, format_type, quality, mode, metadata, task_id, selected_tracks, track_map)

    if result.get('success'):
        return jsonify(result), 200
    else:
        return jsonify({'success': False, 'message': result.get('error', 'Unknown error')}), 500


# -----------------------------------------------------------------------
# GET /api/progress?task_id=<task_id>
# -----------------------------------------------------------------------
@app.route('/api/progress', methods=['GET'])
def api_progress():
    task_id = request.args.get('task_id')
    if not task_id:
        return jsonify({'success': False, 'message': 'task_id required.'}), 400
        
    data = progress_store.get(task_id, {"status": "starting", "percent": 0})
    return jsonify({'success': True, 'data': data}), 200

# -----------------------------------------------------------------------
if __name__ == '__main__':
    print('Flask backend started -> http://127.0.0.1:5000')
    app.run(debug=False, port=5000)
