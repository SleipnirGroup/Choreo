package frc.robot.subsystems;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.SubsystemBase;
import edu.wpi.first.wpilibj2.command.button.Trigger;
import frc.robot.Constants;
import frc.robot.Constants.Conv;
import frc.robot.Constants.Motors.KrakenX60Foc;

public class Shooter extends SubsystemBase{
    private static final double ACCEL_TIME = 1.5;
    private static final double MAX_ACCEL_RPM = (KrakenX60Foc.FREE_SPEED / Conv.RPM_TO_RADIANS_PER_SECOND) / ACCEL_TIME; 

    private double targetRpm = 0.0;
    private double rpm = 0.0;

    public Shooter() {}

    public Command spinup(double rpm) {
        return this.run(() -> this.targetRpm = rpm).finallyDo(() -> targetRpm = 0);
    }

    public Trigger reachedTarget() {
        return new Trigger(() -> Math.abs(targetRpm - rpm) < 0.5 && rpm > 0.0);
    }

    @Override
    public void periodic() {
        double maxDiff = MAX_ACCEL_RPM * Constants.PERIODIC_TIME;
        double diff = MathUtil.clamp(
                targetRpm - rpm,
                -maxDiff,
                maxDiff);
        rpm += diff;

        SmartDashboard.putNumber("Shooter/RPM", rpm);
        SmartDashboard.putNumber("Shooter/TargetRPM", targetRpm);
        SmartDashboard.putBoolean("Shooter/AtTarget", Math.abs(targetRpm - rpm) < 0.5  && rpm > 0.0);
    }
}
