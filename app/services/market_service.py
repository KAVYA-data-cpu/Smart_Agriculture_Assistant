import logging

from app.repositories import market_repository
from app.utils.market_utils import normalize, text_matches

logger = logging.getLogger(__name__)


def refresh_market_data():
    """Fetches fresh data from the API and saves it (latest + history)."""
    try:
        records = market_repository.fetch_all_records_from_api()
        if records:
            market_repository.save_latest(records)
            market_repository.save_history_snapshot(records)
        return records
    except Exception as e:
        logger.error("Failed to refresh market data: %s", e)
        return []


def get_market_prices(crop_name, city):
    records = market_repository.load_latest()
    if not records:
        return {"error": "Market data not loaded yet. Please try again in a moment."}

    matches = [
        r for r in records
        if text_matches(crop_name, r.get("commodity", ""))
        and (text_matches(city, r.get("district", "")) or text_matches(city, r.get("market", "")))
    ]

    if matches:
        return {"found": True, "count": len(matches), "records": matches}

    crop_exists_anywhere = any(text_matches(crop_name, r.get("commodity", "")) for r in records)
    place_exists = any(
        text_matches(city, r.get("district", "")) or text_matches(city, r.get("market", ""))
        for r in records
    )

    if not place_exists:
        return {"found": False, "message": f"'{city}' doesn't match any district or market in today's data. Check spelling."}

    if not crop_exists_anywhere:
        return {"found": False, "message": f"'{crop_name}' has no price data anywhere today."}

    available_here = sorted(set(
        r["commodity"] for r in records
        if text_matches(city, r.get("district", "")) or text_matches(city, r.get("market", ""))
    ))
    return {
        "found": False,
        "message": f"No '{crop_name}' price reported near '{city}' today.",
        "available_crops_nearby": available_here
    }


def get_nearby_market_prices(crop_name, city):
    records = market_repository.load_latest()
    if not records:
        return {"error": "Market data not loaded yet. Please try again in a moment."}

    state = None
    for r in records:
        if text_matches(city, r.get("district", "")) or text_matches(city, r.get("market", "")):
            state = r.get("state")
            break

    if not state:
        return {"found": False, "message": f"Could not find any district or market matching '{city}'."}

    matches = [
        r for r in records
        if r.get("state") == state
        and text_matches(crop_name, r.get("commodity", ""))
    ]

    if not matches:
        return {"found": False, "message": f"No '{crop_name}' price found anywhere in {state} today."}

    matches_sorted = sorted(matches, key=lambda r: r.get("modal_price", 0), reverse=True)
    best_market = matches_sorted[0]
    cheapest_market = matches_sorted[-1]

    return {
        "found": True,
        "state": state,
        "count": len(matches_sorted),
        "best_price_market": {
            "market": best_market.get("market"),
            "district": best_market.get("district"),
            "modal_price": best_market.get("modal_price")
        },
        "cheapest_market": {
            "market": cheapest_market.get("market"),
            "district": cheapest_market.get("district"),
            "modal_price": cheapest_market.get("modal_price")
        },
        "all_markets": matches_sorted
    }
def get_historical_prices(crop_name, city, days=7):
    """
    Search for a crop's price in a city across the last N days of saved history.
    """
    all_dates = market_repository.load_history_dates()
    if not all_dates:
        return {"found": False, "message": "No historical data saved yet."}

    recent_dates = all_dates[-days:]  # last N dates, oldest to newest

    history = []
    for d in recent_dates:
        day_records = market_repository.load_history_for_date(d)

        day_matches = [
            r for r in day_records
            if text_matches(crop_name, r.get("commodity", ""))
            and (text_matches(city, r.get("district", "")) or text_matches(city, r.get("market", "")))
        ]

        if day_matches:
            avg_price = sum(r.get("modal_price", 0) for r in day_matches) / len(day_matches)
            history.append({
                "date": d,
                "average_modal_price": round(avg_price, 2),
                "records_count": len(day_matches)
            })

    if not history:
        return {
            "found": False,
            "message": f"No historical '{crop_name}' price data found for '{city}' in the last {days} days."
        }

    return {
        "found": True,
        "crop": crop_name,
        "city": city,
        "days_requested": days,
        "days_with_data": len(history),
        "history": history
    }

