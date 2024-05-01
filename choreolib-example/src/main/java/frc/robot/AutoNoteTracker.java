package frc.robot;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.BooleanSupplier;
import java.util.function.Consumer;
import java.util.function.Supplier;

import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Transform2d;
import edu.wpi.first.math.geometry.Translation2d;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.FunctionalCommand;
import edu.wpi.first.wpilibj2.command.button.RobotModeTriggers;
import edu.wpi.first.wpilibj2.command.button.Trigger;
import frc.robot.Constants.kFieldConstants;

public class AutoNoteTracker {
    private static final Translation2d[] NOTES = {
        new Translation2d(kFieldConstants.FIELD_LENGTH * 0.175, 7.0),
        new Translation2d(kFieldConstants.FIELD_LENGTH * 0.175, 5.54),
        new Translation2d(kFieldConstants.FIELD_LENGTH * 0.175, 4.1),
        new Translation2d(kFieldConstants.FIELD_LENGTH * 0.825, 7.0),
        new Translation2d(kFieldConstants.FIELD_LENGTH * 0.825, 5.54),
        new Translation2d(kFieldConstants.FIELD_LENGTH * 0.825, 4.1),
        new Translation2d(kFieldConstants.FIELD_LENGTH / 2.0, 7.44),
        new Translation2d(kFieldConstants.FIELD_LENGTH / 2.0, 5.77),
        new Translation2d(kFieldConstants.FIELD_LENGTH / 2.0, 4.11),
        new Translation2d(kFieldConstants.FIELD_LENGTH / 2.0, 2.42),
        new Translation2d(kFieldConstants.FIELD_LENGTH / 2.0, 0.76),
    };

    private static final double NOTE_RADIUS = 7.0;

    // private static final class AutoNotes {

    //     private static final Transform2d intakeTransform = new Transform2d(
    //         new Translation2d(
    //             kRobotGeometry.FRAME_WIDTH / 2.0
    //             + kRobotGeometry.BUMPER_THICKNESS
    //             + kRobotGeometry.INTAKE_EXTENSION,
    //             0
    //         ),
    //         new Rotation2d()
    //     );
    // }

    /**
     * Exposes an easy api for tracking intaken notes in sim auto
     * 
     * This is a very memory inefficient way of solving this problem,
     * this is ok because this util should only be used in sim,
     * if you want to use this on a roborio for whatever reason expect high performance overhead
     * 
     * @param poseSupplier A lambda that returns the current position of the robot (blue alliance origin)
     * @param isIntakingSupplier A lambda that returns if the robot is currently intaking
     * @param noteDisplayFunction A lambda that is given the current note positions on the field as translations
     * @param intakePointTransform A list of the robot relative transforms of the intake when the robot is intaking
     * @return A Trigger that will have a guranteed rising edge for every not the robot intakes
     */
    public static Trigger setupAutoNoteIntake(
        Supplier<Pose2d> poseSupplier,
        BooleanSupplier isIntakingSupplier,
        Consumer<List<Translation2d>> noteDisplayFunction,
        List<Transform2d> intakePointTransform
    ) {
        ArrayList<Translation2d> notes = new ArrayList<>(List.of(NOTES));
        AtomicBoolean didJustIntake = new AtomicBoolean(false);
        Command cmd = new FunctionalCommand(
            () -> noteDisplayFunction.accept(notes),
            () -> {
                // make sure every note intake causes an edge. If we are intaking multiple notes at once somehow
                // only take 1 out of the array, use 1 cycle to register the rising edge then the next cycle to register the falling edge,
                // then the next note can be intaken.
                if (didJustIntake.get()) {
                    // registers the falling edge and prevents the array from being modified
                    didJustIntake.set(false);
                    return;
                }
                List<Translation2d> intakePoints = intakePointTransform
                    .stream()
                    .map(transform -> poseSupplier.get().transformBy(transform).getTranslation())
                    .toList();
                if (isIntakingSupplier.getAsBoolean()) {
                    List<Translation2d> newNotes = notes
                        .stream()
                        .filter(note -> {
                            if (didJustIntake.get()) {
                                return true;
                            }
                            for (Translation2d intakePoint : intakePoints) {
                                if (note.getDistance(intakePoint) < NOTE_RADIUS) {
                                    didJustIntake.set(true);
                                    return false;
                                }
                            }
                            return true;
                        })
                        .toList();
                    notes.clear();
                    notes.addAll(newNotes);
                }
            },
            interrupted -> noteDisplayFunction.accept(List.of()),
            () -> false
        );

        RobotModeTriggers.autonomous().whileTrue(cmd);

        return new Trigger(didJustIntake::get);
    }
}
