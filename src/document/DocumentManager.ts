import { Instance, types } from "mobx-state-tree";
import { createContext } from "react";
import FieldConfig from "../datatypes/FieldConfig";
import DocumentModel from "./DocumentModel";

export const UIStateStore = types.model("UIStateStore", {
  isRobotConfigOpen: false,
  fieldScalingFactor:0.02
}).actions(self=>{
  return {
    setRobotConfigOpen(open: boolean) {self.isRobotConfigOpen = open},
    setFieldScalingFactor(metersPerPixel: number) {self.fieldScalingFactor = metersPerPixel}
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
}
let DocumentManagerContext = createContext(new DocumentManager());
export default DocumentManagerContext; 