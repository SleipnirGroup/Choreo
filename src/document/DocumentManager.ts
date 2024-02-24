import { createContext } from "react";
import StateStore, { IStateStore } from "./DocumentModel";
import { dialog, invoke, path, window as tauriWindow } from "@tauri-apps/api";
import { listen, TauriEvent, Event } from "@tauri-apps/api/event";
import { v4 as uuidv4 } from "uuid";
import { validate } from "./DocumentSpecTypes";
import { applySnapshot, getSnapshot } from "mobx-state-tree";
import { reaction } from "mobx";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";
import hotkeys from "hotkeys-js";
import { ViewLayerDefaults } from "./UIStateStore";

type OpenFileEventPayload = {
  adjacent_gradle: boolean;
  name: string | undefined;
  dir: string | undefined;
  contents: string;
};
export class DocumentManager {
  simple: any;
  undo() {
    this.model.document.history.canUndo && this.model.document.history.undo();
  }
  redo() {
    this.model.document.history.canRedo && this.model.document.history.redo();
  }
  get history() {
    return this.model.document.history;
  }
  model: IStateStore;
  constructor() {
    this.model = StateStore.create({
      uiState: {
        settingsTab: 0,
        selectedSidebarItem: undefined,
        layers: ViewLayerDefaults
      },
      document: {
        robotConfig: { identifier: uuidv4() },
        pathlist: {},
        splitTrajectoriesAtStopPoints: false,
        usesObstacles: false
      }
    });
    this.model.document.pathlist.addPath("NewPath");
    this.model.document.history.clear();
    this.setupEventListeners();
    this.newFile();
    this.model.uiState.updateWindowTitle();
  }

  async handleOpenFileEvent(event: Event<unknown>) {
    const payload = event.payload as OpenFileEventPayload;
    if (payload.dir === undefined || payload.name === undefined) {
      throw "Non-UTF-8 characters in file path";
    } else if (payload.contents === undefined) {
      throw "Unable to read file";
    } else {
      const oldDocument = getSnapshot(this.model.document);
      const oldUIState = getSnapshot(this.model.uiState);
      const saveName = payload.name;
      const saveDir = payload.dir;
      const adjacent_gradle = payload.adjacent_gradle;
      this.model.uiState.setSaveFileName(undefined);
      this.model.uiState.setSaveFileDir(undefined);
      this.model.uiState.setIsGradleProject(undefined);
      await this.openFromContents(payload.contents)
        .catch((err) => {
          applySnapshot(this.model.document, oldDocument);
          applySnapshot(this.model.uiState, oldUIState);
          throw `Internal parsing error: ${err}`;
        })
        .then(() => {
          this.model.uiState.setSaveFileName(saveName);
          this.model.uiState.setSaveFileDir(saveDir);
          this.model.uiState.setIsGradleProject(adjacent_gradle);
        })
        .then(() => this.exportAllTrajectories());
    }
  }

