import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.colors import PowerNorm
import math

# Suppress plot windows - just print arrays
plt.ioff()
import matplotlib
matplotlib.use('Agg')

# === Simulation Settings ===
T_AMBIENT = 25.0  # user input
T_MAX = 600  # seconds #user input

# === PCB Properties === All user input
GRID_DX = 1.0  # mm
GRID_DY = 1.0  # mm
PCB_K = 0.9       # W/m-K
PCB_K_vert = 0.01 #W/m-K
PCB_C = 1100      # J/kg-K
PCB_RHO = 1800    # kg/m³
PCB_THICKNESS = 1.6  # mm
AMBIENT_H_TOP = 5.0  # convective heat transfer coefficient for top surface
AMBIENT_H_BOTTOM = 5.0  # convective heat transfer coefficient for bottom surface
margin = 10

dx = GRID_DX / 1000
dy = GRID_DY / 1000
cell_area = dx * dy
alpha_pcb = PCB_K / (PCB_RHO * PCB_C)
dt_stab = (1 / (2 * alpha_pcb)) * (dx**2 * dy**2) / (dx**2 + dy**2)
DT = 0.01 * dt_stab  # Strong stability
TIME = np.arange(0, T_MAX, DT)

# === Power Profiles ===


def constant_power(p):
    return lambda t: p


def square_pulse(period, duty, peak):
    return lambda t: peak if (t % period) < duty * period else 0


def sinusoidal_power(amp, freq, offset=0):
    return lambda t: offset + amp * np.sin(2 * np.pi * freq * t)


def periodic_parabolic_power(period, max_power):
    return lambda t: max_power * ((t % period) / (period / 2) - 1) ** 2 if (t % period) > (period / 2) else max_power * (1 - (t % period) / (period / 2)) ** 2

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
        self.C_j = max(1, volume_cm3 * 1.5)
        self.C_c = max(1, volume_cm3 * 2.0)

        self.T_j = T_AMBIENT
        self.T_c = T_AMBIENT
        self.T_j_record, self.T_c_record, self.P_record = [], [], []

    def update(self, t):
        P = self.power_func(t)
        Q_jc = (self.T_j - self.T_c) / self.Rth_jc
        Q_ca = (self.T_c - T_AMBIENT) / self.Rth_ca
        self.T_j += ((P - Q_jc) / self.C_j) * DT
        self.T_c += ((Q_jc - Q_ca) / self.C_c) * DT
        self.T_j_record.append(self.T_j)
        self.T_c_record.append(self.T_c)
        self.P_record.append(P)

# === Demo Validation Function ===


