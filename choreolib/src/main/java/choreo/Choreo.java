// Copyright (c) Choreo contributors

package choreo;

import static edu.wpi.first.util.ErrorMessages.requireNonNullParam;

import choreo.auto.AutoChooser;
import choreo.auto.AutoFactory;
import choreo.auto.AutoFactory.AutoBindings;
import choreo.auto.AutoRoutine;
import choreo.auto.AutoTrajectory;
import choreo.trajectory.DifferentialSample;
import choreo.trajectory.EventMarker;
import choreo.trajectory.ProjectFile;
import choreo.trajectory.SwerveSample;
import choreo.trajectory.Trajectory;
import choreo.trajectory.TrajectorySample;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonObject;
import com.google.gson.JsonSyntaxException;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.Filesystem;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Subsystem;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.BiConsumer;
import java.util.function.BooleanSupplier;
import java.util.function.Supplier;

/** Utilities to load and follow Choreo Trajectories */
public final class Choreo {
  private static final Gson GSON =
      new GsonBuilder()
          .registerTypeAdapter(EventMarker.class, new EventMarker.Deserializer())
          .create();
  private static final String TRAJECTORY_FILE_EXTENSION = ".traj";
  private static final String SPEC_VERSION = "v2025.0.0";

  private static File CHOREO_DIR = new File(Filesystem.getDeployDirectory(), "choreo");

  private static Optional<ProjectFile> LAZY_PROJECT_FILE = Optional.empty();

  /** This should only be used for unit testing. */
  static void setChoreoDir(File choreoDir) {
    CHOREO_DIR = choreoDir;
  }

  /**
   * Gets the project file from the deploy directory. Choreolib expects a .chor file to be placed in
   * src/main/deploy/choreo.
   *
   * <p>The result is cached after the first call.
   *
   * @return the project file
   */
  public static ProjectFile getProjectFile() {
    if (LAZY_PROJECT_FILE.isPresent()) {
      return LAZY_PROJECT_FILE.get();
    }
    try {
      // find the first file that ends with a .chor extension
      File[] projectFiles = CHOREO_DIR.listFiles((dir, name) -> name.endsWith(".chor"));
      if (projectFiles.length == 0) {
        throw new RuntimeException("Could not find project file in deploy directory");
      } else if (projectFiles.length > 1) {
        throw new RuntimeException("Found multiple project files in deploy directory");
      }
      BufferedReader reader = new BufferedReader(new FileReader(projectFiles[0]));
      String str = reader.lines().reduce("", (a, b) -> a + b);
      reader.close();
      JsonObject json = GSON.fromJson(str, JsonObject.class);
      String version = json.get("version").getAsString();
      if (!SPEC_VERSION.equals(version)) {
        throw new RuntimeException(
            ".chor project file: Wrong version " + version + ". Expected " + SPEC_VERSION);
      }
      LAZY_PROJECT_FILE = Optional.of(GSON.fromJson(str, ProjectFile.class));
    } catch (JsonSyntaxException ex) {
      throw new RuntimeException("Could not parse project file", ex);
    } catch (FileNotFoundException ex) {
      throw new RuntimeException("Could not find project file", ex);
    } catch (IOException ex) {
      throw new RuntimeException("Could not close the project file", ex);
    }
    return LAZY_PROJECT_FILE.get();
  }

  /**
   * This interface exists as a type alias. A TrajectoryLogger has a signature of ({@link
   * Trajectory}, {@link Boolean})-&gt;void, where the function consumes a trajectory and a boolean
   * indicating whether the trajectory is starting or finishing.
   *
   * @param <SampleType> DifferentialSample or SwerveSample.
   */
  public interface TrajectoryLogger<SampleType extends TrajectorySample<SampleType>>
      extends BiConsumer<Trajectory<SampleType>, Boolean> {}

  /** Default constructor. */
  private Choreo() {
    throw new UnsupportedOperationException("This is a utility class!");
  }

