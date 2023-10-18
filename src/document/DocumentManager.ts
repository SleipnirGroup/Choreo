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
  hasOpened = false;
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
    hotkeys('ctrl+g', () => {
      this.model.generatePath(this.model.document.pathlist.activePathUUID);
    });
    hotkeys('ctrl+z', () => {
      this.undo();
    });
    hotkeys('ctrl+shift+z,ctrl+y', () => {
      this.redo();
    });
    hotkeys('ctrl+n', {keydown: true}, () => {this.newFile();});
    hotkeys('ctrl+s', {keydown: true}, () => {this.saveFile();});
    // Broken rn
    hotkeys('ctrl+o', {keydown: true}, (event) => {
      console.log(event);
      if (!this.hasOpened) {
        this.hasOpened = true;
        console.log("doc open hotkey");
        dialog.open({
          title: "Open Document",
          filters: [
            {
              name: "Trajopt Document",
              extensions: ["json"],
            },
          ],
        }).then(async (name) => {
          console.log(name);
          if (name){
            console.log(await fs.readTextFile(name));
            const file = new File([], name);
            console.log(file.toString);
            await this.onFileUpload(file);
          }
        }).finally(() => {this.hasOpened = false});
      }
    });
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
