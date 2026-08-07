import json
import os
import time
import logging
from datetime import date

import requests

from app.config import DATA_GOV_API_KEY, MARKET_API_URL

logger = logging.getLogger(__name__)

DATA_FILE = os.path.join("datasets", "market", "latest.json")
HISTORY_FOLDER = os.path.join("datasets", "market", "history")
PAGE_SIZE = 1000

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
}


def fetch_all_records_from_api():
    """Talks to data.gov.in and pulls every record via pagination. Returns a list."""
    all_records = []
    offset = 0

    while True:
        params = {
            "api-key": DATA_GOV_API_KEY,
            "format": "json",
            "limit": PAGE_SIZE,
            "offset": offset,
        }
        response = requests.get(MARKET_API_URL, params=params, headers=HEADERS, timeout=30)
        data = response.json()

        records = data.get("records", [])
        if not records:
            break

        all_records.extend(records)
        logger.info("Fetched %s records so far (offset=%s)", len(all_records), offset)

        offset += PAGE_SIZE
        total = int(data.get("total", 0))
        if offset >= total:
            break

        time.sleep(0.5)

    return all_records


def save_latest(records):
    """Overwrites the 'latest.json' file with today's freshest data."""
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(records, f)
    logger.info("Saved %s records to %s", len(records), DATA_FILE)


def save_history_snapshot(records):
    """Saves a permanent dated copy — never overwritten."""
    os.makedirs(HISTORY_FOLDER, exist_ok=True)
    today_str = date.today().isoformat()
    history_file = os.path.join(HISTORY_FOLDER, f"{today_str}.json")

    with open(history_file, "w", encoding="utf-8") as f:
        json.dump(records, f)
    logger.info("Saved history snapshot: %s", history_file)


def load_latest():
    """Reads today's latest saved data. Returns [] if not available yet."""
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def load_history_dates():
    """Returns a sorted list of all dates we have history for, e.g. ['2026-08-01', '2026-08-02']."""
    if not os.path.exists(HISTORY_FOLDER):
        return []
    files = os.listdir(HISTORY_FOLDER)
    dates = [f.replace(".json", "") for f in files if f.endswith(".json")]
    return sorted(dates)


def load_history_for_date(date_str):
    """Reads one specific day's saved data. Returns [] if that day wasn't saved."""
    history_file = os.path.join(HISTORY_FOLDER, f"{date_str}.json")
    if not os.path.exists(history_file):
        return []
    with open(history_file, "r", encoding="utf-8") as f:
        return json.load(f)