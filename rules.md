# Project Context and Goal

This project is a desktop application where users can download YouTube videos and playlists.
Our biggest priority: The original order of songs in playlist downloads (e.g., 01 - Song Name, 02 - Song Name) must be strictly preserved. The user must be provided with options for MP3, MP4, and quality selection. When a link is entered, the video cover image and information must be displayed in the interface.

# Technology Stack

- Frontend: Vite + React (JavaScript/HTML/CSS)
- Desktop Framework: Electron.js
- Backend/Engine: Python (Flask)
- Download Library: `yt-dlp` (This will strictly be used for stability and playlist ordering, older libraries will not be preferred).

# Architecture and Communication Rules

1. Electron.js will only act as a wrapper.
2. Data exchange between Frontend (React) and Backend (Python) will be provided via HTTP requests (REST API) over a lightweight background Flask server.
3. Errors on the Python side (e.g., invalid link, download failure) must absolutely be communicated to the React interface (Frontend) with meaningful error messages.

# Coding Standards

- Codes must be modular, every function should only do one specific job.
- Flask routes in Python codes must be clear and understandable.
- On the React side, components must be kept clean, complex logic should be moved to separate files (as a hook or util).
- Responses and code comments must be in English. Steps and logic should be explained progressively.