  async setupEventListeners() {
    const openFileUnlisten = await listen("open-file", async (event) =>
      this.handleOpenFileEvent(event).catch((err) =>
        toast.error("Opening file error: " + err)
      )
    );

    window.addEventListener("contextmenu", (e) => e.preventDefault());
    window.addEventListener("copy", (e) => {
      const selection = document.getSelection();
      // Sometimes clicking away from a text input with selection retains that input element as
      // document.getSelection()'s focusNode, but sets the actual selection range to ''
      if (selection?.focusNode === null || selection?.toString() === "") {
        if (this.model.uiState.isSidebarWaypointSelected) {
          this.model.uiState.selectedSidebarItem.copyToClipboard(e);
        }
        e.preventDefault();
      }
    });

    window.addEventListener("paste", (e) => {
      const evt = e as ClipboardEvent;
      const content = evt.clipboardData?.getData("text/plain");
      if (content === undefined) {
        return;
      }
      const activePath = this.model.document.pathlist.activePath;
      const pathSnapshot = getSnapshot(activePath);
      try {
        const savedObject = JSON.parse(content);
        if (!Object.hasOwn(savedObject, "dataType")) return;
        if (savedObject.dataType === "choreo/waypoint") {
          let currentSelectedWaypointIdx = -1;
          if (this.model.uiState.isSidebarWaypointSelected) {
            const idx = activePath.findUUIDIndex(
              this.model.uiState.selectedSidebarItem.uuid
            );
            if (idx != -1) {
              currentSelectedWaypointIdx = idx;
            }
          }
          this.model.document.history.startGroup(() => {
            const newWaypoint =
              this.model.document.pathlist.activePath.addWaypoint();
            newWaypoint.fromSavedWaypoint(savedObject);
            if (currentSelectedWaypointIdx != -1) {
              activePath.reorder(
                activePath.waypoints.length - 1,
                currentSelectedWaypointIdx + 1
              );
            }

            this.model.document.history.stopGroup();
          });
        }
      } catch (err) {
        console.error("Error when pasting:", err);
        applySnapshot(activePath, pathSnapshot);
      }
    });

    // Save files on closing
    tauriWindow
      .getCurrent()
      .listen(TauriEvent.WINDOW_CLOSE_REQUESTED, async () => {
        if (!this.model.uiState.hasSaveLocation) {
          if (
            await dialog.ask("Save project?", {
              title: "Choreo",
              type: "warning"
            })
          ) {
            if (!(await this.saveFileDialog())) {
              return;
            }
          }
        }
        await tauriWindow.getCurrent().close();
      })
      .then((unlisten) => {
        window.addEventListener("unload", () => {
          unlisten();
        });
      });
    const autoSaveUnlisten = reaction(
      () => this.model.document.history.undoIdx,
      () => {
        if (this.model.uiState.hasSaveLocation) {
          console.log("autosave");
          this.saveFile();
        }
      }
    );
    const updateTitleUnlisten = reaction(
      () => this.model.uiState.saveFileName,
      () => {
        this.model.uiState.updateWindowTitle();
      }
    );
    window.addEventListener("unload", () => {
      hotkeys.unbind();
      openFileUnlisten();
      autoSaveUnlisten();
      updateTitleUnlisten();
    });
    hotkeys.unbind();
    hotkeys("f5,ctrl+shift+r,ctrl+r", function (event, handler) {
      event.preventDefault();
    });
    hotkeys("command+g,ctrl+g,g", () => {
      if (!this.model.document.pathlist.activePath.generating) {
        this.generateWithToastsAndExport(
          this.model.document.pathlist.activePathUUID
        );
      }
    });
    hotkeys("command+z,ctrl+z", () => {
      this.undo();
    });
    hotkeys("command+shift+z,ctrl+shift+z,ctrl+y", () => {
      this.redo();
    });
    hotkeys("command+n,ctrl+n", { keydown: true }, () => {
      this.newFile();
    });
    hotkeys("right,x", () => {
      const waypoints = this.model.document.pathlist.activePath.waypoints;
      const selected = waypoints.find((w) => {
        return w.selected;
      });
      let i = waypoints.indexOf(selected ?? waypoints[0]);
      i++;
      if (i >= waypoints.length) {
        i = waypoints.length - 1;
      }
      this.model.select(waypoints[i]);
    });
    hotkeys("left,z", () => {
      const waypoints = this.model.document.pathlist.activePath.waypoints;
      const selected = waypoints.find((w) => {
        return w.selected;
      });
      let i = waypoints.indexOf(selected ?? waypoints[0]);
      i--;
      if (i <= 0) {
        i = 0;
      }
      this.model.select(waypoints[i]);
    });
    // navbar keys
    for (let i = 0; i < 9; i++) {
      hotkeys((i + 1).toString(), () => {
        this.model.uiState.setSelectedNavbarItem(i);
      });
    }
    hotkeys("0", () => {
      this.model.uiState.setSelectedNavbarItem(9);
    });
    hotkeys("-", () => this.model.uiState.setSelectedNavbarItem(10));
    // set current waypoint type
    for (let i = 0; i < 4; i++) {
      hotkeys("shift+" + (i + 1), () => {
        const selected = this.getSelectedWaypoint();
        selected?.setType(i);
      });
    }
    // nudge selected waypoint
    hotkeys("d,shift+d", () => {
      const selected = this.getSelectedWaypoint();
      if (selected !== undefined) {
        const delta = hotkeys.shift ? 0.5 : 0.1;
        selected.setX(selected.x + delta);
      }
    });
    hotkeys("a,shift+a", () => {
      const selected = this.getSelectedWaypoint();
      if (selected !== undefined) {
        const delta = hotkeys.shift ? 0.5 : 0.1;
        selected.setX(selected.x - delta);
      }
    });
    hotkeys("w,shift+w", () => {
      const selected = this.getSelectedWaypoint();
      if (selected !== undefined) {
        const delta = hotkeys.shift ? 0.5 : 0.1;
        selected.setY(selected.y + delta);
      }
    });
    hotkeys("s,shift+s", () => {
      const selected = this.getSelectedWaypoint();
      if (selected !== undefined) {
        const delta = hotkeys.shift ? 0.5 : 0.1;
        selected.setY(selected.y - delta);
      }
    });
    hotkeys("q,shift+q", () => {
      const selected = this.getSelectedWaypoint();
      if (selected !== undefined) {
        const delta = hotkeys.shift ? Math.PI / 4 : Math.PI / 16;
        const newHeading = selected.heading + delta;
        selected.setHeading(newHeading);
      }
    });
    hotkeys("e,shift+e", () => {
      const selected = this.getSelectedWaypoint();
      if (selected !== undefined) {
        const delta = hotkeys.shift ? -Math.PI / 4 : -Math.PI / 16;
        const newHeading = selected.heading + delta;
        selected.setHeading(newHeading);
      }
    });
    hotkeys("f", () => {
      const selected = this.getSelectedWaypoint();
      if (selected) {
        const newWaypoint =
          this.model.document.pathlist.activePath.addWaypoint();
        newWaypoint.setX(selected.x);
        newWaypoint.setY(selected.y);
        newWaypoint.setHeading(selected.heading);
        this.model.select(newWaypoint);
      } else {
        const newWaypoint =
          this.model.document.pathlist.activePath.addWaypoint();
        newWaypoint.setX(5);
        newWaypoint.setY(5);
        newWaypoint.setHeading(0);
        this.model.select(newWaypoint);
      }
    });
    hotkeys("delete,backspace,clear", () => {
      const selectedWaypoint = this.getSelectedWaypoint();
      if (selectedWaypoint) {
        this.model.document.pathlist.activePath.deleteWaypointUUID(
          selectedWaypoint.uuid
        );
      }
      const selectedConstraint = this.getSelecteConstraint();
      if (selectedConstraint) {
        this.model.document.pathlist.activePath.deleteConstraintUUID(
          selectedConstraint.uuid
        );
      }
      const selectedObstacle = this.getSelectedObstacle();
      if (selectedObstacle) {
        this.model.document.pathlist.activePath.deleteObstacleUUID(
          selectedObstacle.uuid
        );
      }
    });
  }

