package frc.robot.subsystems.drive;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.math.controller.PIDController;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.kinematics.SwerveModulePosition;
import edu.wpi.first.math.kinematics.SwerveModuleState;
import edu.wpi.first.math.system.plant.DCMotor;
import edu.wpi.first.math.util.Units;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.RobotController;
import edu.wpi.first.wpilibj.simulation.FlywheelSim;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
import frc.robot.Constants;
import frc.robot.Constants.kSwerve;
import frc.robot.Constants.kSwerve.kAngleMotor;
import frc.robot.Constants.kSwerve.kDriveMotor;

public class SwerveModule {
  public double driveVeloMPS = 0.0;
  public double targetDriveVeloMPS = 0.0;
  public double drivePositionMeters = 0.0;
  public double driveVolts = 0.0;
  public double driveAmps = 0.0;
  public double angleVeloRadPS = 0.0;
  public double angleAbsoluteRads = 0.0;
  public double targetAngleAbsoluteRads = 0.0;
  public double angleVolts = 0.0;
  public double angleAmps = 0.0;

  private FlywheelSim driveSim = new FlywheelSim(DCMotor.getKrakenX60(1), kSwerve.DRIVE_GEAR_RATIO, 0.025);
  private FlywheelSim angleSim = new FlywheelSim(DCMotor.getFalcon500(1), kSwerve.ANGLE_GEAR_RATIO, 0.004);

  private boolean gotDirectionsLastCycle = false;

  private final PIDController driveFeedback = new PIDController(
      kDriveMotor.kP,
      kDriveMotor.kI,
      kDriveMotor.kD,
      Constants.PERIODIC_TIME);
  private final PIDController angleFeedback = new PIDController(
      kAngleMotor.kP,
      kAngleMotor.kI,
      kAngleMotor.kD,
      Constants.PERIODIC_TIME);

  public final int moduleNumber;

  public SwerveModule(int moduleNumber) {
    this.moduleNumber = moduleNumber;

    angleFeedback.enableContinuousInput(-Math.PI, Math.PI);

    this.angleAbsoluteRads = Units.rotationsToRadians(Math.random());
  }

  private double driveRotationsToMeters(double rotations) {
    return rotations * kSwerve.WHEEL_CIRCUMFERENCE;
  }

  private double driveRadiansToMeters(double radians) {
    return driveRotationsToMeters(radians / (2.0 * Math.PI));
  }

  public void setDesiredState(SwerveModuleState desiredState, boolean isOpenLoop) {
    gotDirectionsLastCycle = true;
    desiredState = SwerveModuleState.optimize(desiredState, getAngle());
    setAngle(desiredState);
    setSpeed(desiredState, isOpenLoop);
  }

  public SwerveModulePosition getCurrentPosition() {
    return new SwerveModulePosition(
        this.drivePositionMeters,
        getAngle());
  }

  public SwerveModuleState getCurrentState() {
    return new SwerveModuleState(
        this.driveVeloMPS,
        getAngle());
  }

  public int getModuleNumber() {
    return this.moduleNumber;
  }

  private Rotation2d getAngle() {
    return new Rotation2d(this.angleAbsoluteRads);
  }

  private void setAngle(SwerveModuleState desiredState) {
    Rotation2d angle = (Math.abs(desiredState.speedMetersPerSecond) <= (kSwerve.MAX_DRIVE_VELOCITY * 0.01))
        ? new Rotation2d(this.angleAbsoluteRads)
        : desiredState.angle;
    this.targetAngleAbsoluteRads = angle.getRadians();

    var angleAppliedVolts = MathUtil.clamp(
        angleFeedback.calculate(getAngle().getRadians(), angle.getRadians()),
        -RobotController.getBatteryVoltage(),
        RobotController.getBatteryVoltage());
    angleSim.setInputVoltage(angleAppliedVolts);

    this.angleVolts = angleAppliedVolts;
    this.angleAbsoluteRads = angle.getRadians();
  }

  private void setSpeed(SwerveModuleState desiredState, boolean isOpenLoop) {
    this.targetDriveVeloMPS = desiredState.speedMetersPerSecond;

    desiredState.speedMetersPerSecond *= Math.cos(angleFeedback.getPositionError());

    double velocityRadPerSec = desiredState.speedMetersPerSecond / (kSwerve.WHEEL_DIAMETER / 2);
    var driveAppliedVolts = MathUtil.clamp(
        driveFeedback.calculate(driveSim.getAngularVelocityRadPerSec(), velocityRadPerSec),
        -1.0 * RobotController.getBatteryVoltage(),
        RobotController.getBatteryVoltage());
    driveSim.setInputVoltage(driveAppliedVolts);

    this.driveVolts = driveAppliedVolts;
  }

  public void periodic() {
    if (DriverStation.isDisabled() || !gotDirectionsLastCycle) {
      this.driveSim.setInputVoltage(0.0);
      this.angleSim.setInputVoltage(0.0);
    }
    gotDirectionsLastCycle = false;

    driveSim.update(Constants.PERIODIC_TIME);
    angleSim.update(Constants.PERIODIC_TIME);

    this.drivePositionMeters += driveRadiansToMeters(
        driveSim.getAngularVelocityRadPerSec() * Constants.PERIODIC_TIME);

    double angleDiffRad = angleSim.getAngularVelocityRadPerSec() * Constants.PERIODIC_TIME;
    this.angleAbsoluteRads += angleDiffRad;

    while (this.angleAbsoluteRads < 0) {
      this.angleAbsoluteRads += 2 * Math.PI;
    }
    while (this.angleAbsoluteRads > 2 * Math.PI) {
      this.angleAbsoluteRads -= 2 * Math.PI;
    }

    this.angleVeloRadPS = angleSim.getAngularVelocityRadPerSec();
    this.angleAmps = angleSim.getCurrentDrawAmps();

    this.driveVeloMPS = driveRotationsToMeters(driveSim.getAngularVelocityRPM() / 60.0);
    this.driveAmps = driveSim.getCurrentDrawAmps();

    String prefix = "Swerve/Module" + this.moduleNumber + "/";
    SmartDashboard.putNumber(prefix + "DriveVelocity", this.driveVeloMPS);
    SmartDashboard.putNumber(prefix + "TargetDriveVelocity", this.targetDriveVeloMPS);
    SmartDashboard.putNumber(prefix + "DrivePosition", this.drivePositionMeters);
    SmartDashboard.putNumber(prefix + "DriveVolts", this.driveVolts);
    SmartDashboard.putNumber(prefix + "DriveAmps", this.driveAmps);
    SmartDashboard.putNumber(prefix + "AngleVelocity", this.angleVeloRadPS);
    SmartDashboard.putNumber(prefix + "AnglePosition", this.angleAbsoluteRads);
    SmartDashboard.putNumber(prefix + "TargetAnglePosition", this.targetAngleAbsoluteRads);
    SmartDashboard.putNumber(prefix + "AngleVolts", this.angleVolts);
    SmartDashboard.putNumber(prefix + "AngleAmps", this.angleAmps);
  }
}
