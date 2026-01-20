from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Any

from .schemas import SimulationRequest
from .simulation import run_simulation, default_params

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
        return run_simulation(payload)
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/")
def root() -> Any:
    return {"message": "Thermal Simulation API. See /api/health"}


# To run: uvicorn main:app --reload --port 8000
