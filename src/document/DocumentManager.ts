import { createContext } from "react";
import StateStore, { IStateStore } from "./DocumentModel";
import { dialog, fs } from "@tauri-apps/api";
import { v4 as uuidv4 } from "uuid";
import { VERSIONS, validate } from "./DocumentSpecTypes";
import { applySnapshot, getRoot, onPatch } from "mobx-state-tree";
import { toJS } from "mobx";
import hotkeys from "hotkeys-js";

export class DocumentManager {
  simple: any;
  hasOpenDialog = false;
  undo() {
    this.model.document.history.canUndo && this.model.document.history.undo();
  }
  redo() {
    this.model.document.history.canRedo && this.model.document.history.redo();
  }
  get history() {
    console.log(toJS(this.model.document.history.history));
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
    hotkeys('ctrl+g,g', () => {
      this.model.generatePath(this.model.document.pathlist.activePathUUID);
    });
    hotkeys('ctrl+z', () => {
      this.undo();
    });
    hotkeys('ctrl+shift+z,ctrl+y', () => {
      this.redo();
    });
    hotkeys('ctrl+n', {keydown: true}, () => {this.newFile();});
    hotkeys('right,x', () => { // surely theres a better way to do this
      const waypoints = this.model.document.pathlist.activePath.waypoints;
      const selected = waypoints.find((w) => {
        return w.selected;
      });
      let i = waypoints.indexOf(selected??waypoints[0]);
      i++;
      if (i >= waypoints.length) { i = waypoints.length - 1 }
      this.model.select(waypoints[i]);
    });
    hotkeys('left,z', () => { // surely theres a better way to do this
      const waypoints = this.model.document.pathlist.activePath.waypoints;
      const selected = waypoints.find((w) => {
        return w.selected;
      });
      let i = waypoints.indexOf(selected??waypoints[0]);
      i--;
      if (i <= 0) { i = 0 }
      this.model.select(waypoints[i]);
    });
    // navbar keys
    for (let i = 0; i < 9; i ++) {
      hotkeys((i + 1).toString(), () => {
        this.model.uiState.setSelectedNavbarItem(i); 
      });
    }
    // set current waypoint type
    for (let i = 0; i < 4; i ++) {
      hotkeys('shift+' + (i + 1), () => {
        const selected = this.getSelectedWaypoint();
        selected?.setType(i);
      });
    }
    // nudge selected waypoint
    hotkeys('d,shift+d', () => {
      const selected = this.getSelectedWaypoint();
      if (selected !== undefined) {
        const delta = hotkeys.shift ? 0.5 : 0.1;
        selected.setX(selected.x + delta);
      }
    });
    hotkeys('a,shift+a', () => {
      const selected = this.getSelectedWaypoint();
      if (selected !== undefined) {
        const delta = hotkeys.shift ? 0.5 : 0.1;
        selected.setX(selected.x - delta);
      }
    });
    hotkeys('w,shift+w', () => {
      const selected = this.getSelectedWaypoint();
      if (selected !== undefined) {
        const delta = hotkeys.shift ? 0.5 : 0.1;
        selected.setY(selected.y + delta);
      }
    });
    hotkeys('s,shift+s', () => {
      const selected = this.getSelectedWaypoint();
      if (selected !== undefined) {
        const delta = hotkeys.shift ? 0.5 : 0.1;
        selected.setY(selected.y - delta);
      }
    });
    hotkeys('q,shift+q', () => {
      const selected = this.getSelectedWaypoint();
      if (selected !== undefined) {
        const delta = hotkeys.shift ? Math.PI / 4 : Math.PI / 16;
        let newHeading = (selected.heading + delta);
        if (newHeading > Math.PI) { newHeading = -Math.PI + newHeading % Math.PI }
        selected.setHeading(newHeading);
      }
    });
    hotkeys('e,shift+e', () => {
      const selected = this.getSelectedWaypoint();
      if (selected !== undefined) {
        const delta = hotkeys.shift ? Math.PI / 4 : Math.PI / 16;
        let newHeading = (selected.heading - delta);
        if (newHeading < -Math.PI) { newHeading = Math.PI - newHeading % Math.PI }
        selected.setHeading(newHeading);
      }
    });
    hotkeys('f', () => {
      const selected = this.getSelectedWaypoint();
      if (selected) {
        const newWaypoint = this.model.document.pathlist.activePath.addWaypoint();
        newWaypoint.setX(selected.x);
        newWaypoint.setY(selected.y);
        newWaypoint.setHeading(selected.heading);
        this.model.select(newWaypoint);
      }
    });
    hotkeys('del,delete,backspace,clear', () => {
      const selected = this.getSelectedWaypoint();
      if (selected) {
        this.model.document.pathlist.activePath.deleteWaypointUUID(selected.uuid);
      }
    })
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
        console.log(content);
        const parsed = JSON.parse(content);
        if (validate(parsed)) {
          this.model.fromSavedDocument(parsed);
        } else {
          console.error("Invalid Document JSON");
        }
      })
      .catch((err) => console.log(err));
  }

  async exportTrajectory(uuid: string) {
    const path = this.model.document.pathlist.paths.get(uuid);
    if (path === undefined) {
      console.error("Tried to export trajectory with unknown uuid: ", uuid);
      return;
    }
    const trajectory = path.getSavedTrajectory();
    if (trajectory === null) {
      console.error("Tried to export ungenerated trajectory: ", uuid);
      return;
    }
    const content = JSON.stringify(trajectory, undefined, 4);
    const filePath = await dialog.save({
      title: "Export Trajectory",
      defaultPath: `${path.name}.json`,
      filters: [
        {
          name: "Trajopt Trajectory",
          extensions: ["json"],
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
    if (!VERSIONS["v0.1"].validate(this.model.asSavedDocument())) {
      console.warn("Invalid Doc JSON:\n" + "\n" + content);
      return;
    }
    this.hasOpenDialog = true;
    const filePath = await dialog.save({
      title: "Save Document",
      filters: [
        {
          name: "Trajopt Document",
          extensions: ["json"],
        },
      ],
    });
    if (filePath) {
      await fs.writeTextFile(filePath, content);
    }
    this.hasOpenDialog = false;
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
