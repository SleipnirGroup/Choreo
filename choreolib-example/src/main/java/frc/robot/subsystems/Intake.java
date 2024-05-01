package frc.robot.subsystems;

import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.RobotController;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.SubsystemBase;
import edu.wpi.first.wpilibj2.command.button.Trigger;
import frc.robot.Constants.kControls;

public class Intake extends SubsystemBase{
    private boolean exitBeamBroken = false;
    private double volts = 0.0;

    public Intake() {}

    public Trigger hasNote() {
        return new Trigger(() -> exitBeamBroken);
    }

    public Trigger isIntaking() {
        return new Trigger(() -> volts < 0.0);
    }

    public Command setExitBeam(boolean broken) {
        return Commands.runOnce(() -> this.exitBeamBroken = broken);
    }

    private Command setVoltageOut(double volts, boolean force) {
        return this.run(() -> {
                this.volts = volts;
                if (exitBeamBroken && !force) {
                    this.volts = 0.0;
                }

                if (force || volts > 0.0) {
                    this.exitBeamBroken = false;
                }
        });
    }

    public Command intake() {
        return setVoltageOut(kControls.INTAKE_VOLTS, false)
            .finallyDo(() -> this.volts = 0.0)
            .until(hasNote());
    }

    public Command feed() {
        return setVoltageOut(-RobotController.getBatteryVoltage(), true)
            .finallyDo(() -> this.volts = 0.0)
            .until(hasNote().negate());
    }

    public Command expell() {
        return setVoltageOut(RobotController.getBatteryVoltage(), true)
            .finallyDo(() -> this.volts = 0.0)
            .until(hasNote().negate());
    }

    public Command stop() {
        return setVoltageOut(0.0, true)
            .until(() -> true);
    }

    @Override
    public void periodic() {
        if (DriverStation.isDisabled()) this.volts = 0.0;
    }
}
