import { Instance, types } from "mobx-state-tree";
import { createContext } from "react";
import data from '../../public/scurve.json'
import FieldConfig from "../datatypes/FieldConfig";
import DocumentModel from "./DocumentModel";
import { SavedDocument } from "./DocumentSpecTypes";
import {v4} from 'uuid'




export const UIStateStore = types.model("UIStateStore", {
  appPage:1,
  fieldScalingFactor:0.02,
  fieldGridView:false,
  saveFileName:"save",
  waypointPanelOpen:false
}).actions(self=>{
  return {
    setPageNumber(page: number) {self.appPage = page},
    setFieldScalingFactor(metersPerPixel: number) {self.fieldScalingFactor = metersPerPixel},
    setFieldGridView(on:boolean) {self.fieldGridView = on},
    setSaveFileName(name:string) {self.saveFileName = name},
    setWaypointPanelOpen(open:boolean) {self.waypointPanelOpen = open}
  }
})
export interface IUIStateStore extends Instance<typeof UIStateStore> {};
export class DocumentManager {
    simple: any;
    uiState : IUIStateStore
    model : DocumentModel;
    fieldConfig : FieldConfig;
    constructor () {
        this.uiState = UIStateStore.create();
        this.model = new DocumentModel();
        this.fieldConfig =  {
            "game": "Rapid React",
            fieldImage: "2022-field.png",
            fieldSize: [16.4592, 8.2296],
            fieldImageSize: [16.4592 * 1859 / (1775-74), 8.2296 * 949 / (901 - 50)],
            fieldOffset: [16.4592 * 74 / (1775-74), 8.2296 * 50 / (901 - 50)]
        }
    }

    async parseFile(file : File | null) : Promise<string> {
      if (file == null) {
        return Promise.reject("Tried to upload a null file");
      }
      this.uiState.setSaveFileName(file.name);
      console.log(file.name);
      return new Promise((resolve, reject) => {
        const fileReader = new FileReader()
        fileReader.onload = event => {
          let output = event.target!.result;
          if (typeof output === 'string'){

            resolve(output);
          }
          reject("File did not read as string")
         
        }
        fileReader.onerror = error => reject(error)
        fileReader.readAsText(file)
      })
    }
    async onFileUpload(file:File | null) {
      await this.parseFile(file)
        .then((content) =>this.model.fromSavedDocument(JSON.parse(content)))
        .catch(err=>console.log(err))
    }

    async exportTrajectory(uuid: string) {

    }

    loadFile(jsonFilename:string) {
      fetch(jsonFilename, {cache:'no-store', }).then((res)=>{console.log(res); return res.json()}).then((data)=>{
        console.log(data)
        this.model.fromSavedDocument(data)
       })
    }


    async saveFile() {
      const content = JSON.stringify(this.model.asSavedDocument(), undefined, 4);
      // TODO make document save file here
      this.downloadJSONString(content, this.uiState.saveFileName)

  }

  async downloadJSONString(content:string, name:string) {
    const element = document.createElement("a");
    const file = new Blob([content], {type: "application/json"});
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