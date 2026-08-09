FROM python:3.12-slim

WORKDIR /app

# Minimal system libraries for PyMuPDF, Pillow, and Tesseract OCR
RUN apt-get update && apt-get install -y \
    libgomp1 \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

COPY requirements-cloud.txt .

RUN pip install --no-cache-dir -r requirements-cloud.txt

COPY . .

# Required directories
RUN mkdir -p uploads app/static/uploads app/static/audio

EXPOSE 7860

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860}"]