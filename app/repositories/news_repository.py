import feedparser
from urllib.parse import quote

BASE_RSS_URL = "https://news.google.com/rss/search?q={query}&hl=en-IN&gl=IN&ceid=IN:en"


def fetch_news(query, max_results=10):
    """
    Fetches news articles matching a search query from Google News RSS.
    Returns a list of simple article dictionaries.
    """
    url = BASE_RSS_URL.format(query=quote(query))
    feed = feedparser.parse(url)

    articles = []
    for entry in feed.entries[:max_results]:
        articles.append({
            "title": entry.get("title", ""),
            "link": entry.get("link", ""),
            "published": entry.get("published", ""),
            "source": entry.get("source", {}).get("title", "") if entry.get("source") else ""
        })

    return articles