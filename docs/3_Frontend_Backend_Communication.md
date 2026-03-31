# How Will Frontend and Backend Communication Be?

This project contains a React-based Frontend and a Flask-based Backend. Since these two technologies are written in different languages, they cannot "directly" share variables or functions.

Just like in traditional websites, these two structures will communicate and understand each other by messaging over **HTTP (REST API) Requests** in JSON format.

## Basic Working Principle

1. Python (Flask) starts running with your application on `http://127.0.0.1:5000` (or another available port).
2. Flask opens various paths (Endpoints / Routes).
   - Example: To find the cover of the video, `GET /api/info?url=youtube.com/watch...` is created.
3. React (Frontend) takes the address entered by the user and sends this URL as a "Request" (Fetch/Axios) to Flask.
4. In Python, yt-dlp finds the title and cover of this video, puts them in a Dictionary, converts it back to JSON, and returns a response to React.
5. React takes this data and enables its use on the screen (State).

## Skeleton Code Idea

Actually, the React part of the job is quite simple.

```javascript
// frontend/src/services/api.js

export const fetchVideoInfo = async (youtubeUrl) => {
  try {
    const response = await fetch(
      `http://127.0.0.1:5000/api/info?url=${encodeURIComponent(youtubeUrl)}`,
    );

    if (!response.ok) {
      // If an error is returned from Backend (Python), catch and throw it.
      const errorData = await response.json();
      throw new Error(errorData.message || "Could not fetch video info.");
    }

    const data = await response.json();
    return data; // Example { title: "Song Name", thumbnail: "image.jpg" }
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};
```

When the user presses the **Download** button on the User interface (Frontend), a POST request is fired and the format (MP3, MP4) is informed to the backend. This is the fundamental philosophy of the communication.
