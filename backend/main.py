from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Any

from .schemas import SimulationRequest
from .simulation import run_simulation, default_params
from . import Dual_surface_workable_code as sim_new

app = FastAPI(title="Thermal Simulation API", version="0.1.0")

# Allow all origins for now; tighten in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> Any:
    return {"status": "ok"}


@app.get("/api/simulate/default")
def simulate_default() -> Any:
    try:
        return run_simulation(default_params())
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/simulate")
def simulate(req: SimulationRequest) -> Any:
    try:
        payload = req.dict()
        
        # Extract all parameters dynamically
        ambient = float(payload.get("ambient_temp", 25.0))
        sim_time = float(payload.get("simulation_time", 100.0))
        grid_dx = float(payload.get("grid_dx", 1.0))
        grid_dy = float(payload.get("grid_dy", 1.0))
        pcb_k = float(payload.get("pcb_k", 0.9))
        pcb_c = float(payload.get("pcb_c", 1100))
        pcb_rho = float(payload.get("pcb_rho", 1800))
        pcb_thickness = float(payload.get("pcb_thickness", 1.6))
        ambient_h_top = float(payload.get("ambient_h_top", 5.0))
        ambient_h_bottom = float(payload.get("ambient_h_bottom", 5.0))
        margin = float(payload.get("margin", 10))
        include_images = payload.get("include_images", False)
        
        components_data = payload.get("components")
        
        # If components provided, format them for the new engine
        if components_data:
            formatted_components = []
            for comp in components_data:
                # Convert power_params to the expected format
                power_obj = {"type": comp["power_type"]}
                
                if comp["power_type"] == "constant":
                    power_obj["value"] = comp["power_params"].get("power", 1.0)
                elif comp["power_type"] == "square_pulse":
                    power_obj["period"] = comp["power_params"].get("period", 2.0)
                    power_obj["duty"] = comp["power_params"].get("duty", 0.5)
                    power_obj["peak"] = comp["power_params"].get("peak", 3.0)
                elif comp["power_type"] == "sinusoidal":
                    power_obj["amp"] = comp["power_params"].get("amp", 1.5)
                    power_obj["freq"] = comp["power_params"].get("freq", 0.2)
                    power_obj["offset"] = comp["power_params"].get("offset", 0.0)
                elif comp["power_type"] == "parabolic":
                    power_obj["period"] = comp["power_params"].get("period", 6.0)
                    power_obj["max"] = comp["power_params"].get("max_power", 2.0)
                
                formatted_components.append([
                    comp["x"], comp["y"],
                    comp["length"], comp["width"], comp["height"],
                    power_obj,
                    comp["Rth_jc"], comp["Rth_ca"],
                    comp["name"]
                ])
            
            # Set global override
            sim_new.components_input_override.clear()
            sim_new.components_input_override.extend(formatted_components)
        
        # Run new simulation with all parameters (returns complete data structure)
        result = sim_new.run_simulation(
            T_AMBIENT=ambient,
            T_MAX=sim_time,
            GRID_DX=grid_dx,
            GRID_DY=grid_dy,
            PCB_K=pcb_k,
            PCB_C=pcb_c,
            PCB_RHO=pcb_rho,
            PCB_THICKNESS=pcb_thickness,
            AMBIENT_H_TOP=ambient_h_top,
            AMBIENT_H_BOTTOM=ambient_h_bottom,
            margin=margin
        )
        
        # Remove images if not requested to reduce response size
        if not include_images and "images" in result:
            result["images"] = []
        
        # Clear override
        sim_new.components_input_override.clear()
        
        return result
        
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/")
def root() -> Any:
    return {"message": "Thermal Simulation API. See /api/health"}


# To run: uvicorn main:app --reload --port 8000