import os
import matplotlib
matplotlib.use("Agg")  # no GUI needed, just save to file
import matplotlib.pyplot as plt


GRAPH_FOLDER = os.path.join("app", "static", "graphs")


GRAPH_FOLDER = os.path.join("app", "static", "graphs")


def generate_price_trend_graph(crop_name, city, days=7):
    data = get_historical_prices(crop_name, city, days)

    if not data.get("found"):
        return data

    history = data["history"]
    dates = [point["date"] for point in history]
    prices = [point["average_modal_price"] for point in history]

    plt.figure(figsize=(8, 4))
    plt.plot(dates, prices, marker="o", color="#2e7d32")
    plt.title(f"{crop_name.title()} Price Trend - {city.title()}")
    plt.xlabel("Date")
    plt.ylabel("Average Modal Price (₹)")
    plt.xticks(rotation=45)
    plt.tight_layout()

    os.makedirs(GRAPH_FOLDER, exist_ok=True)
    filename = f"{crop_name.lower()}_{city.lower()}_trend.png"

    filepath = os.path.join(GRAPH_FOLDER, filename)   # used only to SAVE the file
    plt.savefig(filepath)
    plt.close()

    graph_url = f"/static/graphs/{filename}"           # used to SHOW the file in browser

    return {
        "found": True,
        "crop": crop_name,
        "city": city,
        "graph_url": graph_url,
        "data_points": history
    }

def get_crop_demand_indicator(crop_name, days=7):
    """
    Measures how many markets reported a crop today vs the recent daily average,
    as a simple proxy for demand/activity trend.
    """
    today_records = market_repository.load_latest()
    if not today_records:
        return {"error": "Market data not loaded yet. Please try again in a moment."}

    today_matches = [
        r for r in today_records
        if text_matches(crop_name, r.get("commodity", ""))
    ]
    today_count = len(today_matches)

    all_dates = market_repository.load_history_dates()
    recent_dates = all_dates[-days:] if all_dates else []

    daily_counts = []
    for d in recent_dates:
        day_records = market_repository.load_history_for_date(d)
        count = sum(1 for r in day_records if text_matches(crop_name, r.get("commodity", "")))
        daily_counts.append({"date": d, "markets_reporting": count})

    if daily_counts:
        avg_count = sum(day["markets_reporting"] for day in daily_counts) / len(daily_counts)
    else:
        avg_count = today_count  # no history yet, compare against itself

    if today_count > avg_count * 1.1:
        trend = "rising"
    elif today_count < avg_count * 0.9:
        trend = "falling"
    else:
        trend = "stable"

    states_reporting = sorted(set(r.get("state") for r in today_matches if r.get("state")))

    return {
        "crop": crop_name,
        "markets_reporting_today": today_count,
        "average_markets_last_days": round(avg_count, 1),
        "days_compared": len(daily_counts),
        "trend": trend,
        "states_reporting_today": states_reporting,
        "daily_history": daily_counts
    }

def get_market_insights_dashboard(top_n=5):
    """
    Aggregates today's data into a summary dashboard:
    top crops by market count, price extremes, state coverage.
    """
    records = market_repository.load_latest()
    if not records:
        return {"error": "Market data not loaded yet. Please try again in a moment."}

    # Count how many times each crop appears (its "market coverage" today)
    crop_counts = {}
    for r in records:
        crop = r.get("commodity")
        if crop:
            crop_counts[crop] = crop_counts.get(crop, 0) + 1

    top_crops = sorted(crop_counts.items(), key=lambda item: item[1], reverse=True)[:top_n]
    top_crops_list = [{"crop": crop, "markets_reporting": count} for crop, count in top_crops]

    # Highest and lowest single modal_price seen today, across everything
    priced_records = [r for r in records if r.get("modal_price") is not None]
    highest = max(priced_records, key=lambda r: r["modal_price"], default=None)
    lowest = min(priced_records, key=lambda r: r["modal_price"], default=None)

    # How many distinct states and districts reported data today
    states = set(r.get("state") for r in records if r.get("state"))
    districts = set(r.get("district") for r in records if r.get("district"))

    return {
        "total_records_today": len(records),
        "distinct_crops_today": len(crop_counts),
        "states_reporting": len(states),
        "districts_reporting": len(districts),
        "top_crops_by_market_coverage": top_crops_list,
        "highest_price_today": {
            "commodity": highest.get("commodity"),
            "market": highest.get("market"),
            "district": highest.get("district"),
            "modal_price": highest.get("modal_price")
        } if highest else None,
        "lowest_price_today": {
            "commodity": lowest.get("commodity"),
            "market": lowest.get("market"),
            "district": lowest.get("district"),
            "modal_price": lowest.get("modal_price")
        } if lowest else None
    }

