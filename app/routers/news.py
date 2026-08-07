from fastapi import APIRouter

from app.services.news_service import get_latest_news, get_news_by_category, get_all_news_sections

router = APIRouter(prefix="/news", tags=["News"])


@router.get("/latest")
def news_latest(max_results: int = 10):
    return get_latest_news(max_results)


@router.get("/category/{category}")
def news_category(category: str, max_results: int = 10):
    return get_news_by_category(category, max_results)


@router.get("/dashboard")
def news_dashboard(max_results_per_category: int = 5):
    return get_all_news_sections(max_results_per_category)