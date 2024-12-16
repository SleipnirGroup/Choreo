package choreo.trajectory;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.nio.ByteBuffer;

import org.junit.jupiter.api.Test;

import choreo.util.AllianceFlipUtil;
import choreo.util.AllianceFlipUtil.Flipper;

public class SampleFlippingTest {
    private static final double FIELD_LENGTH_2022 = 16.5811;
    private static final double FIELD_LENGTH_2024 = 16.5811;
    private static final double FIELD_WIDTH_2022 = 8.19912;
    private static final double FIELD_WIDTH_2024 = 8.19912;
    @Test
    void testZeroSwerveSample() {
        SwerveSample sample = 
            new SwerveSample(
            0,
            0, 0, 0,
            0, 0, 0,
            0, 0, 0,
            new double[] {0,0,0,0}, new double[] {0,0,0,0});
        SwerveSample mirrored2024 = new SwerveSample(0,
            FIELD_LENGTH_2024, 0, Math.PI,
             0, 0, 0, 
             0, 0, 0,
             new double[] {-0,-0,-0,-0}, new double[] {0,0,0,0});
        SwerveSample rotated2022 = new SwerveSample(0,
            FIELD_LENGTH_2022, FIELD_WIDTH_2022, Math.PI,
            0, 0, 0, 
            0, 0, 0,
            new double[] {0,0,0,0}, new double[] {0,0,0,0});
        AllianceFlipUtil.setYear(2024);
        ByteBuffer orig = ByteBuffer.allocate(SwerveSample.struct.getSize());
        ByteBuffer mirrored = ByteBuffer.allocate(SwerveSample.struct.getSize());
        SwerveSample.struct.pack(orig, sample.flipped());
        SwerveSample.struct.pack(mirrored, mirrored2024);
        assertEquals(orig, mirrored);
        assertEquals(sample.flipped(), mirrored2024);
        AllianceFlipUtil.setYear(2022);
        assertEquals(sample.flipped(), rotated2022);
    }
}
