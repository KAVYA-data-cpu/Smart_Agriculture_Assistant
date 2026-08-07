from pydantic import BaseModel


class MarketRequest(BaseModel):

    crop_name: str
    city : str

