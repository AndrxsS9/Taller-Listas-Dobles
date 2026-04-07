from typing import List, Optional, Dict, Any
from backend.models.doubly_linked_list import DoublyLinkedList
from backend.models.geological_layer import GeologicalLayer
from backend.models.seismic_event import SeismicEvent


class LayerManager:
    def __init__(self) -> None:
        self._list: DoublyLinkedList = DoublyLinkedList()
        self._initialize_default_layers()

    def _initialize_default_layers(self) -> None:
        default_layers = [
            GeologicalLayer(
                name="Corteza Continental",
                depth_km=0.0,
                thickness_km=35.0,
                rock_type="Granítica",
                density_g_cm3=2.7,
                p_wave_velocity=6.0,
                description="Capa superficial de la Tierra, compuesta principalmente de granito y rocas sedimentarias.",
            ),
            GeologicalLayer(
                name="Corteza Oceánica",
                depth_km=5.0,
                thickness_km=10.0,
                rock_type="Basáltica",
                density_g_cm3=3.0,
                p_wave_velocity=6.7,
                description="Capa delgada y densa bajo los océanos, compuesta principalmente de basalto.",
            ),
            GeologicalLayer(
                name="Manto Superior",
                depth_km=35.0,
                thickness_km=625.0,
                rock_type="Ígnea",
                density_g_cm3=3.4,
                p_wave_velocity=8.1,
                description="Zona de alta temperatura y presión; fuente de magma volcánico.",
            ),
            GeologicalLayer(
                name="Zona de Transición",
                depth_km=410.0,
                thickness_km=250.0,
                rock_type="Metamórfica",
                density_g_cm3=3.8,
                p_wave_velocity=9.5,
                description="Región entre el manto superior e inferior donde la densidad aumenta abruptamente.",
            ),
            GeologicalLayer(
                name="Manto Inferior",
                depth_km=660.0,
                thickness_km=2230.0,
                rock_type="Ígnea",
                density_g_cm3=4.9,
                p_wave_velocity=13.7,
                description="Gran zona de roca sólida a muy alta presión que constituye la mayor parte del manto.",
            ),
            GeologicalLayer(
                name="Núcleo Externo",
                depth_km=2890.0,
                thickness_km=2260.0,
                rock_type="Basáltica",
                density_g_cm3=10.8,
                p_wave_velocity=8.0,
                description="Núcleo líquido de hierro y níquel; genera el campo magnético terrestre.",
            ),
            GeologicalLayer(
                name="Núcleo Interno",
                depth_km=5150.0,
                thickness_km=1220.0,
                rock_type="Ígnea",
                density_g_cm3=13.1,
                p_wave_velocity=11.2,
                description="Sólido corazón metálico de hierro y níquel a temperatura ~5400 °C.",
            ),
        ]
        for layer in default_layers:
            self._list.insert_sorted(layer, key=lambda l: l.depth_km)

    def add_layer(self, layer: GeologicalLayer) -> Dict[str, Any]:
        if self._list.find(lambda l: l.name, layer.name):
            raise ValueError(f"A layer named '{layer.name}' already exists.")
        self._list.insert_sorted(layer, key=lambda l: l.depth_km)
        return {"message": f"Capa '{layer.name}' agregada correctamente.", "layer": layer.to_dict()}

    def remove_layer(self, name: str) -> Dict[str, Any]:
        node = self._list.find(lambda l: l.name, name)
        if not node:
            raise KeyError(f"Layer '{name}' not found.")
        removed = self._list.remove(node)
        return {"message": f"Capa '{name}' eliminada.", "layer": removed.to_dict(include_events=False)}

    def get_layer(self, name: str) -> Optional[GeologicalLayer]:
        node = self._list.find(lambda l: l.name, name)
        return node.data if node else None

    def get_all_layers(self) -> List[Dict[str, Any]]:
        return [layer.to_dict() for layer in self._list.traverse_forward()]

    def get_all_layers_reversed(self) -> List[Dict[str, Any]]:
        return [layer.to_dict() for layer in self._list.traverse_backward()]

    def register_event(self, event: SeismicEvent) -> Dict[str, Any]:
        layer = self.get_layer(event.layer_name)
        if layer is None:
            return {
                "warning": f"Layer '{event.layer_name}' not found; event recorded without a layer.",
                "event": event.to_dict(),
            }
        layer.add_event(event)
        return {
            "message": f"Evento sísmico M{event.magnitude} registrado en '{event.layer_name}'.",
            "event": event.to_dict(),
        }

    def get_all_events(self) -> List[Dict[str, Any]]:
        events = []
        for layer in self._list.traverse_forward():
            events.extend(layer.events)
        events.sort(key=lambda e: e.timestamp, reverse=True)
        return [e.to_dict() for e in events]

    def get_statistics(self) -> Dict[str, Any]:
        all_events = []
        for layer in self._list.traverse_forward():
            all_events.extend(layer.events)
        total = len(all_events)
        max_mag = max((e.magnitude for e in all_events), default=0.0)
        avg_mag = (sum(e.magnitude for e in all_events) / total) if total else 0.0
        return {
            "total_layers": self._list.size,
            "total_events": total,
            "max_magnitude": round(max_mag, 2),
            "avg_magnitude": round(avg_mag, 2),
        }

    def get_list_structure(self) -> List[Dict[str, Any]]:
        result = []
        current = self._list.head
        index = 0
        while current:
            result.append({
                "index": index,
                "name": current.data.name,
                "depth_km": current.data.depth_km,
                "rock_type": current.data.rock_type,
                "color": current.data.color,
                "has_prev": current.prev is not None,
                "has_next": current.next is not None,
                "prev_name": current.prev.data.name if current.prev else None,
                "next_name": current.next.data.name if current.next else None,
                "event_count": current.data.event_count,
            })
            current = current.next
            index += 1
        return result
