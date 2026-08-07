from pydantic import BaseModel

class FertilizerInput(BaseModel):

    soil_type: str
    crop_type: str

    nitrogen: int
    potassium: int
    phosphorous: int

    moisture: int

    city: str