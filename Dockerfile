FROM python:3.12-slim

WORKDIR /app

# System libraries for easyocr / PyMuPDF / OpenCV
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# CPU-only torch (cuts image from ~4GB to ~800MB)
RUN pip install --no-cache-dir \
    --extra-index-url https://download.pytorch.org/whl/cpu \
    -r requirements.txt

COPY . .

# Required directories
RUN mkdir -p uploads app/static/uploads app/static/audio

# Hugging Face Spaces uses port 7860 by default
# Back4App / Render / other platforms set PORT env var
EXPOSE 7860

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860}"]