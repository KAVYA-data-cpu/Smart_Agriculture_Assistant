"""
ocr_service.py — lightweight OCR using Tesseract.

We replaced easyocr (which requires PyTorch) with pytesseract
so that Image OCR and Scanned PDF OCR work in low-RAM cloud deployments.
"""
import os
import tempfile
import fitz  # PyMuPDF
from PIL import Image

try:
    import pytesseract
    _TESSERACT_AVAILABLE = True
except ImportError:
    _TESSERACT_AVAILABLE = False

try:
    import easyocr
    _EASYOCR_AVAILABLE = True
    _easyocr_reader = None
except ImportError:
    _EASYOCR_AVAILABLE = False
    _easyocr_reader = None


IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.webp'}
PDF_EXTENSIONS = {'.pdf'}
SUPPORTED_EXTENSIONS = IMAGE_EXTENSIONS | PDF_EXTENSIONS


def _extract_text_from_image(image_path: str) -> str:
    global _easyocr_reader
    if _TESSERACT_AVAILABLE:
        try:
            return pytesseract.image_to_string(Image.open(image_path))
        except Exception as e:
            pass

    if _EASYOCR_AVAILABLE:
        try:
            if _easyocr_reader is None:
                _easyocr_reader = easyocr.Reader(['en'], gpu=False)
            results = _easyocr_reader.readtext(image_path, detail=0)
            return "\n".join(results)
        except Exception as e:
            return f"Error running EasyOCR: {e}"

    return "No OCR engine (pytesseract or easyocr) is available."


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
    
    # Fallback to Tesseract OCR for scanned PDFs
    return _extract_text_from_pdf_ocr(pdf_path)


def extract_text(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()

    if ext in PDF_EXTENSIONS:
        return _extract_text_from_pdf(file_path)

    if ext in IMAGE_EXTENSIONS:
        return _extract_text_from_image(file_path)

    raise ValueError(
        f"Unsupported file type '{ext or 'unknown'}'. Please upload a PDF or an image (PNG/JPG)."
    )
