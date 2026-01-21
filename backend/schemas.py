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
    simulation_time: float = Field(100.0, description="Simulation duration in seconds")
    components: Optional[List[ComponentInput]] = None
    
    # PCB material and geometry parameters (all optional with defaults)
    grid_dx: float = Field(1.0, description="Grid spacing X in mm")
    grid_dy: float = Field(1.0, description="Grid spacing Y in mm")
    pcb_k: float = Field(0.9, description="PCB thermal conductivity in W/m-K")
    pcb_c: float = Field(1100, description="PCB specific heat capacity in J/kg-K")
    pcb_rho: float = Field(1800, description="PCB density in kg/m³")
    pcb_thickness: float = Field(1.6, description="PCB thickness in mm")
    ambient_h_top: float = Field(5.0, description="Top surface convective heat transfer in W/m²-K")
    ambient_h_bottom: float = Field(5.0, description="Bottom surface convective heat transfer in W/m²-K")
    margin: float = Field(10, description="Grid margin in mm")
    
    # Performance optimization - skip images generation for faster response
    include_images: bool = Field(False, description="Include base64 heatmap images in response")

    @validator("simulation_time")
    def min_duration(cls, v):
        if v <= 0:
            raise ValueError("simulation_time must be positive")
        return v
    
    @validator("grid_dx", "grid_dy", "pcb_k", "pcb_c", "pcb_rho", "pcb_thickness", "ambient_h_top", "ambient_h_bottom", "margin")
    def positive_pcb_params(cls, v, field):
        if v <= 0:
            raise ValueError(f"{field.name} must be positive")
        return v
