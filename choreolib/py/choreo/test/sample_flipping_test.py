from math import pi

from choreo.trajectory import DifferentialSample, SwerveSample

FIELD_LENGTH_2022 = 16.5811
FIELD_LENGTH_2024 = 16.5811
FIELD_WIDTH_2022 = 8.19912


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
    mirrored2024 = SwerveSample(
        0.0,
        FIELD_LENGTH_2024 - 1.0,
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
    rotated2022 = SwerveSample(
        0.0,
        FIELD_LENGTH_2022 - 1.0,
        FIELD_WIDTH_2022 - 2.0,
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

    assert sample.flipped(2024) == mirrored2024
    assert sample.flipped(2022) == rotated2022


def test_zero_swerve_sample():
    sample = SwerveSample(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, [0, 0, 0, 0], [0, 0, 0, 0])
    mirrored2024 = SwerveSample(
        0,
        FIELD_LENGTH_2024 - 0,
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
    rotated2022 = SwerveSample(
        0,
        FIELD_LENGTH_2022,
        FIELD_WIDTH_2022,
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

    assert sample.flipped(2024) == mirrored2024
    assert sample.flipped(2022) == rotated2022


def test_differential_sample():
    sample = DifferentialSample(0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0)
    mirrored2024 = DifferentialSample(
        0.0, FIELD_LENGTH_2024 - 1.0, 2.0, pi - 3.0, 5.0, 4.0, -6.0, 8.0, 7.0, 10.0, 9.0
    )
    rotated2022 = DifferentialSample(
        0.0,
        FIELD_LENGTH_2022 - 1.0,
        FIELD_WIDTH_2022 - 2.0,
        pi + 3.0,
        4.0,
        5.0,
        6.0,
        7.0,
        8.0,
        9.0,
        10.0,
    )

    assert sample.flipped(2024) == mirrored2024
    assert sample.flipped(2022) == rotated2022


def test_zero_differential_sample():
    sample = DifferentialSample(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
    mirrored2024 = DifferentialSample(
        0.0, FIELD_LENGTH_2024 - 0, 0.0, pi - 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
    )
    rotated2022 = DifferentialSample(
        0.0, FIELD_LENGTH_2022, FIELD_WIDTH_2022, pi, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
    )

    assert sample.flipped(2024) == mirrored2024
    assert sample.flipped(2022) == rotated2022
