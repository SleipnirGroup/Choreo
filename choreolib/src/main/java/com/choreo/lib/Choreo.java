package com.choreo.lib;

import com.google.gson.Gson;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.Filesystem;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;

public class Choreo {
  private static final Gson gson = new Gson();

  /**
   * Load a trajectory from the deploy directory. Choreolib expects
   * .traj files to be placed in src/main/deploy/choreo.
   * @param trajName the path name in Choreo, which matches the file name in the 
   * deploy directory. Do not include ".traj" here.
   * @return the loaded trajectory.
   */ 
  public static ChoreoTrajectory getTrajectory(String trajName) {
    var traj_dir = new File(Filesystem.getDeployDirectory(), "choreo");
    var traj_file = new File(traj_dir, trajName);

    return loadFile(traj_file);
  }

  private static ChoreoTrajectory loadFile(File path) {
    try {
      var reader = new BufferedReader(new FileReader(path));
      ChoreoTrajectory traj = gson.fromJson(reader, ChoreoTrajectory.class);

      return traj;
    } catch (Exception ex) {
      DriverStation.reportError(ex.getMessage(), ex.getStackTrace());
    }
    return null;
  }
}