  /**
   * Load a trajectory from the deploy directory. Choreolib expects .traj files to be placed in
   * src/main/deploy/choreo/[trajectoryName].traj.
   *
   * @param <SampleType> The type of samples in the trajectory.
   * @param trajectoryName The path name in Choreo, which matches the file name in the deploy
   *     directory, file extension is optional.
   * @return The loaded trajectory, or `Optional.empty()` if the trajectory could not be loaded.
   */
  @SuppressWarnings("unchecked")
  public static <SampleType extends TrajectorySample<SampleType>>
      Optional<Trajectory<SampleType>> loadTrajectory(String trajectoryName) {
    requireNonNullParam(trajectoryName, "trajectoryName", "Choreo.loadTrajectory");

    if (trajectoryName.endsWith(TRAJECTORY_FILE_EXTENSION)) {
      trajectoryName =
          trajectoryName.substring(0, trajectoryName.length() - TRAJECTORY_FILE_EXTENSION.length());
    }
    File trajectoryFile = new File(CHOREO_DIR, trajectoryName + TRAJECTORY_FILE_EXTENSION);
    try {
      var reader = new BufferedReader(new FileReader(trajectoryFile));
      String str = reader.lines().reduce("", (a, b) -> a + b);
      reader.close();
      Trajectory<SampleType> trajectory =
          (Trajectory<SampleType>) loadTrajectoryString(str, getProjectFile());
      return Optional.of(trajectory);
    } catch (FileNotFoundException ex) {
      DriverStation.reportError("Could not find trajectory file: " + trajectoryFile, false);
    } catch (JsonSyntaxException ex) {
      DriverStation.reportError("Could not parse trajectory file: " + trajectoryFile, false);
    } catch (Exception ex) {
      DriverStation.reportError(ex.getMessage(), ex.getStackTrace());
    }
    return Optional.empty();
  }

  /**
   * Load a trajectory from a string.
   *
   * @param trajectoryJsonString The JSON string.
   * @param projectFile The project file.
   * @return The loaded trajectory, or `empty std::optional` if the trajectory could not be loaded.
   */
  static Trajectory<? extends TrajectorySample<?>> loadTrajectoryString(
      String trajectoryJsonString, ProjectFile projectFile) {
    JsonObject wholeTrajectory = GSON.fromJson(trajectoryJsonString, JsonObject.class);
    String name = wholeTrajectory.get("name").getAsString();
    String version = wholeTrajectory.get("version").getAsString();
    if (!SPEC_VERSION.equals(version)) {
      throw new RuntimeException(
          name + ".traj: Wrong version: " + version + ". Expected " + SPEC_VERSION);
    }
    // Filter out markers with negative timestamps or empty names
    List<EventMarker> unfilteredEvents =
        new ArrayList<EventMarker>(
            Arrays.asList(GSON.fromJson(wholeTrajectory.get("events"), EventMarker[].class)));
    unfilteredEvents.removeIf(marker -> marker.timestamp < 0 || marker.event.length() == 0);
    EventMarker[] events = new EventMarker[unfilteredEvents.size()];
    unfilteredEvents.toArray(events);

    JsonObject trajectoryObj = wholeTrajectory.getAsJsonObject("trajectory");
    Integer[] splits = GSON.fromJson(trajectoryObj.get("splits"), Integer[].class);
    if (splits.length == 0 || splits[0] != 0) {
      Integer[] newArray = new Integer[splits.length + 1];
      newArray[0] = 0;
      System.arraycopy(splits, 0, newArray, 1, splits.length);
      splits = newArray;
    }
    if (projectFile.type.equals("Swerve")) {
      SwerveSample[] samples = GSON.fromJson(trajectoryObj.get("samples"), SwerveSample[].class);
      return new Trajectory<SwerveSample>(name, List.of(samples), List.of(splits), List.of(events));
    } else if (projectFile.type.equals("Differential")) {
      DifferentialSample[] sampleArray =
          GSON.fromJson(trajectoryObj.get("samples"), DifferentialSample[].class);
      return new Trajectory<DifferentialSample>(
          name, List.of(sampleArray), List.of(splits), List.of(events));
    } else {
      throw new RuntimeException("Unknown project type: " + projectFile.type);
    }
  }

