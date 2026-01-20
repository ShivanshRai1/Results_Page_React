import numpy as np
from typing import Dict, Any, List

# === Simulation Settings ===
T_AMBIENT_DEFAULT = 25.0
T_MAX_DEFAULT = 600.0
GRID_DX = 1.0  # mm
GRID_DY = 1.0  # mm
PCB_K = 0.9       # W/m-K
PCB_K_VERT = 0.01 # W/m-K
PCB_C = 1100      # J/kg-K
PCB_RHO = 1800    # kg/m³
PCB_THICKNESS = 1.6  # mm
AMBIENT_H_TOP = 5.0  # W/m^2-K
AMBIENT_H_BOTTOM = 5.0  # W/m^2-K
MARGIN = 10

# === Power Profiles ===
def constant_power(p: float):
    return lambda t: p


def square_pulse(period: float, duty: float, peak: float):
    return lambda t: peak if (t % period) < duty * period else 0.0


def sinusoidal_power(amp: float, freq: float, offset: float = 0.0):
    return lambda t: offset + amp * np.sin(2 * np.pi * freq * t)


def periodic_parabolic_power(period: float, max_power: float):
    return (
        lambda t: max_power * ((t % period) / (period / 2) - 1) ** 2
        if (t % period) > (period / 2)
        else max_power * (1 - (t % period) / (period / 2)) ** 2
    )


# === Component RC Model ===
class ComponentRC:
    def __init__(self, x, y, l, w, h, power_func, Rth_jc, Rth_ca, name):
        self.name = name
        self.pos = (x, y)
        self.dim = (l, w, h)
        self.power_func = power_func
        self.Rth_jc = Rth_jc
        self.Rth_ca = Rth_ca

        volume_cm3 = (l * w * h) / 1000
        self.C_j = max(1.0, volume_cm3 * 1.5)
        self.C_c = max(1.0, volume_cm3 * 2.0)

        self.T_j = T_AMBIENT_DEFAULT
        self.T_c = T_AMBIENT_DEFAULT
        self.T_j_record: List[float] = []
        self.T_c_record: List[float] = []
        self.P_record: List[float] = []

    def update(self, t: float, dt: float, ambient: float):
        P = self.power_func(t)
        Q_jc = (self.T_j - self.T_c) / self.Rth_jc
        Q_ca = (self.T_c - ambient) / self.Rth_ca
        self.T_j += ((P - Q_jc) / self.C_j) * dt
        self.T_c += ((Q_jc - Q_ca) / self.C_c) * dt
        self.T_j_record.append(self.T_j)
        self.T_c_record.append(self.T_c)
        self.P_record.append(P)


# === Defaults ===
def default_components():
    return [
        {
            "x": 7, "y": 40, "length": 10, "width": 10, "height": 2,
            "power_type": "square_pulse", "power_params": {"period": 2, "duty": 0.5, "peak": 3},
            "Rth_jc": 1.0, "Rth_ca": 4.0, "name": "Q1_SquarePulse",
        },
        {
            "x": 30, "y": 40, "length": 5, "width": 5, "height": 1,
            "power_type": "constant", "power_params": {"power": 1.5},
            "Rth_jc": 0.5, "Rth_ca": 2.0, "name": "D1_Constant",
        },
        {
            "x": 35, "y": 10, "length": 8, "width": 8, "height": 3,
            "power_type": "sinusoidal", "power_params": {"amp": 1.5, "freq": 0.2, "offset": 1.5},
            "Rth_jc": 0.8, "Rth_ca": 3.5, "name": "U1_Sinusoidal",
        },
        {
            "x": 5, "y": 10, "length": 6, "width": 6, "height": 2,
            "power_type": "parabolic", "power_params": {"period": 6, "max_power": 2.0},
            "Rth_jc": 1.2, "Rth_ca": 3.8, "name": "T1_Parabolic",
        },
    ]


def default_params():
    return {
        "ambient_temp": T_AMBIENT_DEFAULT,
        "simulation_time": T_MAX_DEFAULT,
        "components": default_components(),
    }


# === Helpers ===
def create_power_function(power_type: str, params: Dict[str, float]):
    if power_type == "constant":
        return constant_power(params.get("power", 1.0))
    if power_type == "square_pulse":
        return square_pulse(params.get("period", 2.0), params.get("duty", 0.5), params.get("peak", 3.0))
    if power_type == "sinusoidal":
        return sinusoidal_power(params.get("amp", 1.5), params.get("freq", 0.2), params.get("offset", 0.0))
    if power_type == "parabolic":
        return periodic_parabolic_power(params.get("period", 6.0), params.get("max_power", 2.0))
    return constant_power(1.0)


