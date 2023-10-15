import { createContext } from "react";
import StateStore, { IStateStore } from "./DocumentModel";
import { dialog, fs } from "@tauri-apps/api";
import { v4 as uuidv4 } from "uuid";
import { VERSIONS, validate } from "./DocumentSpecTypes";
import { applySnapshot, getRoot, onPatch } from "mobx-state-tree";
import { toJS } from "mobx";
import { toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.min.css';

export class DocumentManager {
  simple: any;
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
          toast.error('Could not parse selected document (Is it a choreo document?)', {
            position: "top-right",
            autoClose: false,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: false,
            draggable: true,
            progress: undefined,
            theme: "dark",
            });
          }
        })
      .catch((err) => {
        console.log(err);
        toast.error('File load error: ' + err, {
          position: "top-right",
          autoClose: false,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: false,
          draggable: true,
          progress: undefined,
          theme: "dark",
          });
        });
  }

  async exportTrajectory(uuid: string) {
    const path = this.model.document.pathlist.paths.get(uuid);
    if (path === undefined) {
      console.error("Tried to export trajectory with unknown uuid: ", uuid);
      toast.error('Tried to export trajectory with unknown uuid', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: true,
        progress: undefined,
        theme: "dark",
        });
      return;
    }
    const trajectory = path.getSavedTrajectory();
    if (trajectory === null) {
      console.error("Tried to export ungenerated trajectory: ", uuid);
      toast.error('Cannot export ungenerated trajectory', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: true,
        progress: undefined,
        theme: "dark",
        });
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
