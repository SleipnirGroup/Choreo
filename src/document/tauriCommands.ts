import { invoke } from "@tauri-apps/api";
import { Expr, Project, RobotConfig, Traj } from "./2025/DocumentTypes";

export const Commands = {
  generate: (chor: Project, traj: Traj, handle: number) =>
    invoke<Traj>("generate", { chor, traj, handle }),
  guessIntervals: (config: RobotConfig<Expr>, traj: Traj) =>
    invoke<number[]>("cmd_guess_control_interval_counts", { config, traj }),
  cancel: () => invoke<void>("cancel"),
  deleteFile: (dir: string, name: string) =>
    invoke<void>("delete_file", { dir, name }),
  deleteDir: (dir: string) => invoke<void>("delete_dir", { dir }),
  openInExplorer: (path: string) => invoke<void>("open_file_app", { path }),
  newFile: () => invoke<Project>("new_file"),
  openChor: (dir: string, name: string) =>
    invoke<Project>("open_chor", { path: [dir, name] }),
  openTraj: (dir: string, name: string) =>
    invoke<Traj>("open_traj", { path: [dir, name] }),
  writeChor: (chor: Project) => invoke<void>("write_chor", { chor }),
  writeTraj: (file: string, traj: Traj) => invoke("write_traj", { file, traj }),
  findAllTraj: (dir: string) => invoke<string[]>("find_all_traj", { dir }),
  openFileDialog: () => invoke<[string, string]>("open_file_dialog"),
  setChorPath: (dir: string, name: string) =>
    invoke<void>("set_chor_path", { dir, name })
};
