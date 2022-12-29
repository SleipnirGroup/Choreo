import { Instance, types } from "mobx-state-tree";
import { createContext } from "react";
import data from '../../public/scurve.json'
import FieldConfig from "../datatypes/FieldConfig";
import DocumentModel from "./DocumentModel";
import { SavedDocument } from "./DocumentSpecTypes";

export const UIStateStore = types.model("UIStateStore", {
  isRobotConfigOpen: false,
  fieldScalingFactor:0.02,
  fieldGridView:true
}).actions(self=>{
  return {
    setRobotConfigOpen(open: boolean) {self.isRobotConfigOpen = open},
    setFieldScalingFactor(metersPerPixel: number) {self.fieldScalingFactor = metersPerPixel},
    setFieldGridView(on:boolean) {self.fieldGridView = on}
  }
})
export interface IUIStateStore extends Instance<typeof UIStateStore> {};
export class DocumentManager {
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

    loadFile(jsonFilename:string) {
      fetch(jsonFilename, {cache:'no-store', }).then((res)=>{console.log(res); return res.json()}).then((data)=>{
        console.log(data)
        this.model.fromSavedDocument(data)
       })
    }


    saveFile() {
      const content = JSON.stringify(this.model.asSavedDocument(), undefined, 4);
      // TODO make document save file here
      const element = document.createElement("a");
      const file = new Blob([content], {type: "application/json"});
      let link = URL.createObjectURL(file);
      console.log(link);
      window.open(link, '_blank');
      //Uncomment to "save as..." the file
      // element.href = link;
      // element.download = "file.json";
      // element.click();
  }
}
let DocumentManagerContext = createContext(new DocumentManager());
export default DocumentManagerContext; 