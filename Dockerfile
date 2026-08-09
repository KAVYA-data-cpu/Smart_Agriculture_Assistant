FROM python:3.12-slim

WORKDIR /app

# Install system dependencies needed by easyocr, PyMuPDF, and others
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install CPU-only torch first (avoids pulling multi-GB CUDA build)
RUN pip install --no-cache-dir \
    --extra-index-url https://download.pytorch.org/whl/cpu \
    -r requirements.txt

COPY . .

# Make sure uploads and audio dirs exist
RUN mkdir -p uploads app/static/uploads app/static/audio

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]