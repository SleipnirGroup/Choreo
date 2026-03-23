import math

from choreo.util.field_dimensions import FIELD_LENGTH, FIELD_WIDTH


class Flipper:
    """A flipper that applies one of the supported field transforms."""

    def __init__(self, kind: str, field_length: float, field_width: float):
        self.kind = kind
        self.field_length = field_length
        self.field_width = field_width

    @staticmethod
    def mirrored_x(field_length: float, field_width: float) -> "Flipper":
        return Flipper("mirrored_x", field_length, field_width)

    @staticmethod
    def mirrored_y(field_length: float, field_width: float) -> "Flipper":
        return Flipper("mirrored_y", field_length, field_width)

    @staticmethod
    def rotated_around(field_length: float, field_width: float) -> "Flipper":
        return Flipper("rotated_around", field_length, field_width)

    @staticmethod
    def frc_current() -> "Flipper":
        return Flipper.rotated_around(FIELD_LENGTH, FIELD_WIDTH)

    def flip_x(self, x: float) -> float:
        if self.kind == "mirrored_y":
            return x
        return self.field_length - x

    def flip_y(self, y: float) -> float:
        if self.kind == "mirrored_x":
            return y
        return self.field_width - y

    def flip_heading(self, heading: float) -> float:
        if self.kind == "mirrored_y":
            return -heading
        if self.kind == "rotated_around":
            return math.pi + heading
        return math.pi - heading

    def is_mirrored_x(self) -> bool:
        return self.kind == "mirrored_x"

    def is_mirrored_y(self) -> bool:
        return self.kind == "mirrored_y"

    def is_rotated_around(self) -> bool:
        return self.kind == "rotated_around"


active_alliance_flip = Flipper.frc_current()
active_mirror_x = Flipper.mirrored_x(active_alliance_flip.field_length, active_alliance_flip.field_width)
active_mirror_y = Flipper.mirrored_y(active_alliance_flip.field_length, active_alliance_flip.field_width)


def get_flipper() -> Flipper:
    return active_alliance_flip


def get_mirror_x() -> Flipper:
    return active_mirror_x


def get_mirror_y() -> Flipper:
    return active_mirror_y


def set_flipper(flipper: Flipper) -> None:
    global active_alliance_flip, active_mirror_x, active_mirror_y
    active_alliance_flip = flipper
    active_mirror_x = Flipper.mirrored_x(flipper.field_length, flipper.field_width)
    active_mirror_y = Flipper.mirrored_y(flipper.field_length, flipper.field_width)
