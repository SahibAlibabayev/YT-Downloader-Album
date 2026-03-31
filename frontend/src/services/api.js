/**
 * api.js — Flask backend (http://127.0.0.1:5000) ile iletişim kuran servis katmanı.
 * App.jsx ve bileşenler bu modülü import ederek backend'e bağlanır.
 */

const isElectron = !!window?.electronAPI?.isElectron;
// Electron'da dogrudan Flask'a, tarayicida Vite proxy ustunden (bos string, /api/... path'leri aynen kullan)
const BASE_URL = isElectron ? 'http://127.0.0.1:5000' : '';

// -----------------------------------------------------------------------
// GET /api/info?url=<youtubeUrl>
// Video veya playlist metadata'sını çeker.
// -----------------------------------------------------------------------
// Guvenli JSON parse — Flask calismiorsa HTML donebilir
const safeJson = async (response) => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    // Gercek hatayi konsola yaz (gelistirici icin)
    console.error('[safeJson] Non-JSON response:', text.slice(0, 500));
    throw new Error(`Sunucu hatasi: ${text.slice(0, 200)}`);
  }
};

export const fetchVideoInfo = async (youtubeUrl) => {
  const response = await fetch(
    `${BASE_URL}/api/info?url=${encodeURIComponent(youtubeUrl)}`
  );

  const data = await safeJson(response);

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Could not fetch video info.');
  }

  return data;
};

// -----------------------------------------------------------------------
// POST /api/download
// İndirme işlemini başlatır. Tamamlanana kadar bekler.
// -----------------------------------------------------------------------
export const startDownload = async ({ url, format, quality, mode, metadata, taskId, selectedTracks, trackMap }) => {
  const response = await fetch(`${BASE_URL}/api/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      format,
      quality,
      mode,
      task_id: taskId,
      selected_tracks: selectedTracks,
      track_map: trackMap || {},
      metadata: {
        artist:          metadata?.artist          || '',
        album:           metadata?.album           || '',
        genre:           metadata?.genre           || '',
        year:            metadata?.year            || '',
        track_number:    metadata?.track           || '1',
        customThumbnail: metadata?.customThumbnail || '',
      },
    }),
  });

  const data = await safeJson(response);

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Download failed.');
  }

  return data;
};

// -----------------------------------------------------------------------
// GET /api/progress?task_id=<taskId>
// İndirme ilerlemesini çeker
// -----------------------------------------------------------------------
export const fetchProgress = async (taskId) => {
  const response = await fetch(`${BASE_URL}/api/progress?task_id=${taskId}`);
  const data = await safeJson(response);

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Could not fetch progress.');
  }

  return data.data; // { status, percent, speed, eta, etc. }
};

// -----------------------------------------------------------------------
// POST /api/cancel
// İndirmeyi iptal eder
// -----------------------------------------------------------------------
export const cancelDownload = async (taskId) => {
  try {
    await fetch(`${BASE_URL}/api/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId }),
    });
  } catch {
    // Cancel errors are non-critical
  }
};
