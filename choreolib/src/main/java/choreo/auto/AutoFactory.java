// Copyright (c) Choreo contributors

package choreo.auto;

import choreo.Choreo.TrajectoryCache;
import choreo.Choreo.TrajectoryLogger;
import choreo.trajectory.SwerveSample;
import choreo.trajectory.Trajectory;
import choreo.trajectory.TrajectorySample;
import choreo.util.ChoreoAllianceFlipUtil;
import org.wpilib.command3.Command;
import org.wpilib.command3.Mechanism;
import org.wpilib.driverstation.Alliance;
import org.wpilib.driverstation.internal.DriverStationBackend;
import org.wpilib.math.geometry.Pose2d;

import java.util.HashMap;
import java.util.List;
import java.util.Optional;
import java.util.function.Consumer;
import java.util.function.Supplier;

import static org.wpilib.util.ErrorMessages.requireNonNullParam;

/**
 * A factory used to create {@link AutoTrajectory}s.
 *
 * @see <a href="https://choreo.autos/choreolib/auto-routines">Auto Routine Docs</a>
 */
public class AutoFactory {
  record AllianceContext(boolean useAllianceFlipping, Supplier<Optional<Alliance>> allianceGetter) {
    boolean allianceKnownOrIgnored() {
      return allianceGetter.get().isPresent() || !useAllianceFlipping;
    }

    boolean doFlip() {
      return useAllianceFlipping
          && allianceGetter
              .get()
              .orElseThrow(
                  () -> new RuntimeException("Flip check was called with an unknown alliance"))
              .equals(Alliance.RED);
    }

    Optional<Alliance> alliance() {
      return allianceGetter.get();
    }

    Supplier<Optional<Pose2d>> getFlippedPose(Optional<Pose2d> bluePose) {
      return ChoreoAllianceFlipUtil.optionalFlippedPose2d(
          bluePose, this::alliance, useAllianceFlipping);
    }
  }

  /** A class used to bind commands to events in all trajectories created by this factory. */
  static class AutoBindings {
    private final HashMap<String, Command> bindings = new HashMap<>();

    /** Default constructor. */
    public AutoBindings() {}

    /**
     * Binds a command to an event in all trajectories created by the factory using this bindings.
     *
     * @param name The name of the event to bind the command to.
     * @param cmd The command to bind to the event.
     * @return The bindings object for chaining.
     */
    public AutoBindings bind(String name, Command cmd) {
      bindings.put(name, cmd);
      return this;
    }

    /**
     * Gets the bindings map.
     *
     * @return The bindings map.
     */
    HashMap<String, Command> getBindings() {
      return bindings;
    }
  }

  private final TrajectoryCache trajectoryCache = new TrajectoryCache();
  private final Supplier<Pose2d> poseSupplier;
  private final Consumer<Pose2d> resetOdometry;
  private final Consumer<? extends TrajectorySample<?>> controller;
  private final AllianceContext allianceCtx;
  private final Mechanism driveMechanism;
  private final AutoBindings bindings = new AutoBindings();
  private final TrajectoryLogger<? extends TrajectorySample<?>> trajectoryLogger;

  /**
   * Create a factory that can be used to create {@link AutoTrajectory}(s).
   *
   * @param <SampleType> The type of samples in the trajectory.
   * @param poseSupplier A function that returns the current field-relative {@link Pose2d} of the
   *     robot.
   * @param resetOdometry A function that receives a field-relative {@link Pose2d} to reset the
   *     robot's odometry to.
   * @param controller A function that receives the current {@link SampleType} and controls the
   *     robot.
   * @param useAllianceFlipping If this is true, when on the red alliance, the path will be mirrored
   *     to the opposite side, while keeping the same coordinate system origin.
   * @param driveMechanism The drive {@link Mechanism} to require for {@link AutoTrajectory} {@link
   *     Command}s.
   * @param trajectoryLogger A {@link TrajectoryLogger} to log {@link Trajectory} as they start and
   *     finish.
   */
  public <SampleType extends TrajectorySample<SampleType>> AutoFactory(
      Supplier<Pose2d> poseSupplier,
      Consumer<Pose2d> resetOdometry,
      Consumer<SampleType> controller,
      boolean useAllianceFlipping,
      Mechanism driveMechanism,
      TrajectoryLogger<SampleType> trajectoryLogger) {
    requireNonNullParam(poseSupplier, "poseSupplier", "AutoFactory");
    requireNonNullParam(resetOdometry, "resetOdometry", "AutoFactory");
    requireNonNullParam(controller, "controller", "AutoFactory");
    requireNonNullParam(driveMechanism, "driveMechanism", "AutoFactory");
    requireNonNullParam(useAllianceFlipping, "useAllianceFlipping", "AutoFactory");

    this.poseSupplier = poseSupplier;
    this.resetOdometry = resetOdometry;
    this.controller = controller;
    this.driveMechanism = driveMechanism;
    this.allianceCtx = new AllianceContext(useAllianceFlipping, DriverStationBackend::getAlliance);
    this.trajectoryLogger = trajectoryLogger;
  }

