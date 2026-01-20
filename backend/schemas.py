from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, Field, validator

PowerType = Literal["constant", "square_pulse", "sinusoidal", "parabolic"]


class ComponentInput(BaseModel):
    name: str
    x: float
    y: float
    length: float
    width: float
    height: float
    power_type: PowerType = Field(..., description="Type of power profile")
    power_params: Dict[str, float] = Field(default_factory=dict)
    Rth_jc: float
    Rth_ca: float

    @validator("length", "width", "height", "Rth_jc", "Rth_ca")
    def positive_values(cls, v, field):
        if v <= 0:
            raise ValueError(f"{field.name} must be positive")
        return v


class SimulationRequest(BaseModel):
    ambient_temp: float = Field(25.0, description="Ambient temperature in C")
    simulation_time: float = Field(600.0, description="Simulation duration in seconds")
    components: Optional[List[ComponentInput]] = None

    @validator("simulation_time")
    def min_duration(cls, v):
        if v <= 0:
            raise ValueError("simulation_time must be positive")
        return v