  /**
   * A utility for caching loaded trajectories. This allows for loading trajectories only once, and
   * then reusing them.
   */
  public static class TrajectoryCache {
    private final Map<String, Trajectory<?>> cache;

    /** Creates a new TrajectoryCache with a normal {@link HashMap} as the cache. */
    public TrajectoryCache() {
      cache = new HashMap<>();
    }

    /**
     * Creates a new TrajectoryCache with a custom cache.
     *
     * <p>this could be useful if you want to use a concurrent map or a map with a maximum size.
     *
     * @param cache The cache to use.
     */
    public TrajectoryCache(Map<String, Trajectory<?>> cache) {
      requireNonNullParam(cache, "cache", "TrajectoryCache.<init>");
      this.cache = cache;
    }

    /**
     * Load a trajectory from the deploy directory. Choreolib expects .traj files to be placed in
     * src/main/deploy/choreo/[trajectoryName].traj.
     *
     * <p>This method will cache the loaded trajectory and reused it if it is requested again.
     *
     * @param trajectoryName the path name in Choreo, which matches the file name in the deploy
     *     directory, file extension is optional.
     * @return the loaded trajectory, or `Optional.empty()` if the trajectory could not be loaded.
     * @see Choreo#loadTrajectory(String)
     */
    public Optional<? extends Trajectory<?>> loadTrajectory(String trajectoryName) {
      requireNonNullParam(trajectoryName, "trajectoryName", "TrajectoryCache.loadTrajectory");
      if (cache.containsKey(trajectoryName)) {
        return Optional.of(cache.get(trajectoryName));
      } else {
        return Choreo.loadTrajectory(trajectoryName)
            .map(
                trajectory -> {
                  cache.put(trajectoryName, trajectory);
                  return trajectory;
                });
      }
    }

    /**
     * Load a section of a split trajectory from the deploy directory. Choreolib expects .traj files
     * to be placed in src/main/deploy/choreo/[trajectoryName].traj.
     *
     * <p>This method will cache the loaded trajectory and reused it if it is requested again. The
     * trajectory that is split off of will also be cached.
     *
     * @param trajectoryName the path name in Choreo, which matches the file name in the deploy
     *     directory, file extension is optional.
     * @param splitIndex the index of the split trajectory to load
     * @return the loaded trajectory, or `Optional.empty()` if the trajectory could not be loaded.
     * @see Choreo#loadTrajectory(String)
     */
    public Optional<? extends Trajectory<?>> loadTrajectory(String trajectoryName, int splitIndex) {
      requireNonNullParam(trajectoryName, "trajectoryName", "TrajectoryCache.loadTrajectory");
      // make the key something that could never possibly be a valid trajectory name
      String key = trajectoryName + ".:." + splitIndex;
      if (cache.containsKey(key)) {
        return Optional.of(cache.get(key));
      } else if (cache.containsKey(trajectoryName)) {
        return cache
            .get(trajectoryName)
            .getSplit(splitIndex)
            .map(
                trajectory -> {
                  cache.put(key, trajectory);
                  return trajectory;
                });
      } else {
        return Choreo.loadTrajectory(trajectoryName)
            .flatMap(
                trajectory -> {
                  cache.put(trajectoryName, trajectory);
                  return trajectory
                      .getSplit(splitIndex)
                      .map(
                          split -> {
                            cache.put(key, split);
                            return split;
                          });
                });
      }
    }

    /** Clear the cache. */
    public void clear() {
      cache.clear();
    }
  }