  /**
   * Create a factory that can be used to create an {@link AutoTrajectory}.
   *
   * @param <ST> {@link choreo.trajectory.DifferentialSample} or {@link
   *     SwerveSample}
   * @param poseSupplier A function that returns the current field-relative {@link Pose2d} of the
   *     robot.
   * @param resetOdometry A function that receives a field-relative {@link Pose2d} to reset the
   *     robot's odometry to.
   * @param controller A function that receives the current {@link ST} and controls the robot.
   * @param useAllianceFlipping If this returns true, when on the red alliance, the path will be
   *     mirrored to the opposite side, while keeping the same coordinate system origin.
   * @param driveMechanism The drive {@link Mechanism} to require for {@link AutoTrajectory} {@link
   *     Command}s.
   */
  public <ST extends TrajectorySample<ST>> AutoFactory(
      Supplier<Pose2d> poseSupplier,
      Consumer<Pose2d> resetOdometry,
      Consumer<ST> controller,
      boolean useAllianceFlipping,
      Mechanism driveMechanism) {
    this(
        poseSupplier,
        resetOdometry,
        controller,
        useAllianceFlipping,
        driveMechanism,
        (_, _) -> {});
  }

  /**
   * Creates a new {@link AutoTrajectory} to be used in an auto routine.
   *
   * @param trajectoryName The name of the trajectory to use.
   * @return A new {@link AutoTrajectory}.
   */
  public AutoTrajectory trajectory(String trajectoryName) {
    Optional<? extends Trajectory<?>> optTrajectory =
        trajectoryCache.loadTrajectory(trajectoryName);
    Trajectory<?> trajectory;
    if (optTrajectory.isPresent()) {
      trajectory = optTrajectory.get();
    } else {
      trajectory = new Trajectory<SwerveSample>(trajectoryName, List.of(), List.of(), List.of());
    }
    return trajectory(trajectory);
  }

  /**
   * Creates a new {@link AutoTrajectory} to be used in an auto routine.
   *
   * @param trajectoryName The name of the trajectory to use.
   * @param splitIndex The index of the split trajectory to use.
   * @return A new {@link AutoTrajectory}.
   */
  public AutoTrajectory trajectory(String trajectoryName, final int splitIndex) {
    Optional<? extends Trajectory<?>> optTrajectory =
        trajectoryCache.loadTrajectory(trajectoryName, splitIndex);
    Trajectory<?> trajectory;
    if (optTrajectory.isPresent()) {
      trajectory = optTrajectory.get();
    } else {
      trajectory = new Trajectory<SwerveSample>(trajectoryName, List.of(), List.of(), List.of());
    }
    return trajectory(trajectory);
  }

  /**
   * Creates a new {@link AutoTrajectory} to be used in an auto routine.
   *
   * @param <ST> The type of the trajectory samples.
   * @param trajectory The trajectory to use.
   * @return A new {@link AutoTrajectory}.
   */
  @SuppressWarnings("unchecked")
  public <ST extends TrajectorySample<ST>> AutoTrajectory trajectory(Trajectory<ST> trajectory) {
    return new AutoTrajectory(
        trajectory.name(),
        trajectory,
        poseSupplier,
        resetOdometry,
        (Consumer<ST>) this.controller,
        allianceCtx,
        (TrajectoryLogger<ST>) trajectoryLogger,
        driveMechanism,
        bindings);
  }

  /**
   * Binds a command to an event in all trajectories created after this point.
   *
   * @param name The name of the trajectory to bind the command to.
   * @param cmd The command to bind to the trajectory.
   * @return The AutoFactory the method was called from.
   */
  public AutoFactory bind(String name, Command cmd) {
    bindings.bind(name, cmd);
    return this;
  }

  /**
   * The {@link AutoFactory} caches trajectories with a {@link TrajectoryCache} to avoid reloading
   * the same trajectory multiple times.
   *
   * @return The trajectory cache.
   */
  public TrajectoryCache cache() {
    return trajectoryCache;
  }

}