def validation_check(component):
    """Essential validation for demo credibility"""
    print(f"\n=== {component.name} Steady-State Validation ===")
    T_j_final = component.T_j_record[-1]
    P_avg = sum(component.P_record)/len(component.P_record)
    T_expected = T_AMBIENT + P_avg * (component.Rth_jc + component.Rth_ca)
    error_percent = abs(T_j_final - T_expected) / T_expected * 100
    print(
        f"Steady-state: Expected {T_expected:.1f}°C, Got {T_j_final:.1f}°C, Error: {error_percent:.1f}%")
    print(
        f"Thermal capacitances: C_j={component.C_j:.3f} J/K, C_c={component.C_c:.3f} J/K")
    print(
        f"Time constant: tau_jc={component.Rth_jc * component.C_j:.2f} seconds")

    # """Check if thermal time constant matches RC Calculation"""
    # print(f"\n==={component.name} Time constant Validation===")
    # TIME
    # tau_expected = component.Rth_jc*component.C_j
    # tau_measured, _ = extract_time_constant(TIME, component.T_j_record)
    # error_percent = abs(tau_expected - tau_measured) / tau_expected * 100
    # print(f"Time constant: Expected {tau_expected:.1f} s, Got {tau_measured:.1f} s, Error: {error_percent:.1f}%")
    # print(f"Thermal capacitances: C_j={component.C_j:.3f} J/K, C_c={component.C_c:.3f} J/K")

    """Check energy input equals energy stored + energy dissipated"""
    print(f"\n==={component.name}Energy Conservation Check===")
    energy_input = np.trapezoid(component.P_record, TIME)
    # energy stored
    dT_j = component.T_j_record[-1] - component.T_j_record[0]
    dT_c = component.T_c_record[-1] - component.T_c_record[0]
    energy_stored = component.C_j * dT_j + component.C_c * dT_c
    # energy dissipated
    Q_out = [(T_c - T_AMBIENT)/component.Rth_ca for T_c in component.T_c_record]
    energy_dissipated = np.trapezoid(Q_out, TIME)

    energy_balance_error = abs(
        energy_input - energy_stored - energy_dissipated)
    print(
        f"Energy input = {energy_input} J, Energy stored = {energy_stored} J, Energy dissipated = {energy_dissipated} J")
    print(f"Error: {energy_balance_error} J")

    """Check if calculated parameters are physically reasonable"""
    print(f"\n==={component.name} Thermal Capacitance magnitude check===")

    volume_mm3 = component.dim[0] * component.dim[1] * component.dim[2]
    volume_m3 = volume_mm3 * 1e-9

    expected_C_range = (volume_m3 * 1e6 * 1, volume_m3 * 1e6 * 10)  # J/K
    total_C = component.C_j + component.C_c
    print(f"Thermal capacitance for junction: {component.C_j:.4f} J/K")
    print(f"Thermal capacitance for case: {component.C_c:.4f} J/K")
    print(f"Total Thermal capacitance: {total_C:.4f}")
    if expected_C_range[0] <= total_C <= expected_C_range[1]:
        pass
    else:
        print(
            f"Thermal Capacitance of {total_C:.4f} J/K outside typical range")
    if 0.1 <= component.Rth_jc <= 10:
        pass
    else:
        print(f"Rth_jc is outside typical range. {component.Rth_jc:.4f} K/W")
    if 1 <= component.Rth_ca <= 100:
        pass
    else:
        print(f"Rth_ca is outside typical range. {component.Rth_ca:.4f} K/W")


def check_component_overlap(components):
    def get_bounds(comp):
        x, y = comp.pos
        l, w, _ = comp.dim
        return x, x + l, y, y + w  # x_min, x_max, y_min, y_max

    print("\n=== Overlap Check ===")
    overlaps_found = False

    for i in range(len(components)):
        xi0, xi1, yi0, yi1 = get_bounds(components[i])
        for j in range(i + 1, len(components)):
            xj0, xj1, yj0, yj1 = get_bounds(components[j])

            # Check overlap condition: intersecting rectangles
            overlap_x = xi0 < xj1 and xi1 > xj0
            overlap_y = yi0 < yj1 and yi1 > yj0

            if overlap_x and overlap_y:
                overlaps_found = True
                print(
                    f"Overlap: '{components[i].name}' overlaps with '{components[j].name}'")

    if not overlaps_found:
        print("No overlapping components found.")


# === Components ===
components_input = [  # x-coordinate, y-coordinate, length, width, height, constant_power(power), Rth_jc, Rth_ca, "Name"
    [7, 40, 10, 10, 2, square_pulse(2, 0.5, 3), 1.0, 4.0, "Q1_SquarePulse"],
    [30, 40, 5, 5, 1, constant_power(1.5), 0.5, 2.0, "D1_Constant"],
    [35, 10, 8, 8, 3, sinusoidal_power(
        1.5, 0.2, 1.5), 0.8, 3.5, "U1_Sinusoidal"],
    [5, 10, 6, 6, 2, periodic_parabolic_power(
        6, 2.0), 1.2, 3.8, "T1_Parabolic"]
]

power_time_limits = {
    "U1_Sinusoidal": 5,
    "T1_Parabolic": 6,
    "D1_Constant": T_MAX,
    "Q1_SquarePulse": 2
}

