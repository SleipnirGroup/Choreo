import { createContext } from "react";
import StateStore, { IStateStore } from "./DocumentModel";
import { dialog, fs } from "@tauri-apps/api";
import { v4 as uuidv4 } from "uuid";
import { VERSIONS, validate, SAVE_FILE_VERSION } from "./DocumentSpecTypes";
import { applySnapshot, getRoot, onPatch } from "mobx-state-tree";
import { toJS } from "mobx";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";
import hotkeys from "hotkeys-js";

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
        layers: [true, false, true, true, true],
      },
      document: {
        robotConfig: { identifier: uuidv4() },
        pathlist: {},
      },
    });
    this.model.document.pathlist.addPath("NewPath");
    this.model.document.history.clear();
    window.addEventListener("contextmenu", (e) => e.preventDefault());
    window.addEventListener("unload", () => hotkeys.unbind());
    hotkeys("f5,ctrl+shift+r,ctrl+r", function (event, handler) {
      event.preventDefault();
    });
    hotkeys("command+g,ctrl+g,g", () => {
      this.model.generatePathWithToasts(
        this.model.document.pathlist.activePathUUID
      );
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
    hotkeys("0", () => {this.model.uiState.setSelectedNavbarItem(9)});
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
  async parseFile(file: File | null): Promise<string> {
    if (file == null) {
      return Promise.reject("Tried to upload a null file");
    }
    this.model.uiState.setSaveFileName(file.name);
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.onload = (event) => {
        let output = event.target!.result;
        if (typeof output === "string") {
          resolve(output);
        }
        reject("File did not read as string");
      };
      fileReader.onerror = (error) => reject(error);
      fileReader.readAsText(file);
    });
  }
  async onFileUpload(file: File | null) {
    await this.parseFile(file)
      .then((content) => {
        const parsed = JSON.parse(content);
        if (validate(parsed)) {
          this.model.fromSavedDocument(parsed);
        } else {
          console.error("Invalid Document JSON");
          toast.error(
            "Could not parse selected document (Is it a choreo document?)",
            {
              containerId: "MENU",
            }
          );
        }
      })
      .catch((err) => {
        console.log(err);
        toast.error("File load error: " + err, {
          containerId: "MENU",
        });
      });
  }

  async exportTrajectory(uuid: string) {
    const path = this.model.document.pathlist.paths.get(uuid);
    if (path === undefined) {
      console.error("Tried to export trajectory with unknown uuid: ", uuid);
      toast.error("Tried to export trajectory with unknown uuid", {
        autoClose: 5000,
        hideProgressBar: false,
        containerId: "MENU",
      });
      return;
    }
    const trajectory = path.generated;
    if (trajectory.length < 2) {
      console.error("Tried to export ungenerated trajectory: ", uuid);
      toast.error("Cannot export ungenerated trajectory", {
        autoClose: 5000,
        hideProgressBar: false,
        containerId: "MENU",
      });
      return;
    }
    const content = JSON.stringify({ samples: trajectory }, undefined, 4);
    const filePath = await dialog.save({
      title: "Export Trajectory",
      defaultPath: `${path.name}.traj`,
      filters: [
        {
          name: "Trajopt Trajectory",
          extensions: ["traj"],
        },
      ],
    });
    if (filePath) {
      await fs.writeTextFile(filePath, content);
    }
  }
  async exportActiveTrajectory() {
    return await this.exportTrajectory(
      this.model.document.pathlist.activePathUUID
    );
  }

  async loadFile(jsonFilename: string) {
    await fetch(jsonFilename, { cache: "no-store" })
      .then((res) => {
        return res.json();
      })
      .then((data) => {
        this.model.fromSavedDocument(data);
      })
      .catch((err) => console.log(err));
  }

  async saveFile() {
    const content = JSON.stringify(this.model.asSavedDocument(), undefined, 4);
    if (!VERSIONS[SAVE_FILE_VERSION].validate(this.model.asSavedDocument())) {
      console.warn("Invalid Doc JSON:\n" + "\n" + content);
      return;
    }
    const filePath = await dialog.save({
      title: "Save Document",
      filters: [
        {
          name: "Trajopt Document",
          extensions: ["chor"],
        },
      ],
    });
    if (filePath) {
      await fs.writeTextFile(filePath, content);
    }
  }

  async downloadJSONString(content: string, name: string) {
    const element = document.createElement("a");
    const file = new Blob([content], { type: "application/json" });
    let link = URL.createObjectURL(file);
    //window.open(link, '_blank');
    //Uncomment to "save as..." the file
    element.href = link;
    element.download = name;
    element.click();
  }
}
let DocumentManagerContext = createContext(new DocumentManager());
export default DocumentManagerContext;
