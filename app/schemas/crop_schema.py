from pydantic import BaseModel

class CropInput(BaseModel):

    N: int
    P: int
    K: int

    temperature: float

    humidity: float

    ph: float

    rainfall: float

    city: str