  async generateAndExport(uuid: string) {
    await this.model!.generatePath(uuid);
    await this.exportTrajectory(uuid);
  }

  async generateWithToastsAndExport(uuid: string) {
    const pathName = this.model.document.pathlist.paths.get(uuid)?.name;
    this.model!.generatePathWithToasts(uuid).then(() =>
      toast.promise(
        this.writeTrajectory(() => this.getTrajFilePath(uuid), uuid),
        {
          success: `Saved "${pathName}" to ${this.model.uiState.chorRelativeTrajDir}.`,
          error: {
            render(toastProps) {
              console.error(toastProps.data);
              return `Couldn't export trajectory: ${
                toastProps.data as string[]
              }`;
            }
          }
        }
      )
    );
  }

  private getSelectedWaypoint() {
    const waypoints = this.model.document.pathlist.activePath.waypoints;
    return waypoints.find((w) => {
      return w.selected;
    });
  }
  private getSelecteConstraint() {
    const constraints = this.model.document.pathlist.activePath.constraints;
    return constraints.find((c) => {
      return c.selected;
    });
  }

  private getSelectedObstacle() {
    const obstacles = this.model.document.pathlist.activePath.obstacles;
    return obstacles.find((o) => {
      return o.selected;
    });
  }
  newFile(): void {
    applySnapshot(this.model, {
      uiState: {
        settingsTab: 0,
        selectedSidebarItem: undefined,
        layers: ViewLayerDefaults
      },
      document: {
        robotConfig: { identifier: uuidv4() },
        pathlist: {},
        splitTrajectoriesAtStopPoints: false,
        usesObstacles: false
      }
    });
    this.model.document.pathlist.addPath("NewPath");
    this.model.document.history.clear();
  }

  async openFromContents(chorContents: string) {
    const parsed = JSON.parse(chorContents);
    const validationError = validate(parsed);
    if (validationError.length == 0) {
      this.model.fromSavedDocument(parsed);
    } else {
      throw `Invalid Document JSON: ${validationError}`;
    }
  }

