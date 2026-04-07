from dataclasses import dataclass, field
from typing import List
from .seismic_event import SeismicEvent


ROCK_TYPES = [
    "Ígnea",
    "Sedimentaria",
    "Metamórfica",
    "Basáltica",
    "Granítica",
    "Calcárea",
    "Arcillosa",
    "Cuarcita",
]

LAYER_COLORS = {
    "Ígnea":        "#ef4444",
    "Sedimentaria": "#f59e0b",
    "Metamórfica":  "#8b5cf6",
    "Basáltica":    "#374151",
    "Granítica":    "#6b7280",
    "Calcárea":     "#e5e7eb",
    "Arcillosa":    "#92400e",
    "Cuarcita":     "#d1d5db",
}


@dataclass
class GeologicalLayer:
    name: str
    depth_km: float
    thickness_km: float
    rock_type: str
    density_g_cm3: float
    p_wave_velocity: float
    description: str = ""
    events: List[SeismicEvent] = field(default_factory=list)

    @property
    def color(self) -> str:
        return LAYER_COLORS.get(self.rock_type, "#6b7280")

    @property
    def bottom_depth_km(self) -> float:
        return self.depth_km + self.thickness_km

    @property
    def event_count(self) -> int:
        return len(self.events)

    @property
    def max_magnitude(self) -> float:
        if not self.events:
            return 0.0
        return max(e.magnitude for e in self.events)

    def add_event(self, event: SeismicEvent) -> None:
        self.events.append(event)

    def remove_event(self, event_id: str) -> bool:
        before = len(self.events)
        self.events = [e for e in self.events if e.event_id != event_id]
        return len(self.events) < before

    def to_dict(self, include_events: bool = True) -> dict:
        base = {
            "name": self.name,
            "depth_km": round(self.depth_km, 2),
            "thickness_km": round(self.thickness_km, 2),
            "bottom_depth_km": round(self.bottom_depth_km, 2),
            "rock_type": self.rock_type,
            "density_g_cm3": round(self.density_g_cm3, 3),
            "p_wave_velocity": round(self.p_wave_velocity, 2),
            "description": self.description,
            "color": self.color,
            "event_count": self.event_count,
            "max_magnitude": round(self.max_magnitude, 2),
        }
        if include_events:
            base["events"] = [e.to_dict() for e in self.events]
        return base

    def __repr__(self) -> str:
        return (
            f"GeologicalLayer(name={self.name!r}, "
            f"depth={self.depth_km}km, rock={self.rock_type!r})"
        )