def run_simulation(payload: Dict[str, Any] | None = None) -> Dict[str, Any]:
    cfg = payload or default_params()

    ambient = float(cfg.get("ambient_temp", T_AMBIENT_DEFAULT))
    t_max = float(cfg.get("simulation_time", T_MAX_DEFAULT))
    components_data = cfg.get("components") or default_components()

    dx = GRID_DX / 1000.0
    dy = GRID_DY / 1000.0
    cell_area = dx * dy
    alpha_pcb = PCB_K / (PCB_RHO * PCB_C)
    dt_stab = (1 / (2 * alpha_pcb)) * (dx ** 2 * dy ** 2) / (dx ** 2 + dy ** 2)
    dt = 0.01 * dt_stab
    time = np.arange(0, t_max, dt)

    # Build components
    components: List[ComponentRC] = []
    for comp_data in components_data:
        power_func = create_power_function(comp_data["power_type"], comp_data.get("power_params", {}))
        comp = ComponentRC(
            comp_data["x"], comp_data["y"],
            comp_data["length"], comp_data["width"], comp_data["height"],
            power_func,
            comp_data["Rth_jc"], comp_data["Rth_ca"],
            comp_data["name"],
        )
        components.append(comp)

    # Grid setup
    x_min = min(c.pos[0] for c in components) - MARGIN
    x_max = max(c.pos[0] + c.dim[0] for c in components) + MARGIN
    y_min = min(c.pos[1] for c in components) - MARGIN
    y_max = max(c.pos[1] + c.dim[1] for c in components) + MARGIN
    nx = int((x_max - x_min) / GRID_DX)
    ny = int((y_max - y_min) / GRID_DY)

    T_top = np.full((ny, nx), ambient)
    T_bottom = np.full((ny, nx), ambient)
    T_top_new = np.copy(T_top)
    T_bottom_new = np.copy(T_bottom)

    R_vert = (PCB_THICKNESS / 1000.0) / (PCB_K_VERT * cell_area)
    C_surface = PCB_RHO * PCB_C * cell_area * (PCB_THICKNESS / 1000.0)

    footprints = []
    for comp in components:
        x0, y0 = comp.pos
        l, w, _ = comp.dim
        ix0 = int((x0 - x_min) / GRID_DX)
        iy0 = int((y0 - y_min) / GRID_DY)
        ix1 = int((x0 + l - x_min) / GRID_DX)
        iy1 = int((y0 + w - y_min) / GRID_DY)
        footprints.append((ix0, ix1, iy0, iy1))

    # Main simulation loop
    for t_idx, t_val in enumerate(time):
        for comp in components:
            comp.update(t_val, dt, ambient)

        # Top surface update
        laplacian_top = (
            (T_top[2:, 1:-1] - 2 * T_top[1:-1, 1:-1] + T_top[:-2, 1:-1]) / dx ** 2
            + (T_top[1:-1, 2:] - 2 * T_top[1:-1, 1:-1] + T_top[1:-1, :-2]) / dy ** 2
        )

        Q_conv_top = -(AMBIENT_H_TOP / (PCB_RHO * PCB_C * PCB_THICKNESS / 1000.0)) * (
            T_top[1:-1, 1:-1] - ambient
        )

        T_top_new[1:-1, 1:-1] = T_top[1:-1, 1:-1] + dt * (alpha_pcb * laplacian_top + Q_conv_top)

        for idx, (ix0, ix1, iy0, iy1) in enumerate(footprints):
            T_top_new[iy0:iy1, ix0:ix1] = components[idx].T_c

        T_top, T_top_new = T_top_new, T_top

        # Bottom surface update
        T_bottom_new = np.copy(T_bottom)

        for idx, (ix0, ix1, iy0, iy1) in enumerate(footprints):
            T_case = components[idx].T_c
            T_b_sub = T_bottom_new[iy0:iy1, ix0:ix1]
            q_vert = (T_case - T_b_sub) / R_vert
            T_bottom_new[iy0:iy1, ix0:ix1] += dt * q_vert / C_surface

        laplacian_bottom = (
            (T_bottom[2:, 1:-1] - 2 * T_bottom[1:-1, 1:-1] + T_bottom[:-2, 1:-1]) / dx ** 2
            + (T_bottom[1:-1, 2:] - 2 * T_bottom[1:-1, 1:-1] + T_bottom[1:-1, :-2]) / dy ** 2
        )

        Q_conv_bottom = -(AMBIENT_H_BOTTOM / (PCB_RHO * PCB_C * PCB_THICKNESS / 1000.0)) * (
            T_bottom_new[1:-1, 1:-1] - ambient
        )

        T_bottom_new[1:-1, 1:-1] = T_bottom_new[1:-1, 1:-1] + dt * (alpha_pcb * laplacian_bottom + Q_conv_bottom)

        T_bottom = T_bottom_new

    T_avg = (AMBIENT_H_TOP * T_top + AMBIENT_H_BOTTOM * T_bottom) / (AMBIENT_H_TOP + AMBIENT_H_BOTTOM)

    # Downsample to keep payload modest
    downsample_factor = max(1, len(time) // 2000)
    indices = range(0, len(time), downsample_factor)

    result_components = []
    for comp in components:
        result_components.append(
            {
                "name": comp.name,
                "position": {"x": comp.pos[0], "y": comp.pos[1]},
                "dimensions": {"l": comp.dim[0], "w": comp.dim[1], "h": comp.dim[2]},
                "temps": [comp.T_j_record[i] for i in indices],
                "cases": [comp.T_c_record[i] for i in indices],
                "power": [comp.P_record[i] for i in indices],
                "thermal": {
                    "Rth_jc": comp.Rth_jc,
                    "Rth_ca": comp.Rth_ca,
                    "C_j": comp.C_j,
                    "C_c": comp.C_c,
                },
            }
        )

    return {
        "grid": {
            "nx": nx,
            "ny": ny,
            "dx": GRID_DX,
            "dy": GRID_DY,
            "x_min": x_min,
            "x_max": x_max,
            "y_min": y_min,
            "y_max": y_max,
        },
        "fields": {
            "top": T_top.tolist(),
            "bottom": T_bottom.tolist(),
            "avg": T_avg.tolist(),
        },
        "time": [float(time[i]) for i in indices],
        "components": result_components,
        "meta": {
            "ambient": ambient,
            "simTime": t_max,
            "dt": dt,
            "totalSteps": len(time),
        },
    }
