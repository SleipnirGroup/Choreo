/* DO NOT CHANGE the following import block! It should remain as a copy-paste example */
import type {
  SavedDocument as v0_0_0,
  SavedPath as v0_0_0_Path,
  SavedWaypoint as v0_0_0_Waypoint,
  SavedTrajectorySample as v0_0_0_Sample,
  SavedPathList as v0_0_0_Pathlist,
  SavedRobotConfig as v0_0_0_Config,
  SAVE_FILE_VERSION as v0_0_0_Version,
  SavedDocument,
} from "./previousSpecs/v0_0_0";
import v0_0_0_Schema from "./previousSpecs/v0.0.0.json";
import {
  SavedDocument as v0_0_1,
  SavedPath as v0_0_1_Path,
  SavedWaypoint as v0_0_1_Waypoint,
  SavedTrajectorySample as v0_0_1_Sample,
  SavedPathList as v0_0_1_Pathlist,
  SavedRobotConfig as v0_0_1_Config,
  SAVE_FILE_VERSION as v0_0_1_Version,
} from "./previousSpecs/v0_0_1";
import v0_0_1_Schema from "./previousSpecs/v0.0.1.json";

// Paste new version import blocks above this line.
// Update the import path in the below to point to a particular version as current
export type {
  SavedDocument,
  SavedTrajectorySample,
  SavedPath,
  SavedPathList,
  SavedRobotConfig,
  SavedWaypoint,
} from "./previousSpecs/v0_0_1";
export { SAVE_FILE_VERSION } from "./previousSpecs/v0_0_1";
import { SAVE_FILE_VERSION } from "./previousSpecs/v0_0_1";
import Ajv from "ajv";

export let VERSIONS = {
  "v0.0.0": {
    up: (document: any): v0_0_1 => {
      document = document as v0_0_0;
      let updated: v0_0_1 = {
        paths: {},
        version: v0_0_1_Version,
        robotConfiguration: document.robotConfiguration,
      };
      for (let entry of Object.keys(document.paths)) {
        let path = document.paths[entry];
        updated.paths[entry] = { waypoints: [], trajectory: [] };
        path.waypoints.forEach((waypoint, index) => {
          let { xConstrained, yConstrained } = waypoint;
          let updatedWaypoint: v0_0_1_Waypoint = {
            translationConstrained: !(!xConstrained && !yConstrained),
            ...waypoint,
          };
          updated.paths[entry].waypoints[index] = updatedWaypoint;
        });
      }
      return updated;
    },
    validate: (document: v0_0_0): boolean => {
      const ajv = new Ajv();
      return ajv.validate(v0_0_0_Schema, document);
    },
  },
  "v0.0.1": {
    up: (document: any): v0_0_1 => {
      return document as v0_0_1;
    },
    validate: (document: v0_0_1): boolean => {
      const ajv = new Ajv();
      return ajv.validate(v0_0_1_Schema, document);
    },
  },
};

export let updateToCurrent = (document: { version: string }): SavedDocument => {
  let version = document.version;
  // We make sure this doesn't infinite loop by limiting the number of version jumps
  for (
    let i = 0;
    version !== SAVE_FILE_VERSION && i < Object.keys(VERSIONS).length;
    i++
  ) {
    console.log(document);
    if (Object.keys(VERSIONS).includes(version)) {
      console.log(version);
      document = VERSIONS[version as keyof typeof VERSIONS].up(document);
      version = document.version;
    }
  }
  console.log(document);
  return document as SavedDocument;
};
