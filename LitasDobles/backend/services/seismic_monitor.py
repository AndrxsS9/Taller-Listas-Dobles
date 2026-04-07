import random
from datetime import datetime, timezone
from typing import Dict, Any

from backend.models.seismic_event import SeismicEvent, WAVE_TYPES
from backend.services.layer_manager import LayerManager


SIMULATION_SCENARIOS = [
    {"label": "Sismo Leve",      "min_mag": 1.0, "max_mag": 3.0, "count": 3},
    {"label": "Sismo Moderado",  "min_mag": 3.0, "max_mag": 5.5, "count": 2},
    {"label": "Sismo Fuerte",    "min_mag": 5.5, "max_mag": 7.0, "count": 1},
    {"label": "Terremoto Mayor", "min_mag": 7.0, "max_mag": 9.5, "count": 1},
]

BASE_LAT = -4.0
BASE_LON = -77.0


class SeismicMonitor:
    def __init__(self, layer_manager: LayerManager) -> None:
        self._manager = layer_manager

    def _random_event(self, layer_name: str, min_mag: float, max_mag: float) -> SeismicEvent:
        magnitude = round(random.uniform(min_mag, max_mag), 2)
        layer = self._manager.get_layer(layer_name)
        depth = round(random.uniform(
            layer.depth_km if layer else 0.0,
            (layer.depth_km + layer.thickness_km) if layer else 100.0
        ), 2)
        return SeismicEvent(
            magnitude=magnitude,
            depth_km=depth,
            wave_type=random.choice(WAVE_TYPES),
            latitude=round(BASE_LAT + random.uniform(-3.0, 3.0), 4),
            longitude=round(BASE_LON + random.uniform(-3.0, 3.0), 4),
            layer_name=layer_name,
            timestamp=datetime.now(timezone.utc),
        )

    def simulate(self, scenario_index: int = 0) -> Dict[str, Any]:
        scenario_index = max(0, min(scenario_index, len(SIMULATION_SCENARIOS) - 1))
        scenario = SIMULATION_SCENARIOS[scenario_index]
        layers = self._manager.get_all_layers()
        if not layers:
            return {"error": "No hay capas geológicas disponibles para simular."}
        generated_events = []
        for _ in range(scenario["count"]):
            target_layer = random.choice(layers)["name"]
            event = self._random_event(target_layer, scenario["min_mag"], scenario["max_mag"])
            result = self._manager.register_event(event)
            generated_events.append(result.get("event", {}))
        return {
            "scenario": scenario["label"],
            "events_generated": len(generated_events),
            "events": generated_events,
        }

    def quick_event(self, layer_name: str, magnitude: float) -> Dict[str, Any]:
        event = SeismicEvent(
            magnitude=magnitude,
            depth_km=10.0,
            wave_type=random.choice(WAVE_TYPES),
            latitude=round(BASE_LAT + random.uniform(-1.0, 1.0), 4),
            longitude=round(BASE_LON + random.uniform(-1.0, 1.0), 4),
            layer_name=layer_name,
            timestamp=datetime.now(timezone.utc),
        )
        return self._manager.register_event(event)

    @staticmethod
    def get_scenarios() -> list:
        return [{"index": i, "label": s["label"]} for i, s in enumerate(SIMULATION_SCENARIOS)]