  /**
   * Create a factory that can be used to create {@link AutoRoutine} and {@link AutoTrajectory}.
   *
   * @param <SampleType> The type of samples in the trajectory.
   * @param driveSubsystem The drive {@link Subsystem} to require for {@link AutoTrajectory} {@link
   *     Command}s.
   * @param poseSupplier A function that returns the current field-relative {@link Pose2d} of the
   *     robot.
   * @param controller A {@link BiConsumer} to follow the current {@link Trajectory}&lt;{@link
   *     SampleType}&gt;.
   * @param mirrorTrajectory If this returns true, the path will be mirrored to the opposite side,
   *     while keeping the same coordinate system origin. This will be called every loop during the
   *     command.
   * @param bindings Universal trajectory event bindings.
   * @return An {@link AutoFactory} that can be used to create {@link AutoRoutine} and {@link
   *     AutoTrajectory}.
   * @see AutoChooser using this factory with AutoChooser to generate auto routines.
   */
  public static <SampleType extends TrajectorySample<SampleType>> AutoFactory createAutoFactory(
      Subsystem driveSubsystem,
      Supplier<Pose2d> poseSupplier,
      BiConsumer<Pose2d, SampleType> controller,
      BooleanSupplier mirrorTrajectory,
      AutoBindings bindings) {
    return new AutoFactory(
        requireNonNullParam(poseSupplier, "poseSupplier", "Choreo.createAutoFactory"),
        requireNonNullParam(controller, "controller", "Choreo.createAutoFactory"),
        requireNonNullParam(mirrorTrajectory, "mirrorTrajectory", "Choreo.createAutoFactory"),
        requireNonNullParam(driveSubsystem, "driveSubsystem", "Choreo.createAutoFactory"),
        requireNonNullParam(bindings, "bindings", "Choreo.createAutoFactory"),
        Optional.empty());
  }

  /**
   * Create a factory that can be used to create {@link AutoRoutine} and {@link AutoTrajectory}.
   *
   * @param <SampleType> The type of samples in the trajectory.
   * @param driveSubsystem The drive {@link Subsystem} to require for {@link AutoTrajectory} {@link
   *     Command}s.
   * @param poseSupplier A function that returns the current field-relative {@link Pose2d} of the
   *     robot.
   * @param controller A {@link BiConsumer} to follow the current {@link Trajectory}&lt;{@link
   *     SampleType}&gt;.
   * @param mirrorTrajectory If this returns true, the path will be mirrored to the opposite side,
   *     while keeping the same coordinate system origin. This will be called every loop during the
   *     command.
   * @param bindings Universal trajectory event bindings.
   * @param trajectoryLogger A {@link TrajectoryLogger} to log {@link Trajectory} as they start and
   *     finish.
   * @return An {@link AutoFactory} that can be used to create {@link AutoRoutine} and {@link
   *     AutoTrajectory}.
   * @see AutoChooser using this factory with AutoChooser to generate auto routines.
   */
  public static <SampleType extends TrajectorySample<SampleType>> AutoFactory createAutoFactory(
      Subsystem driveSubsystem,
      Supplier<Pose2d> poseSupplier,
      BiConsumer<Pose2d, SampleType> controller,
      BooleanSupplier mirrorTrajectory,
      AutoBindings bindings,
      TrajectoryLogger<SampleType> trajectoryLogger) {
    return new AutoFactory(
        requireNonNullParam(poseSupplier, "poseSupplier", "Choreo.createAutoFactory"),
        requireNonNullParam(controller, "controller", "Choreo.createAutoFactory"),
        requireNonNullParam(mirrorTrajectory, "mirrorTrajectory", "Choreo.createAutoFactory"),
        requireNonNullParam(driveSubsystem, "driveSubsystem", "Choreo.createAutoFactory"),
        requireNonNullParam(bindings, "bindings", "Choreo.createAutoFactory"),
        Optional.of(trajectoryLogger));
  }
}
