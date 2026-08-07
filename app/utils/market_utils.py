def normalize(text: str) -> str:
    """Lowercase and strip whitespace for consistent comparisons."""
    return text.strip().lower()


def text_matches(query: str, field_value: str) -> bool:
    """Check if a search query is contained inside a field's value."""
    return normalize(query) in normalize(field_value or "")