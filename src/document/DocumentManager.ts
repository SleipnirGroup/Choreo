import { Instance, types } from "mobx-state-tree";
import { createContext } from "react";
import FieldConfig from "../datatypes/FieldConfig";
import DocumentModel from "./DocumentModel";

export const UIStateStore = types.model("UIStateStore", {
  isRobotConfigOpen: false,
}).actions(self=>{
  return {
    setRobotConfigOpen(open: boolean) {self.isRobotConfigOpen = open}
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
            "field-image": "2022-field.png",
            "field-image-size":[1859, 949],
            "field-corners": {
              "top-left": [74, 50],
              "bottom-right": [1775, 901]
            },
            "field-size": [16.4592, 8.2296],
            "field-unit": "meter"
          }
    }
}
let DocumentManagerContext = createContext(new DocumentManager());
export default DocumentManagerContext; 