  async renamePath(uuid: string, newName: string) {
    if (this.model.uiState.hasSaveLocation) {
      const oldPath = await this.getTrajFilePath(uuid);
      const oldName = this.model.document.pathlist.paths.get(uuid)?.name;
      this.model.document.pathlist.paths.get(uuid)?.setName(newName);
      const newPath = await this.getTrajFilePath(uuid);
      if (oldPath !== null) {
        Promise.all([
          invoke("delete_file", { dir: oldPath[0], name: oldPath[1] }),
          invoke("delete_traj_segments", {
            dir: oldPath[0],
            trajName: oldName
          })
        ])
          .then(() => this.writeTrajectory(() => newPath, uuid))
          .catch((e) => {
            console.error(e);
          });
      }
    } else {
      this.model.document.pathlist.paths.get(uuid)?.setName(newName);
    }
  }

  async deletePath(uuid: string) {
    const newPath = await this.getTrajFilePath(uuid).catch(() => null);
    this.model.document.pathlist.deletePath(uuid);
    if (newPath !== null && this.model.uiState.hasSaveLocation) {
      invoke("delete_file", { dir: newPath[0], name: newPath[1] });
      this.writeTrajectory(() => newPath, uuid);
    }
  }

  /**
   * Save the specified trajectory to the file path supplied by the given async function
   * @param filePath An (optionally async) function returning a 2-string array of [dir, name], or null
   * @param uuid the UUID of the path with the trajectory to export
   */
  async writeTrajectory(
    filePath: () => Promise<[string, string] | null> | [string, string] | null,
    uuid: string
  ) {
    // Avoid conflicts with tauri path namespace
    const chorPath = this.model.document.pathlist.paths.get(uuid);
    if (chorPath === undefined) {
      throw `Tried to export trajectory with unknown uuid ${uuid}`;
    }
    const trajectory = chorPath.generated;
    if (trajectory.length < 2) {
      throw "Path is not generated";
    }
    const file = await filePath();
    console.log("file: " + file);

    const content = JSON.stringify({ samples: trajectory }, undefined, 4);
    if (file) {
      await invoke("save_file", {
        dir: file[0],
        name: file[1],
        contents: content
      });
      // "Split" naming scheme for consistency when path splitting is turned on/off
      if (
        !this.model.document.splitTrajectoriesAtStopPoints ||
        chorPath.stopPointIndices().length >= 2
      ) {
        await invoke("save_file", {
          dir: file[0],
          name: file[1].replace(".", ".1."),
          contents: content
        });
      }
    }

    if (
      this.model.document.splitTrajectoriesAtStopPoints &&
      file !== null &&
      chorPath.stopPointIndices().length >= 2
    ) {
      const split = chorPath.stopPointIndices();
      for (let i = 1; i < split.length; i++) {
        const prev = split[i - 1];
        let cur = split[i];
        // If we don't go to the end of trajectory, add 1 to include the end stop point
        if (cur !== undefined) {
          cur += 1;
        }
        const traj = trajectory.slice(prev, cur).map((s) => {
          return { ...s };
        });
        if (traj === undefined) {
          throw `Could not split segment from ${prev} to ${cur} given ${trajectory.length} samples`;
        }
        if (traj.length === 0) {
          continue;
        }
        const start = traj[0].timestamp;
        for (let i = 0; i < traj.length; i++) {
          const e = traj[i];
          e.timestamp -= start;
        }

        const content = JSON.stringify({ samples: traj }, undefined, 4);
        const name = file[1].replace(".", "." + i.toString() + ".");
        await invoke("save_file", {
          dir: file[0],
          name: name,
          contents: content
        });
      }
    }
  }

  async getTrajFilePath(uuid: string): Promise<[string, string]> {
    const choreoPath = this.model.document.pathlist.paths.get(uuid);
    if (choreoPath === undefined) {
      throw `Trajectory has unknown uuid ${uuid}`;
    }
    const { hasSaveLocation, chorRelativeTrajDir } = this.model.uiState;
    if (!hasSaveLocation || chorRelativeTrajDir === undefined) {
      throw "Project has not been saved yet";
    }
    const dir =
      this.model.uiState.saveFileDir +
      path.sep +
      this.model.uiState.chorRelativeTrajDir;
    return [dir, `${choreoPath.name}.traj`];
  }

