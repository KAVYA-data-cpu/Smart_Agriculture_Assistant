from fastapi import APIRouter

from app.schemas.market_schema import MarketRequest
from app.services.market_service import (
    get_market_prices,
    get_nearby_market_prices,
    get_historical_prices,
    generate_price_trend_graph,
    get_crop_demand_indicator,
    get_market_insights_dashboard,
    get_buy_sell_recommendation,
    predict_next_price,
    export_price_report,
    get_full_market_report
)

router = APIRouter(prefix="/market", tags=["Market"])


@router.post("/price")
def market_price(data: MarketRequest):
    result = get_market_prices(data.crop_name, data.city)
    return result


@router.post("/nearby")
def market_nearby(data: MarketRequest):
    result = get_nearby_market_prices(data.crop_name, data.city)
    return result


@router.post("/history")
def market_history(data: MarketRequest, days: int = 7):
    result = get_historical_prices(data.crop_name, data.city, days)
    return result


@router.post("/trend")
def market_trend(data: MarketRequest, days: int = 7):
    result = generate_price_trend_graph(data.crop_name, data.city, days)
    return result


@router.post("/demand")
def market_demand(data: MarketRequest, days: int = 7):
    result = get_crop_demand_indicator(data.crop_name, days)
    return result

@router.get("/dashboard")
def market_dashboard(top_n: int = 5):
    result = get_market_insights_dashboard(top_n)
    return result

@router.post("/recommendation")
def market_recommendation(data: MarketRequest, days: int = 7):
    result = get_buy_sell_recommendation(data.crop_name, data.city, days)
    return result

@router.post("/predict")
def market_predict(data: MarketRequest, days: int = 14):
    result = predict_next_price(data.crop_name, data.city, days)
    return result

@router.post("/export")
def market_export(data: MarketRequest, file_format: str = "excel"):
    result = export_price_report(data.crop_name, data.city, file_format)
    return result

@router.post("/full-report")
def market_full_report(data: MarketRequest, days: int = 7):
    result = get_full_market_report(data.crop_name, data.city, days)
    return result