import FieldConfig from "../datatypes/FieldConfig";
import HolonomicPath from "../datatypes/HolonomicPath";
import HolonomicWaypoint from "../datatypes/HolonomicWaypoint";
import DocumentModel from "./DocumentModel";

export class DocumentManager {
    model : DocumentModel;
    fieldConfig : FieldConfig;
    constructor () {
        this.model = new DocumentModel();
        this.fieldConfig =  {
            "game": "Rapid React",
            "field-image": "2022-field.png",
            "field-corners": {
              "top-left": [74, 45],
              "bottom-right": [1781, 903]
            },
            "field-size": [16.4592, 8.2296],
            "field-unit": "meter"
          }
    }

    saveToJSON() : string {
        let output : any = {};
        this.model.getPaths().forEach((path)=>{
            output[path]= this.model.getPath(path);
        })
        return JSON.stringify(output);
    }
}
let documentManager = new DocumentManager();
export default documentManager; 