def get_buy_sell_recommendation(crop_name, city, days=7):
    """
    Compares today's average price for a crop in a city against its recent
    historical average, and gives a simple rule-based buy/sell signal.
    """
    today_data = get_market_prices(crop_name, city)

    if not today_data.get("found"):
        result = {"found": False, "message": today_data.get("message")}
        if "available_crops_nearby" in today_data:
            result["available_crops_nearby"] = today_data["available_crops_nearby"]
        return result
    today_records = today_data["records"]
    today_avg = sum(r.get("modal_price", 0) for r in today_records) / len(today_records)

    history_data = get_historical_prices(crop_name, city, days)

    if not history_data.get("found") or history_data.get("days_with_data", 0) < 2:
        return {
            "found": True,
            "crop": crop_name,
            "city": city,
            "today_average_price": round(today_avg, 2),
            "recommendation": "hold",
            "reason": "Not enough historical data yet to compare confidently. Defaulting to 'hold'."
        }

    history_points = history_data["history"]
    recent_avg = sum(point["average_modal_price"] for point in history_points) / len(history_points)

    percent_change = ((today_avg - recent_avg) / recent_avg) * 100 if recent_avg else 0

    if percent_change >= 5:
        recommendation = "sell"
        reason = f"Today's price is {round(percent_change, 1)}% above the recent {days}-day average — a favorable time to sell."
    elif percent_change <= -5:
        recommendation = "buy"
        reason = f"Today's price is {round(abs(percent_change), 1)}% below the recent {days}-day average — a favorable time to buy."
    else:
        recommendation = "hold"
        reason = f"Today's price is close to the recent {days}-day average ({round(percent_change, 1)}% difference) — no strong signal either way."

    return {
        "found": True,
        "crop": crop_name,
        "city": city,
        "today_average_price": round(today_avg, 2),
        "recent_average_price": round(recent_avg, 2),
        "percent_change": round(percent_change, 1),
        "recommendation": recommendation,
        "reason": reason
    }

import numpy as np


def predict_next_price(crop_name, city, days=14):
    """
    Fits a simple linear regression line to recent daily average prices
    and predicts tomorrow's price.
    """
    history_data = get_historical_prices(crop_name, city, days)

    if not history_data.get("found"):
        return history_data  # pass through the same "not found" message

    history_points = history_data["history"]

    if len(history_points) < 3:
        return {
            "found": False,
            "message": f"Need at least 3 days of history to predict a trend — only {len(history_points)} available so far."
        }

    # x = day index (0, 1, 2, ...), y = average price that day
    x = np.array(range(len(history_points)))
    y = np.array([point["average_modal_price"] for point in history_points])

    # Fit a straight line: y = slope * x + intercept
    slope, intercept = np.polyfit(x, y, 1)

    next_day_index = len(history_points)
    predicted_price = slope * next_day_index + intercept

    if slope > 0.5:
        direction = "upward"
    elif slope < -0.5:
        direction = "downward"
    else:
        direction = "flat"

    return {
        "found": True,
        "crop": crop_name,
        "city": city,
        "days_used": len(history_points),
        "trend_direction": direction,
        "predicted_next_day_price": round(float(predicted_price), 2),
        "last_known_price": history_points[-1]["average_modal_price"],
        "history_used": history_points
    }
