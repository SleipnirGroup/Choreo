package frc.robot.subsystems.drive;

import edu.wpi.first.math.estimator.SwerveDrivePoseEstimator;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.geometry.Translation2d;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.math.kinematics.SwerveDriveKinematics;
import edu.wpi.first.math.kinematics.SwerveModulePosition;
import edu.wpi.first.math.kinematics.SwerveModuleState;
import edu.wpi.first.math.util.Units;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj2.command.SubsystemBase;
import frc.robot.Constants;
import frc.robot.Constants.kFieldConstants;
import frc.robot.Constants.kSwerve;

/**
 * This is the subsystem for our swerve drivetrain.
 * The Swerve subsystem is composed of 5 components, 4 SwerveModules and 1 Gyro.
 * The SwerveModules are the physical wheels and the Gyro is the sensor that
 * measures the robot's rotation.
 * The Swerve subsystem is responsible for controlling the SwerveModules and
 * reading the Gyro.
 * 
 * The Swerve subsystem is also responsible for updating the robot's pose and
 * submitting data to the GlobalState.
 * 
 * {@link https://docs.wpilib.org/en/stable/docs/software/basic-programming/coordinate-system.html}
 * 
 * The coordinate system used in this code is the field coordinate system.
 */
public class Swerve extends SubsystemBase {
  private final Gyro gyro;
  private final SwerveModule[] swerveMods;
  private final SwerveVisualizer visualizer;
  private final SwerveDrivePoseEstimator poseEstimator;

  public Swerve() {
    swerveMods = new SwerveModule[] {
        new SwerveModule(0),
        new SwerveModule(1),
        new SwerveModule(2),
        new SwerveModule(3)
    };
    gyro = new Gyro(this::getChassisSpeed);

    poseEstimator = new SwerveDrivePoseEstimator(
        kSwerve.SWERVE_KINEMATICS,
        getYawWrappedRot(),
        getModulePositions(),
        new Pose2d(
            new Translation2d(
                kFieldConstants.FIELD_LENGTH / 2.0,
                kFieldConstants.FIELD_WIDTH / 2.0),
            new Rotation2d()));

    visualizer = new SwerveVisualizer(this, swerveMods);
  }

  public void drive(ChassisSpeeds speeds, boolean isOpenLoop) {
    setModuleStates(
        kSwerve.SWERVE_KINEMATICS.toSwerveModuleStates(speeds),
        isOpenLoop);
  }

  /**
   * Offsets the gyro to define the current yaw as the supplied value
   * 
   * @param rot A {@link Rotation2d} representing the desired yaw
   */
  public void setYaw(Rotation2d rot) {
    gyro.setYawRads(rot.getRadians());
  }

  /**
   * @return The gyro yaw value in degrees, wrapped to 0-360, as a Rotation2d
   */
  public Rotation2d getYawWrappedRot() {
    return Rotation2d.fromDegrees(
        scope0To360(
            Units.radiansToDegrees(this.getYawRads())));
  }

  /**
   * @return The raw gyro yaw value in radians
   */
  public double getYawRads() {
    return gyro.getYawRads();
  }

  private SwerveModulePosition[] getModulePositions() {
    SwerveModulePosition[] modulePositions = new SwerveModulePosition[4];
    for (SwerveModule module : swerveMods) {
      modulePositions[module.getModuleNumber()] = module.getCurrentPosition();
    }
    return modulePositions;
  }

  public void setModuleStates(SwerveModuleState[] desiredStates, boolean isOpenLoop) {
    SwerveDriveKinematics.desaturateWheelSpeeds(desiredStates, Constants.kSwerve.MAX_DRIVE_VELOCITY);

    for (SwerveModule module : swerveMods) {
      module.setDesiredState(desiredStates[module.getModuleNumber()], isOpenLoop);
    }
  }

  public SwerveModuleState[] getModuleStates() {
    SwerveModuleState[] states = new SwerveModuleState[4];
    for (SwerveModule module : swerveMods) {
      states[module.getModuleNumber()] = module.getCurrentState();
    }
    return states;
  }

  public ChassisSpeeds getChassisSpeed() {
    return kSwerve.SWERVE_KINEMATICS.toChassisSpeeds(getModuleStates());
  }

  public Pose2d getPose() {
    return poseEstimator.getEstimatedPosition();
  }

  public void resetOdometry(Pose2d pose) {
    setYaw(pose.getRotation());
    poseEstimator.resetPosition(pose.getRotation(), getModulePositions(), pose);
  }

  public static double scope0To360(double angle) {
    if (angle < 0) {
      angle = 360 - (Math.abs(angle) % 360);
    } else {
      angle %= 360;
    }
    return angle;
  }

  @Override
  public void periodic() {
    if (DriverStation.isDisabled()) {
      drive(new ChassisSpeeds(), true);
    }

    for (SwerveModule module : swerveMods) {
      module.periodic();
    }

    gyro.periodic();

    visualizer.update(poseEstimator.update(getYawWrappedRot(), getModulePositions()));
  }
}