components = [ComponentRC(*params) for params in components_input]

# === Grid Setup ===
x_min = min(c.pos[0] for c in components) - margin
x_max = max(c.pos[0] + c.dim[0] for c in components) + margin
y_min = min(c.pos[1] for c in components) - margin
y_max = max(c.pos[1] + c.dim[1] for c in components) + margin
nx = int((x_max - x_min) / GRID_DX)
ny = int((y_max - y_min) / GRID_DY)

T_top = np.full((ny, nx), T_AMBIENT)
T_bottom = np.full((ny, nx), T_AMBIENT)
T_top_new = np.copy(T_top)
T_bottom_new = np.copy(T_bottom)

R_vert = (PCB_THICKNESS / 1000) / (PCB_K_vert * cell_area)
C_surface = PCB_RHO * PCB_C * cell_area * (PCB_THICKNESS / 1000)

component_footprints = []
for comp in components:
    x0, y0 = comp.pos
    l, w, _ = comp.dim
    ix0 = int((x0 - x_min) / GRID_DX)
    iy0 = int((y0 - y_min) / GRID_DY)
    ix1 = int((x0 + l - x_min) / GRID_DX)
    iy1 = int((y0 + w - y_min) / GRID_DY)
    component_footprints.append((ix0, ix1, iy0, iy1))

for t_idx, t in enumerate(TIME):
    for comp in components:
        comp.update(t)

    # === Top Surface Update ===
    T_grid = np.copy(T_top)
    laplacian_top = (
        (T_top[2:, 1:-1] - 2*T_top[1:-1, 1:-1] + T_top[:-2, 1:-1]) / dx**2 +
        (T_top[1:-1, 2:] - 2*T_top[1:-1, 1:-1] + T_top[1:-1, :-2]) / dy**2)

    Q_conv_top = -(AMBIENT_H_TOP / (PCB_RHO*PCB_C*PCB_THICKNESS /
                   1000)) * (T_grid[1:-1, 1:-1] - T_AMBIENT)

    T_top_new[1:-1, 1:-1] = T_top[1:-1, 1:-1] + DT * (
        alpha_pcb * laplacian_top + Q_conv_top
    )

    for idx, (ix0, ix1, iy0, iy1) in enumerate(component_footprints):
        T_top_new[iy0:iy1, ix0:ix1] = components[idx].T_c

    T_top, T_top_new = T_top_new, T_top

    # === Bottom Surface Update ===
    T_bottom_new = np.copy(T_bottom)
    
    for idx, (ix0, ix1, iy0, iy1) in enumerate(component_footprints):
        T_case = components[idx].T_c
        T_b_sub = T_bottom_new[iy0:iy1, ix0:ix1]
        q_vert = (T_case - T_b_sub) / R_vert
        T_bottom_new[iy0:iy1, ix0:ix1] += DT * q_vert / C_surface

    T_grid = np.copy(T_bottom_new)

    laplacian_bottom = (
        (T_bottom[2:, 1:-1] - 2*T_bottom[1:-1, 1:-1] + T_bottom[:-2, 1:-1]) / dx**2 +
        (T_bottom[1:-1, 2:] - 2*T_bottom[1:-1, 1:-1] + T_bottom[1:-1, :-2]) / dy**2)

    Q_conv_bottom = -(AMBIENT_H_BOTTOM / (PCB_RHO*PCB_C *
                      PCB_THICKNESS / 1000)) * (T_grid[1:-1, 1:-1] - T_AMBIENT)

    T_bottom_new[1:-1, 1:-1] = T_bottom_new[1:-1, 1:-1] + DT * (
        alpha_pcb * laplacian_bottom + Q_conv_bottom
    )

    T_bottom = T_bottom_new

    if t_idx % max(1, int(len(TIME) / 10)) == 0:
        print(f"Simulation {100 * t_idx / len(TIME):.0f}% completed")

