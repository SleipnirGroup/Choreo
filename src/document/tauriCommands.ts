import { invoke } from "@tauri-apps/api";
import { Expr, Project, RobotConfig, Traj } from "./2025/DocumentTypes";
import { OpenFilePayload } from "./DocumentManager";

export const Commands = {
  guessIntervals: (config: RobotConfig<Expr>, traj: Traj) =>
    invoke<number[]>("guess_control_interval_counts", { config, traj }),

  /**
   * Generates a `Traj` using the specified `Project` and `Traj`.
   *
   * @param project The `Project` to use for generation.
   * @param traj The `Traj` to use for generation.
   * @param handle The handle of the generator to use.
   *
   * @returns The generated `Traj`.
   */
  generate: (project: Project, traj: Traj, handle: number) =>
    invoke<Traj>("generate_remote", { project, traj, handle }),

  /**
   * Cancels all of the generators that are currently running.
   *
   * @returns `void`
   */
  cancelAll: () => invoke<void>("cancel_all_remote_generators"),

  /**
   * Cancels the generator with the specified handle.
   *
   * @param handle The handle of the generator to cancel.
   * @returns `void`
   */
  cancel: (handle: number) =>
    invoke<void>("cancel_remote_generator", { handle }),

  /**
   * Opens the specified directory in the system's file explorer.
   *
   * @param path The path of the directory to open.
   * @returns `void`
   */
  openInExplorer: (path: string) => invoke<void>("open_in_explorer", { path }),
  /**
   * Opens a file dialog for the user to select a file to open, only permits `.chor` files.
   *
   * @returns The path of the file that the user selected, or `null` if the user canceled the dialog.
   */
  openProjectDialog: () => invoke<OpenFilePayload>("open_project_dialog"),

  /**
   * Sets an application-wide directory path that will be used as the root for all file operations.
   *
   * @param dir The directory path to set as the root.
   * @returns `void`
   */
  setDeployRoot: (dir: string) => invoke<void>("set_deploy_root", { dir }),
  /**
   * Gets the application-wide directory path that is used as the root for all file operations.
   *
   * @returns The directory path that is set as the root.
   */
  getDeployRoot: () => invoke<string>("get_deploy_root"),

  /**
   * @returns The default `Project` that is loaded when a new `Project` is created.
   */
  defaultProject: () => invoke<Project>("default_project"),
  /**
   * Reads the `Project` with the specified name from the deploy root directory.
   *
   * @param name The name of the `Project` to read without the `.chor` extension.
   * @returns The `Project` that was read.
   */
  readProject: (name: string) => invoke<Project>("read_project", { name }),
  /**
   * Writes the specified `Project` to the deploy root directory.
   *
   * @param project The `Project` to write.
   * @returns `void`
   */
  writeProject: (project: Project) =>
    invoke<void>("write_project", { project }),

  /**
   * Reads the `Traj` with the specified name from the deploy root directory.
   *
   * @param name The name of the `Traj` to read without the `.traj` extension.
   * @returns The `Traj` that was read.
   */
  readTraj: (name: string) => invoke<Traj>("read_traj", { name }),
  /**
   * Scans the deploy root directory for all of the `Traj` files and returns them.
   *
   * @returns All of the `Traj` files in the deploy root directory.
   */
  readAllTraj: () => invoke<Traj[]>("read_all_traj"),
  /**
   * Writes the specified `Traj` to the deploy root directory.
   *
   * @param traj The `Traj` to write.
   * @returns `void`
   */
  writeTraj: (traj: Traj) => invoke("write_traj", { traj }),
  /**
   * Renames the specified `Traj` to the specified name.
   *
   * @param oldTraj The `Traj` to rename.
   * @param newName The new name for the `Traj`.
   * @returns `void`
   */
  renameTraj: (oldTraj: Traj, newName: string) =>
    invoke<void>("rename_traj", { oldTraj, newName }),
  /**
   * Deletes the specified `Traj` from the deploy root directory.
   *
   * @param traj The `Traj` to delete.
   * @returns `void`
   */
  deleteTraj: (traj: Traj) => invoke<void>("delete_traj", { traj }),

  /**
   * If the application was opened via CLI and a file was specified, this will return the path of that file.
   *
   * @returns The path of the file that was opened via CLI, or `null` if no file was specified.
   */
  requestedProject: () => invoke<OpenFilePayload | null>("requested_file"),

  /**
   * Opens the platforms file explorer to the directory holding a newly generated diagnostic zip file.
   */
  openDiagnosticZip: (project: Project, trajs: Traj[]) =>
    invoke<void>("open_diagnostic_file", { project, trajs })
};
