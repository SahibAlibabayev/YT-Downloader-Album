FROM python:3.11-slim

# Install system dependencies (ffmpeg is required by yt-dlp) and Node.js for frontend
RUN apt-get update && \
    apt-get install -y ffmpeg curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean

# Set app directory
WORKDIR /app

# Copy all files
COPY . .

# Build frontend
WORKDIR /app/frontend
RUN npm install
RUN npm run build

# Install backend dependencies
WORKDIR /app/backend
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir gunicorn

# Expose port
EXPOSE 5000

# Start server with gunicorn, using 1000s timeout since YT downloads can take a while
CMD gunicorn -b 0.0.0.0:${PORT:-5000} --workers 1 --threads 4 --timeout 1000 app:app
