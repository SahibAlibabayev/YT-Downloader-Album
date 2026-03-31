# Architecture and Folder Structure Guide

In this project, we are using a 3-tier architecture:

1. **Frontend (User Interface):** A fast and modern interface will be developed using Vite + React.
2. **Backend (Business Logic and Downloading):** All video/playlist fetching, processing, and error handling operations will be performed using Python, `yt-dlp`, and `Flask`.
3. **Desktop Environment (Wrapper):** The React interface will be embedded into the desktop environment using Electron.js, and the Python Flask server will run in the background.

## Communication Cycle

- The user enters the link in the interface and clicks the **"Fetch Info"** button.
- React sends a request to Flask (`http://127.0.0.1:5000/api/info`) via an HTTP GET/POST request.
- Flask parses the link with yt-dlp and returns the result in JSON format to React.
- The user sees the cover image and information. Selects the download quality and format (MP3/MP4) and clicks **"Download"**.
- React sends the download request to Flask (`http://127.0.0.1:5000/api/download`) and the download starts.

## Folder Structure

- `backend/`: This is where the Flask server and yt-dlp-related operations are kept.
- `frontend/`: This is where React components and UI elements are located.
- `electron/`: The folder acting as a bridge where we manage the desktop application appearance and the start/stop events of Flask.
- `docs/`: The folder containing documentation explaining the technologies used in the application.
