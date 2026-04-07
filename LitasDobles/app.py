import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from backend.models.geological_layer import GeologicalLayer, ROCK_TYPES
from backend.models.seismic_event import SeismicEvent, WAVE_TYPES
from backend.services.layer_manager import LayerManager
from backend.services.seismic_monitor import SeismicMonitor, SIMULATION_SCENARIOS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

app = Flask(__name__, static_folder=FRONTEND_DIR)
CORS(app)

layer_manager = LayerManager()
seismic_monitor = SeismicMonitor(layer_manager)


@app.route("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(FRONTEND_DIR, path)


@app.route("/api/layers", methods=["GET"])
def get_layers():
    direction = request.args.get("direction", "asc")
    if direction == "desc":
        layers = layer_manager.get_all_layers_reversed()
    else:
        layers = layer_manager.get_all_layers()
    return jsonify({"layers": layers, "total": len(layers)})


@app.route("/api/layers/structure", methods=["GET"])
def get_list_structure():
    return jsonify({"structure": layer_manager.get_list_structure()})


@app.route("/api/layers", methods=["POST"])
def add_layer():
    data = request.get_json(force=True) or {}
    required = ["name", "depth_km", "thickness_km", "rock_type", "density_g_cm3", "p_wave_velocity"]
    missing = [f for f in required if f not in data]
    if missing:
        return jsonify({"error": f"Campos requeridos faltantes: {missing}"}), 400
    if data["rock_type"] not in ROCK_TYPES:
        return jsonify({"error": f"Tipo de roca inválido. Opciones: {ROCK_TYPES}"}), 400
    try:
        layer = GeologicalLayer(
            name=str(data["name"]),
            depth_km=float(data["depth_km"]),
            thickness_km=float(data["thickness_km"]),
            rock_type=str(data["rock_type"]),
            density_g_cm3=float(data["density_g_cm3"]),
            p_wave_velocity=float(data["p_wave_velocity"]),
            description=str(data.get("description", "")),
        )
        result = layer_manager.add_layer(layer)
        return jsonify(result), 201
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 409


@app.route("/api/layers/<string:name>", methods=["DELETE"])
def delete_layer(name: str):
    try:
        result = layer_manager.remove_layer(name)
        return jsonify(result)
    except KeyError as exc:
        return jsonify({"error": str(exc)}), 404


@app.route("/api/layers/<string:name>", methods=["GET"])
def get_layer(name: str):
    layer = layer_manager.get_layer(name)
    if layer is None:
        return jsonify({"error": f"Capa '{name}' no encontrada."}), 404
    return jsonify(layer.to_dict())


@app.route("/api/events", methods=["GET"])
def get_events():
    events = layer_manager.get_all_events()
    return jsonify({"events": events, "total": len(events)})


@app.route("/api/events", methods=["POST"])
def add_event():
    data = request.get_json(force=True) or {}
    required = ["magnitude", "depth_km", "wave_type", "latitude", "longitude", "layer_name"]
    missing = [f for f in required if f not in data]
    if missing:
        return jsonify({"error": f"Campos requeridos faltantes: {missing}"}), 400
    if data["wave_type"] not in WAVE_TYPES:
        return jsonify({"error": f"Tipo de onda inválido. Opciones: {WAVE_TYPES}"}), 400
    try:
        event = SeismicEvent(
            magnitude=float(data["magnitude"]),
            depth_km=float(data["depth_km"]),
            wave_type=str(data["wave_type"]),
            latitude=float(data["latitude"]),
            longitude=float(data["longitude"]),
            layer_name=str(data["layer_name"]),
        )
        result = layer_manager.register_event(event)
        return jsonify(result), 201
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/simulate", methods=["POST"])
def simulate():
    data = request.get_json(force=True) or {}
    scenario_index = int(data.get("scenario_index", 0))
    result = seismic_monitor.simulate(scenario_index)
    return jsonify(result)


@app.route("/api/simulate/scenarios", methods=["GET"])
def get_scenarios():
    return jsonify({"scenarios": SeismicMonitor.get_scenarios()})


@app.route("/api/stats", methods=["GET"])
def get_stats():
    return jsonify(layer_manager.get_statistics())


@app.route("/api/rock-types", methods=["GET"])
def rock_types():
    return jsonify({"rock_types": ROCK_TYPES})


@app.route("/api/wave-types", methods=["GET"])
def wave_types():
    return jsonify({"wave_types": WAVE_TYPES})


if __name__ == "__main__":
    print("=" * 60)
    print("  Monitor Sísmico — Listas Doblemente Enlazadas")
    print("  Servidor corriendo en: http://localhost:5000")
    print("=" * 60)
    app.run(debug=True, port=5000)
