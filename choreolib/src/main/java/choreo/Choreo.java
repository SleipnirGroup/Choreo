// Copyright (c) Choreo contributors

package choreo;

import static edu.wpi.first.util.ErrorMessages.requireNonNullParam;

import choreo.trajectory.Trajectory;
import choreo.autos.AutoFactory;
import choreo.autos.AutoLoop;
import choreo.autos.AutoTrajectory;
import choreo.autos.AutoFactory.ChoreoAutoBindings;
import choreo.trajectory.TrajSample;
import com.google.gson.Gson;
import com.google.gson.JsonSyntaxException;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.Filesystem;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Subsystem;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.function.BiConsumer;
import java.util.function.BiFunction;
import java.util.function.BooleanSupplier;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.Supplier;

/** Utilities to load and follow ChoreoTrajectories */
public final class Choreo {
  private static final Gson gson = new Gson();
  private static final File CHOREO_DIR = new File(Filesystem.getDeployDirectory(), "choreo");
  private static final String TRAJECTORY_FILE_EXTENSION = ".traj";

  /**
   * This interface exists as a type alias. A ChoreoControlFunction has signature (Pose2d
   * currentPose, ChoreoTrajectoryState referenceState)-&gt;ChassisSpeeds, where the function
   * returns robot-relative ChassisSpeeds for the robot.
   */
  public interface ChoreoControlFunction<SampleType extends TrajSample<SampleType>>
      extends BiFunction<Pose2d, SampleType, ChassisSpeeds> {}

  /**
   * This interface exists as a type alias. A ChoreoTrajectoryLogger has signature
   * (ChoreoTrajectory, Boolean)-&gt;void, where the function consumes a trajectory and a boolean
   * indicating whether the trajectory is starting or finishing.
   */
  public interface ChoreoTrajectoryLogger extends BiConsumer<Pose2d[], Boolean> {}

  public interface ChoreoAutoRountine extends Function<AutoFactory, Command> {}

  /** Default constructor. */
  private Choreo() {
    throw new UnsupportedOperationException("This is a utility class!");
  }

  /**
   * Load a trajectory from the deploy directory. Choreolib expects .traj files to be placed in
   * src/main/deploy/choreo/[trajName].traj.
   *
   * @param trajName the path name in Choreo, which matches the file name in the deploy directory,
   *     file extension is optional.
   * @return the loaded trajectory, or `Optional.empty()` if the trajectory could not be loaded.
   */
  @SuppressWarnings("unchecked")
  public static <SampleType extends TrajSample<SampleType>>
      Optional<Trajectory<SampleType>> loadTrajectory(String trajName) {
    requireNonNullParam(trajName, "trajName", "Choreo.loadTrajectory");

    if (trajName.endsWith(TRAJECTORY_FILE_EXTENSION)) {
      trajName = trajName.substring(0, trajName.length() - TRAJECTORY_FILE_EXTENSION.length());
    }
    var trajFile = new File(CHOREO_DIR, trajName + TRAJECTORY_FILE_EXTENSION);

    try {
      var reader = new BufferedReader(new FileReader(trajFile));
      Trajectory<SampleType> traj = gson.fromJson(reader, Trajectory.class);
      return Optional.ofNullable(traj);
    } catch (FileNotFoundException ex) {
      DriverStation.reportError("Could not find trajectory file: " + trajFile, false);
      return Optional.empty();
    } catch (JsonSyntaxException ex) {
      DriverStation.reportError("Could not parse trajectory file: " + trajFile, false);
      return Optional.empty();
    } catch (Exception ex) {
      DriverStation.reportError(ex.getMessage(), ex.getStackTrace());
    }
    return Optional.empty();
  }

  /**
   * A utility for caching loaded trajectories.
   * This allows for loading trajectories only once, and then reusing them.
   */
  public static class ChoreoTrajCache {
    private final Map<String, Trajectory<?>> cache;

    /**
     * Creates a new ChoreoTrajCache with a normal {@link HashMap} as the cache.
     */
    public ChoreoTrajCache() {
      cache = new HashMap<>();
    }

    /**
     * Creates a new ChoreoTrajCache with a custom cache.
     * 
     * <p> this could be useful if you want to use a concurrent map or a map with a maximum size.
     *
     * @param cache The cache to use.
     */
    public ChoreoTrajCache(Map<String, Trajectory<?>> cache) {
      this.cache = cache;
    }

    /**
     * Load a trajectory from the deploy directory. Choreolib expects .traj files to be placed in
     * src/main/deploy/choreo/[trajName].traj.
     * 
     * <p> This method will cache the loaded trajectory and reused it if it is requested again.
     *
     * @param trajName the path name in Choreo, which matches the file name in the deploy directory,
     *     file extension is optional.
     * @return the loaded trajectory, or `Optional.empty()` if the trajectory could not be loaded.
     * @see Choreo#loadTrajectory(String)
     */
    public Optional<? extends Trajectory<?>> loadTrajectory(String trajName) {
      if (cache.containsKey(trajName)) {
        return Optional.of(cache.get(trajName));
      } else {
        return loadTrajectory(trajName).map(traj -> {
          cache.put(trajName, traj);
          return traj;
        });
      }
    }

