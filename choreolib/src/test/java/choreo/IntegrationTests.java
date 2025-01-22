package choreo;

import static org.junit.jupiter.api.Assertions.fail;

import java.io.File;
import java.io.IOException;

import org.junit.jupiter.api.Test;

import choreo.Choreo;
import choreo.trajectory.TrajectoryTestHelper;
import edu.wpi.first.wpilibj.Filesystem;

public class IntegrationTests {
    @Test
    void readDeployDirectory() throws IOException {
        var swerveString = TrajectoryTestHelper.getResourceFileAsString("swerve.traj");
        Choreo.loadTrajectoryString(swerveString);
    }
}
