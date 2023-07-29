import { Instance, types } from "mobx-state-tree";
import { createContext } from "react";
import DocumentModelStore, { IDocumentModelStore } from "./DocumentModel";
import {
  HolonomicWaypointStore,
  IHolonomicWaypointStore,
} from "./HolonomicWaypointStore";
import { RobotConfigStore, IRobotConfigStore } from "./RobotConfigStore";
import { PathListStore } from "./PathListStore";
import { UIStateStore } from "./UIStateStore";
import { dialog, fs } from "@tauri-apps/api";
import { v4 as uuidv4 } from "uuid";

export class DocumentManager {
  simple: any;
  model: IDocumentModelStore;
  constructor() {
    this.model = DocumentModelStore.create({
      uiState: UIStateStore.create({
        selectedSidebarItem: undefined,
        layers: [true, false, true, true],
      }),
      robotConfig: RobotConfigStore.create({ identifier: uuidv4() }),
      pathlist: PathListStore.create(),
    });
    this.model.pathlist.addPath("NewPath");
  }
  async parseFile(file: File | null): Promise<string> {
    if (file == null) {
      return Promise.reject("Tried to upload a null file");
    }
    this.model.uiState.setSaveFileName(file.name);
    console.log(file.name);
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
      .then((content) => this.model.fromSavedDocument(JSON.parse(content)))
      .then(() => this.model.uiState.setPageNumber(1))
      .catch((err) => console.log(err));
  }

  async exportTrajectory(uuid: string) {
    const path = this.model.pathlist.paths.get(uuid);
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
    return await this.exportTrajectory(this.model.pathlist.activePathUUID);
  }

  async loadFile(jsonFilename: string) {
    await fetch(jsonFilename, { cache: "no-store" })
      .then((res) => {
        console.log(res);
        return res.json();
      })
      .then((data) => {
        this.model.fromSavedDocument(data);
      })
      .then(() => this.model.uiState.setPageNumber(1))
      .catch((err) => console.log(err));
  }

  async saveFile() {
    const content = JSON.stringify(this.model.asSavedDocument(), undefined, 4);
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
    console.log(link);
    //window.open(link, '_blank');
    //Uncomment to "save as..." the file
    element.href = link;
    element.download = name;
    element.click();
  }
}
let DocumentManagerContext = createContext(new DocumentManager());
export default DocumentManagerContext;
