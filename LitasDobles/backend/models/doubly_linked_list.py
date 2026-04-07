from typing import Any, Callable, Generator, List, Optional
from .node import Node


class DoublyLinkedList:
    def __init__(self) -> None:
        self._head: Optional[Node] = None
        self._tail: Optional[Node] = None
        self._size: int = 0

    @property
    def head(self) -> Optional[Node]:
        return self._head

    @property
    def tail(self) -> Optional[Node]:
        return self._tail

    @property
    def size(self) -> int:
        return self._size

    @property
    def is_empty(self) -> bool:
        return self._size == 0

    def append(self, data: Any) -> Node:
        new_node = Node(data)
        if self._head is None:
            self._head = new_node
            self._tail = new_node
        else:
            new_node.prev = self._tail
            self._tail.next = new_node
            self._tail = new_node
        self._size += 1
        return new_node

    def prepend(self, data: Any) -> Node:
        new_node = Node(data)
        if self._head is None:
            self._head = new_node
            self._tail = new_node
        else:
            new_node.next = self._head
            self._head.prev = new_node
            self._head = new_node
        self._size += 1
        return new_node

    def insert_sorted(self, data: Any, key: Callable[[Any], Any]) -> Node:
        new_node = Node(data)
        if self._head is None or key(data) <= key(self._head.data):
            new_node.next = self._head
            if self._head:
                self._head.prev = new_node
            self._head = new_node
            if self._tail is None:
                self._tail = new_node
            self._size += 1
            return new_node
        current = self._head
        while current.next and key(current.next.data) < key(data):
            current = current.next
        new_node.next = current.next
        new_node.prev = current
        if current.next:
            current.next.prev = new_node
        else:
            self._tail = new_node
        current.next = new_node
        self._size += 1
        return new_node

    def remove(self, node: Node) -> Any:
        if node.prev:
            node.prev.next = node.next
        else:
            self._head = node.next
        if node.next:
            node.next.prev = node.prev
        else:
            self._tail = node.prev
        node.prev = None
        node.next = None
        self._size -= 1
        return node.data

    def remove_by_key(self, key_func: Callable[[Any], Any], key_value: Any) -> Optional[Any]:
        node = self.find(key_func, key_value)
        if node:
            return self.remove(node)
        return None

    def find(self, key_func: Callable[[Any], Any], key_value: Any) -> Optional[Node]:
        current = self._head
        while current:
            if key_func(current.data) == key_value:
                return current
            current = current.next
        return None

    def traverse_forward(self) -> Generator[Any, None, None]:
        current = self._head
        while current:
            yield current.data
            current = current.next

    def traverse_backward(self) -> Generator[Any, None, None]:
        current = self._tail
        while current:
            yield current.data
            current = current.prev

    def to_list(self) -> List[Any]:
        return list(self.traverse_forward())

    def to_list_reversed(self) -> List[Any]:
        return list(self.traverse_backward())

    def clear(self) -> None:
        self._head = None
        self._tail = None
        self._size = 0

    def __len__(self) -> int:
        return self._size

    def __repr__(self) -> str:
        items = " ⇄ ".join(str(d) for d in self.traverse_forward())
        return f"DoublyLinkedList([{items}])"
