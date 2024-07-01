// Copyright (c) Choreo contributors

package com.choreo.lib;

import static edu.wpi.first.util.ErrorMessages.requireNonNullParam;

import com.choreo.lib.trajectory.ChoreoTrajectory;
import com.google.gson.Gson;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.Filesystem;
import edu.wpi.first.wpilibj2.command.Subsystem;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.function.BooleanSupplier;
import java.util.function.Consumer;
import java.util.function.Supplier;

/** Utilities to load and follow ChoreoTrajectories */
public final class Choreo {
  private static final Gson gson = new Gson();

  /** Default constructor. */
  private Choreo() {
    throw new UnsupportedOperationException("This is a utility class!");
  }

  private static Optional<ChoreoTrajectory> loadFile(File path) {
    try {
      var reader = new BufferedReader(new FileReader(path));
      ChoreoTrajectory traj = gson.fromJson(reader, ChoreoTrajectory.class);
      return Optional.ofNullable(traj);
    } catch (FileNotFoundException ex) {
      return Optional.empty();
    } catch (Exception ex) {
      DriverStation.reportError(ex.getMessage(), ex.getStackTrace());
    }
    return Optional.empty();
  }

  /**
   * Load a trajectory from the deploy directory. Choreolib expects .traj files to be placed in
   * src/main/deploy/choreo/[trajName].traj.
   *
   * @param trajName the path name in Choreo, which matches the file name in the deploy directory.
   * @return the loaded trajectory, or null if the trajectory could not be loaded.
   */
  public static Optional<ChoreoTrajectory> getTrajectory(String trajName) {
    requireNonNullParam(trajName, "trajName", "Choreo.getTrajectory");

    String fileExtension = ".traj";
    if (trajName.endsWith(fileExtension)) {
      trajName = trajName.substring(0, trajName.length() - fileExtension.length());
    }
    var traj_dir = new File(Filesystem.getDeployDirectory(), "choreo");
    var traj_file = new File(traj_dir, trajName + fileExtension);

    return loadFile(traj_file);
  }

  /**
   * Loads the split parts of the specified trajectory. Fails and returns null if any of the parts
   * could not be loaded.
   *
   * <p>This method determines the number of parts to load by counting the files that match the
   * pattern "trajName.X.traj", where X is a string of digits. Let this count be N. It then attempts
   * to load "trajName.1.traj" through "trajName.N.traj", consecutively counting up. If any of these
   * files cannot be loaded, the method returns null.
   *
   * @param trajName The path name in Choreo for this trajectory.
   * @return The List of segments, in order, or null.
   */
  public static Optional<List<ChoreoTrajectory>> getTrajectoryGroup(String trajName) {
    requireNonNullParam(trajName, "trajName", "Choreo.getTrajectoryGroup");

    // Count files matching the pattern for split parts.
    var traj_dir = new File(Filesystem.getDeployDirectory(), "choreo");
    File[] files =
        traj_dir.listFiles((file) -> file.getName().matches(trajName + "\\.\\d+\\.traj"));
    int segmentCount = files.length;
    // Try to load the segments.
    var trajs = new ArrayList<ChoreoTrajectory>();
    for (int i = 1; i <= segmentCount; ++i) {
      File traj = new File(traj_dir, String.format("%s.%d.traj", trajName, i));
      var trajectory = loadFile(traj);
      if (!trajectory.isPresent()) {
        DriverStation.reportError("ChoreoLib: Missing segments for path group " + trajName, false);
        return Optional.empty();
      }
      trajs.add(trajectory.get());
    }

    return Optional.of(trajs);
  }

  /**
   * Create a command to follow a Choreo path.
   *
   * @param driveSubsystem The drive subsystem to require for commands made from this factory.
   * @param poseSupplier A function that returns the current field-relative pose of the robot.
   * @param controller A ChoreoControlFunction to follow the current trajectory state. Use
   *     ChoreoCommands.choreoSwerveController(PIDController xController, PIDController yController,
   *     PIDController rotationController) to create one using PID controllers for each degree of
   *     freedom. You can also pass in a function with the signature (Pose2d currentPose,
   *     ChoreoTrajectoryState referenceState) -&gt; ChassisSpeeds to implement a custom follower
   *     (i.e. for logging).
   * @param outputChassisSpeeds A function that consumes the target robot-relative chassis speeds
   *     and commands them to the robot.
   * @param mirrorTrajectory If this returns true, the path will be mirrored to the opposite side,
   *     while keeping the same coordinate system origin. This will be called every loop during the
   *     command.
   * @return A command that follows a Choreo path.
   */
  public static ChoreoAutoFactory createAutoFactory(
      Subsystem driveSubsystem,
      Supplier<Pose2d> poseSupplier,
      ChoreoControlFunction controller,
      Consumer<ChassisSpeeds> outputChassisSpeeds,
      BooleanSupplier mirrorTrajectory) {
    return new ChoreoAutoFactory(
        requireNonNullParam(poseSupplier, "poseSupplier", "Choreo.createAutoFactory"),
        requireNonNullParam(controller, "controller", "Choreo.createAutoFactory"),
        requireNonNullParam(outputChassisSpeeds, "outputChassisSpeeds", "Choreo.createAutoFactory"),
        requireNonNullParam(mirrorTrajectory, "mirrorTrajectory", "Choreo.createAutoFactory"),
        Optional.empty(),
        requireNonNullParam(driveSubsystem, "driveSubsystem", "Choreo.createAutoFactory"));
  }

  /**
   * Create a command to follow a Choreo path.
   *
   * @param driveSubsystem The drive subsystem to require for commands made from this factory.
   * @param poseSupplier A function that returns the current field-relative pose of the robot.
   * @param controller A ChoreoControlFunction to follow the current trajectory state. Use
   *     ChoreoCommands.choreoSwerveController(PIDController xController, PIDController yController,
   *     PIDController rotationController) to create one using PID controllers for each degree of
   *     freedom. You can also pass in a function with the signature (Pose2d currentPose,
   *     ChoreoTrajectoryState referenceState) -&gt; ChassisSpeeds to implement a custom follower
   *     (i.e. for logging).
   * @param outputChassisSpeeds A function that consumes the target robot-relative chassis speeds
   *     and commands them to the robot.
   * @param mirrorTrajectory If this returns true, the path will be mirrored to the opposite side,
   *     while keeping the same coordinate system origin. This will be called every loop during the
   *     command.
   * @param trajLogger A function that consumes a trajectory whever one is started, should be used
   *     for logging.x
   * @return A command that follows a Choreo path.
   */
  public static ChoreoAutoFactory createAutoFactory(
      Subsystem driveSubsystem,
      Supplier<Pose2d> poseSupplier,
      ChoreoControlFunction controller,
      Consumer<ChassisSpeeds> outputChassisSpeeds,
      BooleanSupplier mirrorTrajectory,
      Consumer<ChoreoTrajectory> trajLogger) {
    return new ChoreoAutoFactory(
        requireNonNullParam(poseSupplier, "poseSupplier", "Choreo.createAutoFactory"),
        requireNonNullParam(controller, "controller", "Choreo.createAutoFactory"),
        requireNonNullParam(outputChassisSpeeds, "outputChassisSpeeds", "Choreo.createAutoFactory"),
        requireNonNullParam(mirrorTrajectory, "mirrorTrajectory", "Choreo.createAutoFactory"),
        Optional.of(requireNonNullParam(trajLogger, "trajLogger", "Choreo.createAutoFactory")),
        requireNonNullParam(driveSubsystem, "driveSubsystem", "Choreo.createAutoFactory"));
  }
}
