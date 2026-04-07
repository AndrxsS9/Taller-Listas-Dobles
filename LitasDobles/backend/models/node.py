from typing import Any, Optional


class Node:
    def __init__(self, data: Any) -> None:
        self.data: Any = data
        self.prev: Optional["Node"] = None
        self.next: Optional["Node"] = None

    def __repr__(self) -> str:
        return f"Node(data={self.data!r})"
