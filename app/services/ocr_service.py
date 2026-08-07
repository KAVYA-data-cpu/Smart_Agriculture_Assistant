import os
import tempfile

import easyocr
import fitz  # PyMuPDF — renders PDF pages to images so OCR can read them

# Load OCR model only once
reader = easyocr.Reader(['en'])

IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.webp'}
PDF_EXTENSIONS = {'.pdf'}
SUPPORTED_EXTENSIONS = IMAGE_EXTENSIONS | PDF_EXTENSIONS


def _extract_text_from_image(image_path: str) -> str:
    results = reader.readtext(image_path)
    return "\n".join(result[1] for result in results)


def _extract_text_from_pdf(pdf_path: str) -> str:
    """
    easyocr can only read image files, so each PDF page is first rendered
    to a PNG (at 200 DPI for good OCR accuracy) and then OCR'd individually.
    """
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


def extract_text(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()

    if ext in PDF_EXTENSIONS:
        return _extract_text_from_pdf(file_path)

    if ext in IMAGE_EXTENSIONS:
        return _extract_text_from_image(file_path)

    raise ValueError(
        f"Unsupported file type '{ext or 'unknown'}'. Please upload a PDF or an image (PNG/JPG)."
    )
