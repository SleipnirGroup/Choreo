package frc.robot.subsystems.drive;

import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
import frc.robot.Constants;

import java.util.function.Supplier;

public class Gyro {

    public double yawRads = 0.0;
    public double yawVelRadsPerSec = 0.0;

    private final Supplier<ChassisSpeeds> chassisSpeedSupplier;

    public Gyro(Supplier<ChassisSpeeds> chassisSpeedSupplier) {
        this.chassisSpeedSupplier = chassisSpeedSupplier;
    }

    public double getYawRads() {
        return this.yawRads;
    }

    public void setYawRads(double yawRads) {
        this.yawRads = yawRads;
    }

    public void periodic() {
        var oldYaw = this.yawRads;
        this.yawRads += chassisSpeedSupplier.get().omegaRadiansPerSecond * Constants.PERIODIC_TIME;
        this.yawVelRadsPerSec = (this.yawRads - oldYaw) / Constants.PERIODIC_TIME;

        SmartDashboard.putNumber("Swerve/Gyro/Yaw", this.yawRads);
    }
}
