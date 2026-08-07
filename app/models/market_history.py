from pydantic import BaseModel
from typing import Optional


class MarketRecord(BaseModel):
    state: str
    district: str
    market: str
    commodity: str
    variety: Optional[str] = None
    grade: Optional[str] = None
    arrival_date: str
    min_price: float
    max_price: float
    modal_price: float