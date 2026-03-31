/**
 * api.js — Service layer for communicating with the Flask backend (http://127.0.0.1:5000).
 * App.jsx and all components import this module to reach the backend.
 */

const isElectron = !!window?.electronAPI?.isElectron;
// In Electron: talk directly to Flask. In the browser: use Vite's proxy (empty string → /api/…)
export const BASE_URL = isElectron ? 'http://127.0.0.1:5000' : '';

// -----------------------------------------------------------------------
// GET /api/info?url=<youtubeUrl>
// Fetches video or playlist metadata.
// -----------------------------------------------------------------------
// Safe JSON parse — Flask may return HTML if it is not running
const safeJson = async (response) => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    // Log the raw response for debugging
    console.error('[safeJson] Non-JSON response:', text.slice(0, 500));
    throw new Error(`Server error: ${text.slice(0, 200)}`);
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
// Starts the download. Awaits until the download completes.
// -----------------------------------------------------------------------
export const startDownload = async ({ url, format, quality, mode, metadata, taskId, selectedTracks, trackMap, isWeb }) => {
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
      isWeb: isWeb || false,
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
// Polls the current download progress.
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
// Cancels an in-progress download.
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
