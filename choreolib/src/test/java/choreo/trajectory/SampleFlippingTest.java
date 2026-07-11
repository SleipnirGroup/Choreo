// Copyright (c) Choreo contributors

package choreo.trajectory;

import static org.junit.jupiter.api.Assertions.assertEquals;

import choreo.util.ChoreoAllianceFlipUtil;
import choreo.util.ChoreoAllianceFlipUtil.Flipper;
import org.junit.jupiter.api.Test;

public class SampleFlippingTest {
  private static final double FIELD_LENGTH_2026 = 16.541;
  private static final double FIELD_WIDTH_2026 = 8.0692;

  @Test
  void testZeroSwerveSample() {
    SwerveSample sample =
        new SwerveSample(
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, new double[] {0, 0, 0, 0}, new double[] {0, 0, 0, 0});
    SwerveSample mirrored2026 =
        new SwerveSample(
            0,
            FIELD_LENGTH_2026 - 0,
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
    SwerveSample rotated2026 =
        new SwerveSample(
            0,
            FIELD_LENGTH_2026,
            FIELD_WIDTH_2026,
            Math.PI,
            0,
            0,
            0,
            0,
            0,
            0,
            new double[] {-0.0, -0.0, -0.0, -0.0},
            new double[] {-0.0, -0.0, -0.0, -0.0});
    ChoreoAllianceFlipUtil.setFlipper(Flipper.mirroredX(FIELD_LENGTH_2026, FIELD_WIDTH_2026));
    assertEquals(sample.mirrorX(), mirrored2026);
    ChoreoAllianceFlipUtil.setFlipper(Flipper.rotatedAround(FIELD_LENGTH_2026, FIELD_WIDTH_2026));
    assertEquals(sample.flipped(), rotated2026);
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
    SwerveSample mirrored2026 =
        new SwerveSample(
            0.0,
            FIELD_LENGTH_2026 - 1.0,
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
    SwerveSample rotated2026 =
        new SwerveSample(
            0.0,
            FIELD_LENGTH_2026 - 1.0,
            FIELD_WIDTH_2026 - 2.0,
            Math.PI + 3.0,
            -4.0,
            -5.0,
            6.0,
            -7.0,
            -8.0,
            9.0,
            new double[] {-10.0, -11.0, -12.0, -13.0},
            new double[] {-14.0, -15.0, -16.0, -17.0});
    ChoreoAllianceFlipUtil.setFlipper(Flipper.mirroredX(FIELD_LENGTH_2026, FIELD_WIDTH_2026));
    assertEquals(sample.flipped(), mirrored2026);
    assertEquals(sample.mirrorX(), mirrored2026);
    ChoreoAllianceFlipUtil.setFlipper(Flipper.rotatedAround(FIELD_LENGTH_2026, FIELD_WIDTH_2026));
    assertEquals(sample.flipped(), rotated2026);
    assertEquals(sample.mirrorX(), mirrored2026);
  }

  @Test
  void testZeroDifferentialSample() {
    DifferentialSample sample = new DifferentialSample(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    DifferentialSample mirrored2026 =
        new DifferentialSample(
            0.0, FIELD_LENGTH_2026 - 0, 0.0, Math.PI - 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
    DifferentialSample rotated2026 =
        new DifferentialSample(
            0.0,
            FIELD_LENGTH_2026,
            FIELD_WIDTH_2026,
            Math.PI,
            0.0,
            0.0,
            0.0,
            0.0,
            0.0,
            0.0,
            0.0,
            0.0);
    ChoreoAllianceFlipUtil.setFlipper(Flipper.mirroredX(FIELD_LENGTH_2026, FIELD_WIDTH_2026));
    assertEquals(sample.flipped(), mirrored2026);
    assertEquals(sample.mirrorX(), mirrored2026);
    ChoreoAllianceFlipUtil.setFlipper(Flipper.rotatedAround(FIELD_LENGTH_2026, FIELD_WIDTH_2026));
    assertEquals(sample.flipped(), rotated2026);
    assertEquals(sample.mirrorX(), mirrored2026);
  }

  @Test
  void testDifferentialSample() {
    DifferentialSample sample =
        new DifferentialSample(0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0);
    DifferentialSample mirrored2026 =
        new DifferentialSample(
            0.0,
            FIELD_LENGTH_2026 - 1.0,
            2.0,
            Math.PI - 3.0,
            5.0,
            4.0,
            -6.0,
            8.0,
            7.0,
            -9.0,
            11.0,
            10.0);
    DifferentialSample rotated2026 =
        new DifferentialSample(
            0.0,
            FIELD_LENGTH_2026 - 1.0,
            FIELD_WIDTH_2026 - 2.0,
            Math.PI + 3.0,
            4.0,
            5.0,
            6.0,
            7.0,
            8.0,
            9.0,
            10.0,
            11.0);
    ChoreoAllianceFlipUtil.setFlipper(Flipper.mirroredX(FIELD_LENGTH_2026, FIELD_WIDTH_2026));
    assertEquals(sample.flipped(), mirrored2026);
    assertEquals(sample.mirrorX(), mirrored2026);
    ChoreoAllianceFlipUtil.setFlipper(Flipper.rotatedAround(FIELD_LENGTH_2026, FIELD_WIDTH_2026));
    assertEquals(sample.flipped(), rotated2026);
    assertEquals(sample.mirrorX(), mirrored2026);
  }

  @Test
  void testBothMirrorEqualsRotation() {
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
    ChoreoAllianceFlipUtil.setFlipper(Flipper.FRC_CURRENT);
    SwerveSample rotated = sample.mirrorX().mirrorY();
    assertEquals(rotated.t, 0.0);
    assertEquals(rotated.x, FIELD_LENGTH_2026 - 1.0);
    assertEquals(rotated.y, FIELD_WIDTH_2026 - 2.0);
    assertEquals(rotated.heading, -(-3.0 + Math.PI));
    assertEquals(rotated.vx, -4.0);
    assertEquals(rotated.vy, -5.0);
    assertEquals(rotated.omega, 6.0);
    assertEquals(rotated.ax, -7.0);
    assertEquals(rotated.ay, -8.0);
    assertEquals(rotated.alpha, 9.0);
  }

  @Test
  void testMirrorIsInverse() {
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
    DifferentialSample differentialSample =
        new DifferentialSample(
            0.0,
            FIELD_LENGTH_2026 - 1.0,
            2.0,
            Math.PI - 3.0,
            5.0,
            4.0,
            -6.0,
            8.0,
            7.0,
            -9.0,
            11.0,
            10.0);
    ChoreoAllianceFlipUtil.setFlipper(Flipper.mirroredX(FIELD_LENGTH_2026, FIELD_WIDTH_2026));
    assertEquals(sample.mirrorX().mirrorX(), sample);
    assertEquals(sample.mirrorY().mirrorY(), sample);

    assertEquals(differentialSample.mirrorX().mirrorX(), differentialSample);
    assertEquals(differentialSample.mirrorY().mirrorY(), differentialSample);
  }
}
