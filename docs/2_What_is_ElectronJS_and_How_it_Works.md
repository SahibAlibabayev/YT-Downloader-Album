# What is Electron.js and How it Works?

Electron.js is a framework that allows you to develop cross-platform (Windows, Mac, Linux) desktop applications using **web technologies (HTML, CSS, JavaScript/React)**.

In the past, you needed to know C#, C++, or Java and write separate code for each operating system to make a desktop application. Thanks to Electron.js, you can convert a website you wrote with web technologies you know into a desktop application. (Applications like VS Code, Discord, Slack are also written using Electron.js).

## Electron Has Two Core Concepts

Electron is essentially divided into two processes: **Main Process** and **Renderer Process**.

### 1. Main Process - `electron/main.js`

This process is the "backend" that can directly talk to your computer's operating system. Its duties are:

- To create a window when the application is opened (think of it like a Chrome browser tab).
- To access operating system features (e.g., accessing the file system, showing notifications).
- **The most critical task in our project:** To secretly start the Python (Flask) server in the background when the application is opened and shut down the Flask server when the application is closed.

### 2. Renderer Process - `frontend/`

This process is the part working inside the window created by the Main Process. This is actually exactly the codes you wrote with React (Vite).

- Buttons, inputs, images are shown here.
- The user operates here.

## How Does it Provide Display?

Electron contains an embedded **Chromium** (the infrastructure of Google Chrome) browser and a **Node.js** environment. The moment the Main process opens the window, the renderer process (your React code) is loaded inside this Chromium framework. The user doesn't feel like they are on a website; they feel like they are using a real program because there is no address bar or tabs.

## Why Are We Using It In This Project?

Our goal is to make a YouTube Downloader desktop application. Users click on the program from the start menu without entering a browser (Chrome, Safari). The window that opens comes thanks to Electron, the appearance is done with React. The power of Python (`yt-dlp`), a powerful library for the downloading process, is used.
