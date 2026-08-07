from app.repositories import news_repository

NEWS_CATEGORIES = {
    "msp": "MSP Minimum Support Price agriculture India",
    "schemes": "government scheme agriculture India farmers",
    "market": "agriculture market news India mandi",
    "export": "agriculture export India crops"
}


def get_latest_news(max_results=10):
    """General agriculture news, not filtered to one category."""
    articles = news_repository.fetch_news("agriculture India news", max_results)
    return {"category": "latest", "count": len(articles), "articles": articles}


def get_news_by_category(category, max_results=10):
    category_key = category.strip().lower()

    if category_key not in NEWS_CATEGORIES:
        return {
            "error": f"Unknown category '{category}'. Valid options: {list(NEWS_CATEGORIES.keys())}"
        }

    query = NEWS_CATEGORIES[category_key]
    articles = news_repository.fetch_news(query, max_results)

    return {"category": category_key, "count": len(articles), "articles": articles}


def get_all_news_sections(max_results_per_category=5):
    """One combined response with Latest + all 4 categories, for a dashboard view."""
    result = {"latest": get_latest_news(max_results_per_category)}

    for category_key in NEWS_CATEGORIES:
        result[category_key] = get_news_by_category(category_key, max_results_per_category)

    return result