// Copyright (c) Choreo contributors

package choreo.trajectory;

import static org.junit.jupiter.api.Assertions.assertEquals;

import choreo.util.ChoreoAllianceFlipUtil;
import org.junit.jupiter.api.Test;

public class SampleFlippingTest {
  private static final double FIELD_LENGTH_2022 = 16.5811;
  private static final double FIELD_LENGTH_2024 = 16.5811;
  private static final double FIELD_WIDTH_2022 = 8.19912;

  @Test
  void testZeroSwerveSample() {
    SwerveSample sample =
        new SwerveSample(
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, new double[] {0, 0, 0, 0}, new double[] {0, 0, 0, 0});
    SwerveSample mirrored2024 =
        new SwerveSample(
            0,
            FIELD_LENGTH_2024 - 0,
            0,
            Math.PI - 0,
            0,
            0,
            0,
            0,
            0,
            0,
            new double[] {-0.0, -0.0, -0.0, -0.0},
            new double[] {0, 0, 0, 0});
    SwerveSample rotated2022 =
        new SwerveSample(
            0,
            FIELD_LENGTH_2022,
            FIELD_WIDTH_2022,
            Math.PI,
            0,
            0,
            0,
            0,
            0,
            0,
            new double[] {-0.0, -0.0, -0.0, -0.0},
            new double[] {-0.0, -0.0, -0.0, -0.0});
    ChoreoAllianceFlipUtil.setYear(2024);
    assertEquals(sample.flipped(), mirrored2024);
    ChoreoAllianceFlipUtil.setYear(2022);
    assertEquals(sample.flipped(), rotated2022);
  }

  @Test
  void testSwerveSample() {
    SwerveSample sample =
        new SwerveSample(
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
            new double[] {10.0, 11.0, 12.0, 13.0},
            new double[] {14.0, 15.0, 16.0, 17.0});
    SwerveSample mirrored2024 =
        new SwerveSample(
            0.0,
            FIELD_LENGTH_2024 - 1.0,
            2.0,
            Math.PI - 3.0,
            -4.0,
            5.0,
            -6.0,
            -7.0,
            8.0,
            -9.0,
            new double[] {-11.0, -10.0, -13.0, -12.0},
            new double[] {15.0, 14.0, 17.0, 16.0});
    SwerveSample rotated2022 =
        new SwerveSample(
            0.0,
            FIELD_LENGTH_2022 - 1.0,
            FIELD_WIDTH_2022 - 2.0,
            Math.PI + 3.0,
            -4.0,
            -5.0,
            6.0,
            -7.0,
            -8.0,
            9.0,
            new double[] {-10.0, -11.0, -12.0, -13.0},
            new double[] {-14.0, -15.0, -16.0, -17.0});
    ChoreoAllianceFlipUtil.setYear(2024);
    assertEquals(sample.flipped(), mirrored2024);
    ChoreoAllianceFlipUtil.setYear(2022);
    assertEquals(sample.flipped(), rotated2022);
  }

  @Test
  void testZeroDifferentialSample() {
    DifferentialSample sample = new DifferentialSample(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    DifferentialSample mirrored2024 =
        new DifferentialSample(
            0.0, FIELD_LENGTH_2024 - 0, 0.0, Math.PI - 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
    DifferentialSample rotated2022 =
        new DifferentialSample(
            0.0, FIELD_LENGTH_2022, FIELD_WIDTH_2022, Math.PI, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
    ChoreoAllianceFlipUtil.setYear(2024);
    assertEquals(sample.flipped(), mirrored2024);
    ChoreoAllianceFlipUtil.setYear(2022);
    assertEquals(sample.flipped(), rotated2022);
  }

  @Test
  void testDifferentialSample() {
    DifferentialSample sample =
        new DifferentialSample(0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0);
    DifferentialSample mirrored2024 =
        new DifferentialSample(
            0.0, FIELD_LENGTH_2024 - 1.0, 2.0, Math.PI - 3.0, 5.0, 4.0, -6.0, 8.0, 7.0, 10.0, 9.0);
    DifferentialSample rotated2022 =
        new DifferentialSample(
            0.0,
            FIELD_LENGTH_2022 - 1.0,
            FIELD_WIDTH_2022 - 2.0,
            Math.PI + 3.0,
            4.0,
            5.0,
            6.0,
            7.0,
            8.0,
            9.0,
            10.0);
    ChoreoAllianceFlipUtil.setYear(2024);
    assertEquals(sample.flipped(), mirrored2024);
    ChoreoAllianceFlipUtil.setYear(2022);
    assertEquals(sample.flipped(), rotated2022);
  }
}
