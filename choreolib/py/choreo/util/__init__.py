from enum import Enum
import math
from typing import *

from wpimath.geometry import Pose2d

FIELD_LENGTH = 16.5811
FIELD_WIDTH = 8.19912


class FlipperType(Enum):
    MIRRORED = 0
    ROTATE_AROUND = 1


class MirroredFlipper:
    IS_MIRRORED: bool = True

    @staticmethod
    def flip_x(x: float) -> float:
        """
        Flips the X coordinate.

        Parameter ``x``:
            The X coordinate to flip.
        Returns:
            The flipped X coordinate.
        """
        return FIELD_LENGTH - x

    @staticmethod
    def flip_y(y: float) -> float:
        """
        Flips the Y coordinate.

        Parameter ``y``:
            The Y coordinate to flip.
        Returns:
            The flipped Y coordinate.
        """
        return y

    @staticmethod
    def flip_heading(heading: float) -> float:
        """
        Flips the heading.

        Parameter ``heading``:
            The heading to flip.
        Returns:
            The flipped heading.
        """
        return math.pi - heading


class RotateAroundFlipper:
    IS_MIRRORED: bool = False

    @staticmethod
    def flip_x(x: float) -> float:
        """
        Flips the X coordinate.

        Parameter ``x``:
            The X coordinate to flip.
        Returns:
            The flipped X coordinate.
        """
        return FIELD_LENGTH - x

    @staticmethod
    def flip_y(y: float) -> float:
        """
        Flips the Y coordinate.

        Parameter ``y``:
            The Y coordinate to flip.
        Returns:
            The flipped Y coordinate.
        """
        return FIELD_WIDTH - y

    @staticmethod
    def flip_heading(heading: float) -> float:
        """
        Flips the heading.

        Parameter ``heading``:
            The heading to flip.
        Returns:
            The flipped heading.
        """
        return math.pi - heading


FLIPPER_MAP: Dict[int, FlipperType] = {
    2022: FlipperType.ROTATE_AROUND,
    2023: FlipperType.MIRRORED,
    2024: FlipperType.MIRRORED,
}


DEFAULT_YEAR = 2024


def get_flipper_for_year(year: int = DEFAULT_YEAR):
    """
    A utility to standardize flipping of coordinate data based on the current
    alliance across different years.

    If the provided year is invalid, the current year is used instead.

    Parameter ``year``:
        The field year (default: the current year).
    """
    try:
        flipper_type = FLIPPER_MAP[year]
    except KeyError:
        flipper_type = DEFAULT_YEAR

    if flipper_type == FlipperType.ROTATE_AROUND:
        return RotateAroundFlipper()
    elif flipper_type == FlipperType.MIRRORED:
        return MirroredFlipper()