# === T_avg Calculation ===
T_avg = (AMBIENT_H_TOP * T_top + AMBIENT_H_BOTTOM * T_bottom) / \
    (AMBIENT_H_TOP + AMBIENT_H_BOTTOM)

# === temperature Plotting ===
num_components = len(components)
cols = math.ceil(num_components / 2)
rows = math.ceil(num_components / cols)

fig_temp, axs_temp = plt.subplots(
    rows, cols, figsize=(6 * cols, 4 * rows), sharex=True)
axs_temp = np.atleast_1d(axs_temp).flatten()

for idx, comp in enumerate(components):
    axs_temp[idx].plot(TIME, comp.T_j_record, label="T_junction")
    axs_temp[idx].plot(TIME, comp.T_c_record, '--', label="T_case")
    axs_temp[idx].set_ylabel("Temp (°C)")
    axs_temp[idx].set_title(f"{comp.name} Temperature")
    axs_temp[idx].legend()
    axs_temp[idx].grid(True)

#plt.show()

# === Power Plotting ===
fig_power, axs_power = plt.subplots(
    rows, cols, figsize=(6 * cols, 4 * rows), sharex=False)
axs_power = np.atleast_1d(axs_power).flatten()

for idx, comp in enumerate(components):
    axs_power[idx].plot(TIME, comp.P_record, label="Power")
    axs_power[idx].set_xlabel("Time (s)")
    axs_power[idx].set_ylabel("Power (W)")
    axs_power[idx].set_title(f"{comp.name} Power")
    axs_power[idx].legend()
    axs_power[idx].grid(True)

    if comp.name in power_time_limits:
        axs_power[idx].set_xlim(0, power_time_limits[comp.name])

plt.tight_layout()
#plt.show()

# === Plotting ===


def plot_heatmap_autoscale(T_field, title):
    fig, ax = plt.subplots(figsize=(6, 5))
    im = ax.imshow(
        T_field,
        origin='lower',
        cmap='inferno',
        extent=(x_min, x_max, y_min, y_max),
        norm=PowerNorm(gamma=0.5, vmin=np.min(T_field), vmax=np.max(T_field))
    )
    cbar = plt.colorbar(im, ax=ax, label="Temperature (°C)")
    ax.set_title(
        f"{title}\n(min={np.min(T_field):.2f}°C, max={np.max(T_field):.2f}°C)")
    ax.set_xlabel("x (mm)")
    ax.set_ylabel("y (mm)")
    for comp in components:
        x0, y0 = comp.pos
        l, w, _ = comp.dim
        rect = patches.Rectangle(
            (x0, y0), l, w, linewidth=1.5, edgecolor='cyan', facecolor='none')
        ax.add_patch(rect)
        ax.text(x0 + l/2, y0 + w/2, comp.name, color='white', fontsize=8, ha='center', va='center',
                bbox=dict(facecolor='black', alpha=0.5, boxstyle='round,pad=0.2'))
    plt.tight_layout()
    #plt.show()


# === Final Visualizations ===
plot_heatmap_autoscale(T_top, "Final Top Surface Temperature")
plot_heatmap_autoscale(T_bottom, "Final Bottom Surface Temperature")
plot_heatmap_autoscale(T_avg, "Final Volume-Averaged Temperature")


# === Run Validation After Simulation ===
print("=" * 50)
print("DEMO VALIDATION RESULTS")
print("=" * 50)
for comp in components:
    validation_check(comp)

check_component_overlap(components)

print("Temperature of top surface of PCB is:",T_top)
print("Temperature of bottom surface of PCB is:",T_bottom)
print("Average Temperature of PCB is:",T_avg)

for idx, comp in enumerate(components):
    print(f"Power and time for the component {comp.name} is: {comp.P_record}")

for idx, comp in enumerate(components):
    print(f"Case temp of the component {comp.name} is: {comp.T_c_record}")
    print(f"Junction temp of the component {comp.name} is: {comp.T_j_record}")