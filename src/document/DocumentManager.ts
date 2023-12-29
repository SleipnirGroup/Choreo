import { createContext } from "react";
import StateStore, { IStateStore } from "./DocumentModel";
import {
  dialog,
  fs,
  invoke,
  path,
  window as tauriWindow,
} from "@tauri-apps/api";
import { listen, TauriEvent, Event } from "@tauri-apps/api/event";
import { v4 as uuidv4 } from "uuid";
import { VERSIONS, validate, SAVE_FILE_VERSION } from "./DocumentSpecTypes";
import { applySnapshot, getRoot, onPatch } from "mobx-state-tree";
import { autorun, reaction, toJS } from "mobx";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";
import hotkeys from "hotkeys-js";
import { resourceLimits } from "worker_threads";

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
        selectedSidebarItem: undefined,
        layers: [true, false, true, true],
      },
      document: {
        robotConfig: { identifier: uuidv4() },
        pathlist: {},
      },
    });
    this.model.document.pathlist.addPath("NewPath");
    this.model.document.history.clear();
    this.setupEventListeners();
    this.newFile();
    this.model.uiState.updateWindowTitle();
  }

  async handleOpenFileEvent(event: Event<unknown>) {
    let payload = event.payload as OpenFileEventPayload;
    if (payload.dir === undefined || payload.name === undefined) {
      throw "Non-UTF-8 characters in file path";
    } else if (payload.contents === undefined) {
      throw "Unable to read file";
    } else {
      this.model.uiState.setSaveFileName(payload.name);
      this.model.uiState.setSaveFileDir(payload.dir);
      this.model.uiState.setIsGradleProject(payload.adjacent_gradle);

      await this.openFromContents(payload.contents);
    }
  }

  async setupEventListeners() {
    const openFileUnlisten = await listen("open-file", async (event) =>
      this.handleOpenFileEvent(event).catch((err) =>
        toast.error("Opening file error: " + err)
      )
    );

    window.addEventListener("contextmenu", (e) => e.preventDefault());

    // Save files on closing
    tauriWindow
      .getCurrent()
      .listen(TauriEvent.WINDOW_CLOSE_REQUESTED, async () => {
        if (!this.model.uiState.hasSaveLocation) {
          if (
            await dialog.ask("Save project?", {
              title: "Choreo",
              type: "warning",
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
        let newHeading = selected.heading + delta;
        selected.setHeading(newHeading);
      }
    });
    hotkeys("e,shift+e", () => {
      const selected = this.getSelectedWaypoint();
      if (selected !== undefined) {
        const delta = hotkeys.shift ? -Math.PI / 4 : -Math.PI / 16;
        let newHeading = selected.heading + delta;
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
      const selected = this.getSelectedWaypoint();
      if (selected) {
        this.model.document.pathlist.activePath.deleteWaypointUUID(
          selected.uuid
        );
      }
    });
  }

  async generateAndExport(uuid: string) {
    await this.model!.generatePath(uuid);
    await this.exportTrajectory(uuid);
  }

  async generateWithToastsAndExport(uuid: string) {
    this.model!.generatePathWithToasts(uuid).then(() =>
      toast.promise(
        this.writeTrajectory(() => this.getTrajFilePath(uuid), uuid),
        {
          success: `Saved all trajectories to ${this.model.uiState.chorRelativeTrajDir}.`,
          error: {
            render(toastProps) {
              console.error(toastProps.data);
              return `Couldn't export trajectories: ${
                toastProps.data as string[]
              }`;
            },
          },
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

  newFile(): void {
    applySnapshot(this.model, {
      uiState: {
        selectedSidebarItem: undefined,
        layers: [true, false, true, true],
      },
      document: {
        robotConfig: { identifier: uuidv4() },
        pathlist: {},
      },
    });

    this.model.document.pathlist.addPath("NewPath");
    this.model.document.history.clear();
  }

  async openFromContents(chorContents: string) {
    const parsed = JSON.parse(chorContents);
    if (validate(parsed)) {
      this.model.fromSavedDocument(parsed);
    } else {
      console.error("Invalid Document JSON");
      toast.error(
        "Could not parse selected document (Is it a choreo document?)"
      );
    }
  }

  async renamePath(uuid: string, newName: string) {
    let oldPath = await this.getTrajFilePath(uuid);
    this.model.document.pathlist.paths.get(uuid)?.setName(newName);
    let newPath = await this.getTrajFilePath(uuid);
    if (oldPath !== null) {
      invoke("delete_file", { dir: oldPath[0], name: oldPath[1] })
        .then(() => this.writeTrajectory(() => newPath, uuid))
        .catch((e) => {});
    }
  }

  async deletePath(uuid: string) {
    let newPath = await this.getTrajFilePath(uuid).catch(() => null);
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
    const path = this.model.document.pathlist.paths.get(uuid);
    if (path === undefined) {
      throw `Tried to export trajectory with unknown uuid ${uuid}`;
    }
    const trajectory = path.generated;
    if (trajectory.length < 2) {
      throw `Path is not generated`;
    }
    const content = JSON.stringify({ samples: trajectory }, undefined, 4);
    var file = await filePath();
    if (file) {
      await invoke("save_file", {
        dir: file[0],
        name: file[1],
        contents: content,
      });
    }
  }

  async getTrajFilePath(uuid: string): Promise<[string, string]> {
    const choreoPath = this.model.document.pathlist.paths.get(uuid);
    if (choreoPath === undefined) {
      throw `Trajectory has unknown uuid ${uuid}`;
    }
    const { hasSaveLocation, chorRelativeTrajDir } = this.model.uiState;
    if (!hasSaveLocation || chorRelativeTrajDir === undefined) {
      throw `Project has not been saved yet`;
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
        var file = await dialog.save({
          title: "Export Trajectory",
          defaultPath: filepath.join(path.sep),
          filters: [
            {
              name: "Trajopt Trajectory",
              extensions: ["traj"],
            },
          ],
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
    let dir = this.model.uiState.saveFileDir;
    let name = this.model.uiState.saveFileName;
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
          extensions: ["chor"],
        },
      ],
    });
    if (filePath === null) {
      return false;
    }
    let dir = await path.dirname(filePath);
    let name = await path.basename(filePath);
    let newIsGradleProject = await this.saveFileAs(dir, name);
    this.model.uiState.setSaveFileDir(dir);
    this.model.uiState.setSaveFileName(name);

    toast.promise(this.handleChangeIsGradleProject(newIsGradleProject), {
      success: `Saved all trajectories to ${this.model.uiState.chorRelativeTrajDir}.`,
      error: {
        render(toastProps) {
          console.error(toastProps.data);
          return `Couldn't export trajectories: ${toastProps.data as string[]}`;
        },
      },
    });

    toast.success(`Saved ${name}. Future changes will now be auto-saved.`);
    return true;
  }

  private async handleChangeIsGradleProject(
    newIsGradleProject: boolean | undefined
  ) {
    let prevIsGradleProject = this.model.uiState.isGradleProject;
    if (newIsGradleProject !== undefined) {
      if (newIsGradleProject !== prevIsGradleProject) {
        this.model.uiState.setIsGradleProject(newIsGradleProject);
      }

      await this.exportAllTrajectories();
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
      let adjacent_build_gradle = invoke<boolean>("contains_build_gradle", {
        dir,
        name,
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
      var promises = this.model.document.pathlist.pathUUIDs.map((uuid) =>
        this.writeTrajectory(() => this.getTrajFilePath(uuid), uuid)
      );
      var pathNames = this.model.document.pathlist.pathNames;
      Promise.allSettled(promises).then((results) => {
        var errors: string[] = [];

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
}
let DocumentManagerContext = createContext(new DocumentManager());
export default DocumentManagerContext;