    /**
     * Load a section of a split trajectory from the deploy directory. Choreolib expects .traj files to be placed in
     * src/main/deploy/choreo/[trajName].traj.
     * 
     * <p> This method will cache the loaded trajectory and reused it if it is requested again.
     * The trajectory that is split off of will also be cached.
     *
     * @param trajName the path name in Choreo, which matches the file name in the deploy directory,
     *     file extension is optional.
     * @param splitIndex the index of the split trajectory to load
     * @return the loaded trajectory, or `Optional.empty()` if the trajectory could not be loaded.
     * @see Choreo#loadTrajectory(String)
     */
    public Optional<? extends Trajectory<?>> loadTrajectory(String trajName, int splitIndex) {
      // make the key something that could never possibly be a valid trajectory name
      String key = trajName + ".:." + splitIndex;
      if (cache.containsKey(key)) {
        return Optional.of(cache.get(key));
      } else if (cache.containsKey(trajName)) {
        return cache.get(trajName).getSplit(splitIndex).map(traj -> {
          cache.put(key, traj);
          return traj;
        });
      } else {
        return loadTrajectory(trajName).flatMap(traj -> {
          cache.put(trajName, traj);
          return traj.getSplit(splitIndex).map(split -> {
            cache.put(key, split);
            return split;
          });
        });
      }
    }

    /**
     * Clear the cache.
     */
    public void clear() {
      cache.clear();
    }
  }

  /**
   * Create a command to follow a Choreo path.
   *
   * @param driveSubsystem The drive subsystem to require for commands made from this factory.
   * @param poseSupplier A function that returns the current field-relative pose of the robot.
   * @param controller A ChoreoControlFunction to follow the current trajectory state.
   * @param outputChassisSpeeds A function that consumes the target robot-relative chassis speeds
   *     and commands them to the robot.
   * @param mirrorTrajectory If this returns true, the path will be mirrored to the opposite side,
   *     while keeping the same coordinate system origin. This will be called every loop during the
   *     command.
   * @param bindings Universal trajectory event bindings.
   * @return A command that follows a Choreo path.
   */
  public static <SampleType extends TrajSample<SampleType>> AutoFactory createAutoFactory(
      Subsystem driveSubsystem,
      Supplier<Pose2d> poseSupplier,
      ChoreoControlFunction<SampleType> controller,
      Consumer<ChassisSpeeds> outputChassisSpeeds,
      BooleanSupplier mirrorTrajectory,
      ChoreoAutoBindings bindings) {
    return new AutoFactory(
        requireNonNullParam(poseSupplier, "poseSupplier", "Choreo.createAutoFactory"),
        requireNonNullParam(controller, "controller", "Choreo.createAutoFactory"),
        requireNonNullParam(outputChassisSpeeds, "outputChassisSpeeds", "Choreo.createAutoFactory"),
        requireNonNullParam(mirrorTrajectory, "mirrorTrajectory", "Choreo.createAutoFactory"),
        requireNonNullParam(driveSubsystem, "driveSubsystem", "Choreo.createAutoFactory"),
        requireNonNullParam(bindings, "bindings", "Choreo.createAutoFactory"),
        Optional.empty());
  }

  /**
   * Create a factory that can be used to create {@link AutoLoop} and {@link
   * AutoTrajectory}.
   *
   * @param driveSubsystem The drive subsystem to require for commands made from this factory.
   * @param poseSupplier A function that returns the current field-relative pose of the robot.
   * @param controller A ChoreoControlFunction to follow the current trajectory state.
   * @param outputChassisSpeeds A function that consumes the target robot-relative chassis speeds
   *     and directs them to the robot.
   * @param mirrorTrajectory If this returns true, the path will be mirrored to the opposite side,
   *     while keeping the same coordinate system origin. This will be called every loop during the
   *     command.
   * @param bindings Universal trajectory event bindings.
   * @param trajLogger A function that consumes a list of poses and a boolean indicating whether the
   *     trajectory is starting or finishing.
   * @return A command that follows a Choreo path.
   */
  public static <SampleType extends TrajSample<SampleType>> AutoFactory createAutoFactory(
      Subsystem driveSubsystem,
      Supplier<Pose2d> poseSupplier,
      ChoreoControlFunction<SampleType> controller,
      Consumer<ChassisSpeeds> outputChassisSpeeds,
      BooleanSupplier mirrorTrajectory,
      ChoreoAutoBindings bindings,
      ChoreoTrajectoryLogger trajLogger) {
    return new AutoFactory(
        requireNonNullParam(poseSupplier, "poseSupplier", "Choreo.createAutoFactory"),
        requireNonNullParam(controller, "controller", "Choreo.createAutoFactory"),
        requireNonNullParam(outputChassisSpeeds, "outputChassisSpeeds", "Choreo.createAutoFactory"),
        requireNonNullParam(mirrorTrajectory, "mirrorTrajectory", "Choreo.createAutoFactory"),
        requireNonNullParam(driveSubsystem, "driveSubsystem", "Choreo.createAutoFactory"),
        requireNonNullParam(bindings, "bindings", "Choreo.createAutoFactory"),
        Optional.of(trajLogger));
  }
}
