// Copyright (c) Choreo contributors

package choreo;

import static edu.wpi.first.util.ErrorMessages.requireNonNullParam;
import static edu.wpi.first.wpilibj.Alert.AlertType.kError;

import choreo.trajectory.DifferentialSample;
import choreo.trajectory.EventMarker;
import choreo.trajectory.SwerveSample;
import choreo.trajectory.Trajectory;
import choreo.trajectory.TrajectorySample;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonObject;
import com.google.gson.JsonSyntaxException;
import edu.wpi.first.hal.FRCNetComm.tResourceType;
import edu.wpi.first.hal.HAL;
import edu.wpi.first.wpilibj.Alert;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.Filesystem;
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
import java.util.function.Function;

/** Utilities to load and follow Choreo Trajectories */
public final class Choreo {
  private static final Gson GSON =
      new GsonBuilder()
          .registerTypeAdapter(EventMarker.class, new EventMarker.Deserializer())
          .create();
  private static final String TRAJECTORY_FILE_EXTENSION = ".traj";
  private static final int TRAJ_SCHEMA_VERSION = 1;
  private static final MultiAlert cantFindTrajectory =
      multiAlert(causes -> "Could not find trajectory files: " + causes, kError);
  private static final MultiAlert cantParseTrajectory =
      multiAlert(causes -> "Could not parse trajectory files: " + causes, kError);

  private static File CHOREO_DIR = new File(Filesystem.getDeployDirectory(), "choreo");


  /** This should only be used for unit testing. */
  static void setChoreoDir(File choreoDir) {
    CHOREO_DIR = choreoDir;
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
          (Trajectory<SampleType>) loadTrajectoryString(str);
      return Optional.of(trajectory);
    } catch (FileNotFoundException ex) {
      cantFindTrajectory.addCause(trajectoryFile.toString());
    } catch (JsonSyntaxException ex) {
      cantParseTrajectory.addCause(trajectoryFile.toString());
    } catch (Exception ex) {
      Choreo.alert(
              "Unknown error when parsing " + trajectoryFile + "; check console for more details",
              kError)
          .set(true);
      DriverStation.reportError(ex.getMessage(), ex.getStackTrace());
    }
    return Optional.empty();
  }

  /**
   * Load a trajectory from a string.
   *
   * @param trajectoryJsonString The JSON string.
   * @return The loaded trajectory, or `empty std::optional` if the trajectory could not be loaded.
   */
  static Trajectory<? extends TrajectorySample<?>> loadTrajectoryString(
      String trajectoryJsonString) {
    JsonObject wholeTrajectory = GSON.fromJson(trajectoryJsonString, JsonObject.class);
    String name = wholeTrajectory.get("name").getAsString();
    int version;
    try {
      version = wholeTrajectory.get("version").getAsInt();
      if (version != TRAJ_SCHEMA_VERSION) {
        throw new RuntimeException(
            name + ".traj: Wrong version: " + version + ". Expected " + TRAJ_SCHEMA_VERSION);
      }
    } catch (ClassCastException e) {
      throw new RuntimeException(
          name
              + ".traj: Wrong version: "
              + wholeTrajectory.get("version").getAsString()
              + ". Expected "
              + TRAJ_SCHEMA_VERSION);
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
    String sampleType = trajectoryObj.get("sampleType").getAsString();
    if (sampleType.equals("Swerve")) {
      HAL.report(tResourceType.kResourceType_ChoreoTrajectory, 1);

      SwerveSample[] samples = GSON.fromJson(trajectoryObj.get("samples"), SwerveSample[].class);
      return new Trajectory<SwerveSample>(name, List.of(samples), List.of(splits), List.of(events));
    } else if (sampleType.equals("Differential")) {
      HAL.report(tResourceType.kResourceType_ChoreoTrajectory, 2);

      DifferentialSample[] sampleArray =
          GSON.fromJson(trajectoryObj.get("samples"), DifferentialSample[].class);
      return new Trajectory<DifferentialSample>(
          name, List.of(sampleArray), List.of(splits), List.of(events));
    } else {
      throw new RuntimeException("Unknown drive type: " + sampleType);
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
   * Creates an alert under the "Choreo" group.
   *
   * @param name The name of the alert
   * @param type The type of alert
   * @return an Alert published under the "Choreo" group
   */
  public static Alert alert(String name, Alert.AlertType type) {
    return new Alert("Choreo", name, type);
  }

  /**
   * Creates a {@link MultiAlert} under the "Choreo" group.
   *
   * @param textGenerator A function that accepts a list of causes and returns an alert message
   * @param type The type of alert
   * @return a MultiAlert published under the "Choreo" group
   */
  public static MultiAlert multiAlert(
      Function<List<String>, String> textGenerator, Alert.AlertType type) {
    return new MultiAlert(textGenerator, type);
  }

  /**
   * An alert that can have multiple causes. Utilizes a function to generate an error message from a
   * list of causes.
   */
  public static class MultiAlert extends Alert {
    private final Function<List<String>, String> textGenerator;
    private final List<String> causes = new ArrayList<>();

    MultiAlert(Function<List<String>, String> textGenerator, AlertType type) {
      super("Choreo", textGenerator.apply(List.of()), type);
      this.textGenerator = textGenerator;
    }

    /**
     * Adds an error causer to this alert, and pushes the alert to networktables if it is not
     * already present.
     *
     * @param name The name of the error causer
     */
    public void addCause(String name) {
      causes.add(name);
      setText(textGenerator.apply(causes));
      set(true);
    }
  }
}
