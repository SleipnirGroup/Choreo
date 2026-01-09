import { invoke } from "@tauri-apps/api/core";
import {
  Trajectory
} from "../document/schema/DocumentTypes";

export const TRAJ_DATA_FILENAME = "ChoreoTraj";

export async function genTrajDataFile(
  trajectories: Trajectory[],
  packageName: string,
  isUsingChoreoLib: boolean
): Promise<string> {
  return await invoke<string>("gen_traj_data_file", {
    trajectories,
    packageName,
    isUsingChoreoLib
  });
}
