from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional
import uuid


WAVE_TYPES = ["P", "S", "Surface-Love", "Surface-Rayleigh"]

RISK_LEVELS = {
    (0.0, 2.0): "Micro",
    (2.0, 4.0): "Menor",
    (4.0, 5.0): "Ligero",
    (5.0, 6.0): "Moderado",
    (6.0, 7.0): "Fuerte",
    (7.0, 8.0): "Mayor",
    (8.0, 10.0): "Gran terremoto",
}


def classify_magnitude(magnitude: float) -> str:
    for (low, high), label in RISK_LEVELS.items():
        if low <= magnitude < high:
            return label
    return "Gran terremoto"


@dataclass
class SeismicEvent:
    magnitude: float
    depth_km: float
    wave_type: str
    latitude: float
    longitude: float
    layer_name: str
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    event_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])

    @property
    def risk_classification(self) -> str:
        return classify_magnitude(self.magnitude)

    @property
    def risk_color(self) -> str:
        m = self.magnitude
        if m < 2.0:
            return "#4ade80"
        elif m < 4.0:
            return "#a3e635"
        elif m < 5.0:
            return "#facc15"
        elif m < 6.0:
            return "#fb923c"
        elif m < 7.0:
            return "#f87171"
        elif m < 8.0:
            return "#dc2626"
        else:
            return "#7c3aed"

    def to_dict(self) -> dict:
        return {
            "event_id": self.event_id,
            "magnitude": round(self.magnitude, 2),
            "depth_km": round(self.depth_km, 2),
            "wave_type": self.wave_type,
            "latitude": round(self.latitude, 4),
            "longitude": round(self.longitude, 4),
            "layer_name": self.layer_name,
            "timestamp": self.timestamp.isoformat(),
            "risk_classification": self.risk_classification,
            "risk_color": self.risk_color,
        }

    def __repr__(self) -> str:
        return (
            f"SeismicEvent(id={self.event_id}, "
            f"M={self.magnitude}, layer={self.layer_name!r})"
        )
