import sys, os

# On Windows the default console encoding is cp1252 (charmap), which crashes
# when yt-dlp prints Unicode characters (Japanese, emoji, etc.).
# Force stdout/stderr to UTF-8 so every character passes through safely.
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Always add the directory containing app.py to sys.path
# so downloader.py can be found regardless of the cwd in packaged mode
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from downloader import get_video_info, download_media, progress_store, cancel_store, set_download_folder

import re, traceback, os, threading, time

# Locate the project root and the pre-built React bundle
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dist_dir = os.path.join(base_dir, 'frontend', 'dist')

# Serve the React build through Flask so a single Render.com service
# handles both the frontend and the Python backend
app = Flask(__name__, static_folder=dist_dir, static_url_path='/')
CORS(app)   # Allow cross-origin requests from the React dev server (port 5173)

@app.route('/')
def serve_index():
    return app.send_static_file('index.html')

# -----------------------------------------------------------------------
# Global error handlers — always return JSON, never HTML
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
# Updates runtime settings (currently only the download folder)
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
# POST /api/cancel — cancel an in-progress download
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
    Accepts a YouTube link from the frontend and returns video/playlist metadata.
    Example JSON response:
    {
      "success": true,
      "type": "single" | "playlist",
      "title": "...",
      "author": "...",
      "thumbnail": "https://...",
      "duration": "14:20",
      "item_count": 1,
      "metadata": { "artist": "...", "album": "", "genre": "", "year": "2026", "track_number": "1" },
      "items": [...]     <- populated for playlists, empty for single videos
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
    Triggered when the user clicks the Download button in the frontend.
    Expected JSON body:
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
    is_web          = data.get('isWeb', False)

    if not url:
        return jsonify({'success': False, 'message': 'A URL is required to download.'}), 400

    print(f'\n{"="*60}')
    print(f'[DOWNLOAD REQUEST RECEIVED] mode={mode} | format={format_type} | quality={quality}')
    print(f'[URL] {url}')
    print(f'[TASK_ID] {task_id}')
    print(f'{"="*60}')

    result = download_media(url, format_type, quality, mode, metadata, task_id, selected_tracks, track_map, is_web=is_web)

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
# GET /api/ping  (used by UptimeRobot / health checks to keep the server awake)
# -----------------------------------------------------------------------
@app.route('/api/ping', methods=['GET'])
def api_ping():
    return jsonify({'success': True, 'message': 'pong'}), 200

# -----------------------------------------------------------------------
# GET /api/serve?task_id=<task_id>
# Streams the downloaded file to the browser and schedules deletion after 10 minutes
# -----------------------------------------------------------------------
@app.route('/api/serve', methods=['GET'])
def serve_file():
    task_id = request.args.get('task_id')
    
    if not task_id or task_id not in progress_store:
        return jsonify({'success': False, 'message': 'Invalid task_id'}), 400
        
    data = progress_store[task_id]
    file_path = data.get('file_path')
    
    if not file_path or not os.path.exists(file_path):
        return jsonify({'success': False, 'message': 'File not found on server'}), 404

    # Schedule deletion 10 minutes after the transfer starts
    # so slow connections have enough time to finish downloading
    def delete_later(path):
        time.sleep(600)
        try:
            if os.path.exists(path):
                os.remove(path)
                print(f"[CLEANUP] Deleted served file: {path}")
        except Exception as e:
            print(f"[CLEANUP ERROR] {e}")

    threading.Thread(target=delete_later, args=(file_path,), daemon=True).start()
    
    return send_file(file_path, as_attachment=True)

# -----------------------------------------------------------------------
if __name__ == '__main__':
    print('Flask backend started -> http://127.0.0.1:5000')
    app.run(host='0.0.0.0', debug=False, port=5000)
