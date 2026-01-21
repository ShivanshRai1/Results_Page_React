from flask import Flask, render_template_string, request
import json
import Dual_surface_workable_code as sim
import io
import sys

app = Flask(__name__)

@app.route('/heatsimulation')
def heat_simulation():
    output = io.StringIO()
    sys.stdout = output

    try:
        array_param = request.args.get('array')
        if array_param:
            parsed_array = json.loads(array_param)

            # Update global override list in-place
            sim.components_input_override.clear()
            sim.components_input_override.extend(parsed_array)

        T_AMBIENT = float(request.args.get('T_AMBIENT', 25.0))  # default 25.0
        T_MAX = float(request.args.get('T_MAX', 600))           # default 600
        GRID_DX = float(request.args.get('GRID_DX', 1.0))
        GRID_DY = float(request.args.get('GRID_DY', 1.0))
        PCB_K = float(request.args.get('PCB_K', 0.9))
        PCB_C = float(request.args.get('PCB_C', 1100))
        PCB_RHO = float(request.args.get('PCB_RHO', 1800))
        PCB_THICKNESS = float(request.args.get('PCB_THICKNESS', 1.6))
        AMBIENT_H_TOP = float(request.args.get('AMBIENT_H_TOP', 5.0))
        AMBIENT_H_BOTTOM = float(request.args.get('AMBIENT_H_BOTTOM', 5.0))
        margin = float(request.args.get('margin', 10))

        logs, images = sim.run_simulation(T_AMBIENT=T_AMBIENT, T_MAX=T_MAX)

    except Exception as e:
        logs = [f"Error: {e}"]
        images = {}

    finally:
        sys.stdout = sys.__stdout__

        image_html = "<div style='display: flex; flex-wrap: wrap; gap: 20px;'>"
        # Convert dict to list for indexing
        image_items = list(images.items())
        for i, (label, img_data) in enumerate(image_items):
            # 3 columns for first row (first 3 images), then 2 columns
            if i < 3:
                width = "calc(33.33% - 20px)"  # 3 per row
            else:
                width = "calc(100% - 20px)"     # 1 per row

            image_html += f"""
            <div style='flex: 1 1 {width}; box-sizing: border-box; text-align: center;'>
            <h3>{label}</h3>
            <img src='data:image/png;base64,{img_data}' style='width:100%; border:1px solid #ccc; border-radius:8px;'>
            </div>
            """
        image_html += "</div>"

        return render_template_string("""
        <html>
        <head>
              <title>Thermal Analysis Results</title>
        </head>
        <body style="font-family: Arial; margin: 20px;">
        <center><h1>Results</h1></center>
        {{ images | safe }}
        <hr>
        <h2>Validation Check</h2>
        <pre>{{ logs }}</pre>
        </body>
        </html>
        """, logs="\n".join(logs), images=image_html)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050, debug=True)

