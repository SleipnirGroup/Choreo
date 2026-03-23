from math import pi

from choreo.trajectory import DifferentialSample, SwerveSample
from choreo.util import Flipper, field_dimensions, set_flipper

FIELD_LENGTH = field_dimensions.FIELD_LENGTH
FIELD_WIDTH = field_dimensions.FIELD_WIDTH


def test_swerve_sample():
    sample = SwerveSample(
        0.0,
        1.0,
        2.0,
        3.0,
        4.0,
        5.0,
        6.0,
        7.0,
        8.0,
        9.0,
        [10.0, 11.0, 12.0, 13.0],
        [14.0, 15.0, 16.0, 17.0],
    )
    mirrored = SwerveSample(
        0.0,
        FIELD_LENGTH - 1.0,
        2.0,
        pi - 3.0,
        -4.0,
        5.0,
        -6.0,
        -7.0,
        8.0,
        -9.0,
        [-11.0, -10.0, -13.0, -12.0],
        [15.0, 14.0, 17.0, 16.0],
    )
    rotated = SwerveSample(
        0.0,
        FIELD_LENGTH - 1.0,
        FIELD_WIDTH - 2.0,
        pi + 3.0,
        -4.0,
        -5.0,
        6.0,
        -7.0,
        -8.0,
        9.0,
        [-10.0, -11.0, -12.0, -13.0],
        [-14.0, -15.0, -16.0, -17.0],
    )

    set_flipper(Flipper.mirrored_x(FIELD_LENGTH, FIELD_WIDTH))
    assert sample.flipped() == mirrored
    assert sample.mirror_x() == mirrored
    set_flipper(Flipper.rotated_around(FIELD_LENGTH, FIELD_WIDTH))
    assert sample.flipped() == rotated
    assert sample.mirror_x() == mirrored


def test_zero_swerve_sample():
    sample = SwerveSample(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, [0, 0, 0, 0], [0, 0, 0, 0])
    mirrored = SwerveSample(
        0,
        FIELD_LENGTH - 0,
        0,
        pi - 0,
        0,
        0,
        0,
        0,
        0,
        0,
        [-0.0, -0.0, -0.0, -0.0],
        [0, 0, 0, 0],
    )
    rotated = SwerveSample(
        0,
        FIELD_LENGTH,
        FIELD_WIDTH,
        pi,
        0,
        0,
        0,
        0,
        0,
        0,
        [-0.0, -0.0, -0.0, -0.0],
        [-0.0, -0.0, -0.0, -0.0],
    )

    set_flipper(Flipper.mirrored_x(FIELD_LENGTH, FIELD_WIDTH))
    assert sample.flipped() == mirrored
    assert sample.mirror_x() == mirrored
    set_flipper(Flipper.rotated_around(FIELD_LENGTH, FIELD_WIDTH))
    assert sample.flipped() == rotated
    assert sample.mirror_x() == mirrored


def test_differential_sample():
    sample = DifferentialSample(
        0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0
    )
    mirrored = DifferentialSample(
        0.0,
        FIELD_LENGTH - 1.0,
        2.0,
        pi - 3.0,
        5.0,
        4.0,
        -6.0,
        8.0,
        7.0,
        -9.0,
        11.0,
        10.0,
    )
    rotated = DifferentialSample(
        0.0,
        FIELD_LENGTH - 1.0,
        FIELD_WIDTH - 2.0,
        pi + 3.0,
        4.0,
        5.0,
        6.0,
        7.0,
        8.0,
        9.0,
        10.0,
        11.0,
    )

    set_flipper(Flipper.mirrored_x(FIELD_LENGTH, FIELD_WIDTH))
    assert sample.flipped() == mirrored
    assert sample.mirror_x() == mirrored
    set_flipper(Flipper.rotated_around(FIELD_LENGTH, FIELD_WIDTH))
    assert sample.flipped() == rotated
    assert sample.mirror_x() == mirrored


def test_zero_differential_sample():
    sample = DifferentialSample(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
    mirrored = DifferentialSample(
        0.0,
        FIELD_LENGTH - 0,
        0.0,
        pi - 0.0,
        0.0,
        0.0,
        0.0,
        0.0,
        0.0,
        0.0,
        0.0,
        0.0,
    )
    rotated = DifferentialSample(
        0.0,
        FIELD_LENGTH,
        FIELD_WIDTH,
        pi,
        0.0,
        0.0,
        0.0,
        0.0,
        0.0,
        0.0,
        0.0,
        0.0,
    )

    set_flipper(Flipper.mirrored_x(FIELD_LENGTH, FIELD_WIDTH))
    assert sample.flipped() == mirrored
    assert sample.mirror_x() == mirrored
    set_flipper(Flipper.rotated_around(FIELD_LENGTH, FIELD_WIDTH))
    assert sample.flipped() == rotated
    assert sample.mirror_x() == mirrored


def test_both_mirror_equals_rotation():
    sample = SwerveSample(
        0.0,
        1.0,
        2.0,
        3.0,
        4.0,
        5.0,
        6.0,
        7.0,
        8.0,
        9.0,
        [10.0, 11.0, 12.0, 13.0],
        [14.0, 15.0, 16.0, 17.0],
    )

    set_flipper(Flipper.frc_current())
    assert sample.mirror_x().mirror_y() == sample.flipped()


def test_mirror_is_inverse():
    sample = SwerveSample(
        0.0,
        1.0,
        2.0,
        3.0,
        4.0,
        5.0,
        6.0,
        7.0,
        8.0,
        9.0,
        [10.0, 11.0, 12.0, 13.0],
        [14.0, 15.0, 16.0, 17.0],
    )
    differential_sample = DifferentialSample(
        0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0
    )

    set_flipper(Flipper.mirrored_x(FIELD_LENGTH, FIELD_WIDTH))
    assert sample.mirror_x().mirror_x() == sample
    assert sample.mirror_y().mirror_y() == sample
    assert differential_sample.mirror_x().mirror_x() == differential_sample
    assert differential_sample.mirror_y().mirror_y() == differential_sample
