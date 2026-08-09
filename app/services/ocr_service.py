"""
ocr_service.py — graceful fallback when easyocr is not installed.

In the cloud (lightweight) deployment, easyocr is not available.
For PDFs, we use PyMuPDF's native text extraction (works without OCR).
For images, we return a friendly "not available" message.
"""
import os
import tempfile

import fitz  # PyMuPDF — always available

try:
    import easyocr
    _reader = easyocr.Reader(['en'])
    _EASYOCR_AVAILABLE = True
except ImportError:
    _EASYOCR_AVAILABLE = False

IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.webp'}
PDF_EXTENSIONS = {'.pdf'}
SUPPORTED_EXTENSIONS = IMAGE_EXTENSIONS | PDF_EXTENSIONS


def _extract_text_from_image(image_path: str) -> str:
    if not _EASYOCR_AVAILABLE:
        return (
            "Image OCR is not available in this cloud deployment. "
            "Please upload a PDF instead, or run the app locally for image OCR support."
        )
    results = _reader.readtext(image_path)
    return "\n".join(result[1] for result in results)


def _extract_text_from_pdf_native(pdf_path: str) -> str:
    """Use PyMuPDF's native text layer (no OCR needed for digital PDFs)."""
    text_parts = []
    doc = fitz.open(pdf_path)
    try:
        for page in doc:
            text_parts.append(page.get_text())
    finally:
        doc.close()
    return "\n".join(text_parts)


def _extract_text_from_pdf_ocr(pdf_path: str) -> str:
    """Render each page to image then OCR (fallback for scanned PDFs)."""
    text_parts = []
    doc = fitz.open(pdf_path)
    try:
        for page_index in range(len(doc)):
            page = doc.load_page(page_index)
            pixmap = page.get_pixmap(dpi=200)
            tmp_path = None
            try:
                with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                    tmp_path = tmp.name
                pixmap.save(tmp_path)
                text_parts.append(_extract_text_from_image(tmp_path))
            finally:
                if tmp_path and os.path.exists(tmp_path):
                    os.remove(tmp_path)
    finally:
        doc.close()
    return "\n".join(text_parts)


def _extract_text_from_pdf(pdf_path: str) -> str:
    # Try native text layer first (works for digital/typed PDFs, no OCR needed)
    text = _extract_text_from_pdf_native(pdf_path)
    if text.strip():
        return text
    # Fallback to easyocr for scanned PDFs (only available locally)
    if _EASYOCR_AVAILABLE:
        return _extract_text_from_pdf_ocr(pdf_path)
    return (
        "This appears to be a scanned PDF (no text layer). "
        "Image OCR is not available in this cloud deployment. "
        "Please upload a PDF with a text layer, or run the app locally for scanned PDF support."
    )


def extract_text(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()

    if ext in PDF_EXTENSIONS:
        return _extract_text_from_pdf(file_path)

    if ext in IMAGE_EXTENSIONS:
        return _extract_text_from_image(file_path)

    raise ValueError(
        f"Unsupported file type '{ext or 'unknown'}'. Please upload a PDF or an image (PNG/JPG)."
    )