  async exportTrajectory(uuid: string) {
    return await this.writeTrajectory(() => {
      return this.getTrajFilePath(uuid).then(async (filepath) => {
        const file = await dialog.save({
          title: "Export Trajectory",
          defaultPath: filepath.join(path.sep),
          filters: [
            {
              name: "Trajopt Trajectory",
              extensions: ["traj"]
            }
          ]
        });
        if (file == null) {
          throw "No file selected or user cancelled";
        }
        return [await path.dirname(file), await path.basename(file)];
      });
    }, uuid);
  }

  async exportActiveTrajectory() {
    return await this.exportTrajectory(
      this.model.document.pathlist.activePathUUID
    );
  }

  async saveFile() {
    const dir = this.model.uiState.saveFileDir;
    const name = this.model.uiState.saveFileName;
    // we could use hasSaveLocation but TS wouldn't know
    // that dir and name aren't undefined below
    if (dir === undefined || name === undefined) {
      return await this.saveFileDialog();
    } else {
      this.handleChangeIsGradleProject(await this.saveFileAs(dir, name));
    }
    return true;
  }

  async saveFileDialog() {
    const filePath = await dialog.save({
      title: "Save Document",
      filters: [
        {
          name: "Choreo Document",
          extensions: ["chor"]
        }
      ]
    });
    if (filePath === null) {
      return false;
    }
    const dir = await path.dirname(filePath);
    let name = await path.basename(filePath);
    if (!name.endsWith(".chor")) {
      name = name + ".chor";
    }
    const newIsGradleProject = await this.saveFileAs(dir, name);
    this.model.uiState.setSaveFileDir(dir);
    this.model.uiState.setSaveFileName(name);

    toast.promise(this.handleChangeIsGradleProject(newIsGradleProject), {
      success: `Saved all trajectories to ${this.model.uiState.chorRelativeTrajDir}.`,
      error: {
        render(toastProps) {
          console.error(toastProps.data);
          return `Couldn't export trajectories: ${toastProps.data as string[]}`;
        }
      }
    });

    toast.success(`Saved ${name}. Future changes will now be auto-saved.`);
    return true;
  }

  private async handleChangeIsGradleProject(
    newIsGradleProject: boolean | undefined
  ) {
    const prevIsGradleProject = this.model.uiState.isGradleProject;
    if (newIsGradleProject !== undefined) {
      if (newIsGradleProject !== prevIsGradleProject) {
        this.model.uiState.setIsGradleProject(newIsGradleProject);
        await this.exportAllTrajectories();
      }
    }
  }

  /**
   * Save the document as `dir/name`.
   * @param dir The absolute path to the directory that will contain the saved file
   * @param name The saved file, name only, including the extension ".chor"
   * @returns Whether the dir contains a file named "build.gradle", or undefined
   * if something failed
   */
  async saveFileAs(dir: string, name: string): Promise<boolean | undefined> {
    const contents = JSON.stringify(this.model.asSavedDocument(), undefined, 4);
    try {
      invoke("save_file", { dir, name, contents });
      // if we get past the above line, the dir and name were valid for saving.
      const adjacent_build_gradle = invoke<boolean>("contains_build_gradle", {
        dir,
        name
      });
      return adjacent_build_gradle;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  /**
   * Export all trajectories to the deploy directory, as determined by uiState.isGradleProject
   */
  async exportAllTrajectories() {
    if (this.model.uiState.hasSaveLocation) {
      const promises = this.model.document.pathlist.pathUUIDs.map((uuid) =>
        this.writeTrajectory(() => this.getTrajFilePath(uuid), uuid)
      );
      const pathNames = this.model.document.pathlist.pathNames;
      Promise.allSettled(promises).then((results) => {
        const errors: string[] = [];

        results.map((result, i) => {
          if (result.status === "rejected") {
            console.error(pathNames[i], ":", result.reason);
            errors.push(`Couldn't save "${pathNames[i]}": ${result.reason}`);
          }
        });

        if (errors.length != 0) {
          throw errors;
        }
      });
    }
  }

  async clearAllTrajectories() {
    if (
      this.model.uiState.hasSaveLocation &&
      this.model.uiState.chorRelativeTrajDir !== undefined
    ) {
      invoke("delete_dir", {
        dir:
          this.model.uiState.saveFileDir +
          path.sep +
          this.model.uiState.chorRelativeTrajDir
      });
    }
  }
}

const DocumentManagerContext = createContext(new DocumentManager());
export default DocumentManagerContext;