import pandas as pd
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


REPORT_FOLDER = os.path.join("app", "static", "reports")


def export_price_report(crop_name, city, file_format="excel"):
    """
    Exports today's matching price records for a crop+city as an Excel or PDF file.
    Returns the file path, or an error dict if there's nothing to export.
    """
    data = get_market_prices(crop_name, city)

    if not data.get("found"):
        return data  # pass through the same "not found" message

    records = data["records"]
    os.makedirs(REPORT_FOLDER, exist_ok=True)

    safe_name = f"{crop_name.lower()}_{city.lower()}_report".replace(" ", "_")

    if file_format == "excel":
        filepath = os.path.join(REPORT_FOLDER, f"{safe_name}.xlsx")
        df = pd.DataFrame(records)
        df.to_excel(filepath, index=False)

    elif file_format == "pdf":
        filepath = os.path.join(REPORT_FOLDER, f"{safe_name}.pdf")
        _write_pdf_report(filepath, crop_name, city, records)

    else:
        return {"error": f"Unsupported format '{file_format}'. Use 'excel' or 'pdf'."}

    return {
        "found": True,
        "crop": crop_name,
        "city": city,
        "format": file_format,
        "file_path": filepath.replace("\\", "/"),
        "records_included": len(records)
    }


def _write_pdf_report(filepath, crop_name, city, records):
    c = canvas.Canvas(filepath, pagesize=A4)
    width, height = A4

    y = height - 50
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y, f"Market Price Report: {crop_name.title()} in {city.title()}")
    y -= 30

    c.setFont("Helvetica-Bold", 9)
    headers = ["Market", "District", "Variety", "Min", "Max", "Modal"]
    x_positions = [50, 160, 260, 340, 400, 460]
    for header, x in zip(headers, x_positions):
        c.drawString(x, y, header)
    y -= 15

    c.setFont("Helvetica", 8)
    for r in records:
        if y < 50:
            c.showPage()
            y = height - 50
            c.setFont("Helvetica", 8)

        row = [
            str(r.get("market", ""))[:18],
            str(r.get("district", ""))[:14],
            str(r.get("variety", ""))[:10],
            str(r.get("min_price", "")),
            str(r.get("max_price", "")),
            str(r.get("modal_price", "")),
        ]
        for value, x in zip(row, x_positions):
            c.drawString(x, y, value)
        y -= 14

    c.save()

def get_full_market_report(crop_name, city, days=7):
    """
    Runs crop_name + city through every market feature at once,
    and returns one combined report. Each section fails independently
    so one broken piece doesn't take down the whole report.
    """
    report = {"crop": crop_name, "city": city}

    try:
        report["current_price"] = get_market_prices(crop_name, city)
    except Exception as e:
        report["current_price"] = {"error": str(e)}

    try:
        report["nearby_comparison"] = get_nearby_market_prices(crop_name, city)
    except Exception as e:
        report["nearby_comparison"] = {"error": str(e)}

    try:
        report["price_history"] = get_historical_prices(crop_name, city, days)
    except Exception as e:
        report["price_history"] = {"error": str(e)}

    try:
        report["price_trend_graph"] = generate_price_trend_graph(crop_name, city, days)
    except Exception as e:
        report["price_trend_graph"] = {"error": str(e)}

    try:
        report["demand_indicator"] = get_crop_demand_indicator(crop_name, days)
    except Exception as e:
        report["demand_indicator"] = {"error": str(e)}

    try:
        report["buy_sell_recommendation"] = get_buy_sell_recommendation(crop_name, city, days)
    except Exception as e:
        report["buy_sell_recommendation"] = {"error": str(e)}

    try:
        report["price_prediction"] = predict_next_price(crop_name, city, days)
    except Exception as e:
        report["price_prediction"] = {"error": str(e)}

    try:
        report["market_dashboard"] = get_market_insights_dashboard()
    except Exception as e:
        report["market_dashboard"] = {"error": str(e)}

    return report    