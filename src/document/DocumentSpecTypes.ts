import type {
  SavedDocument as v0_0_0,
  SavedDocument
} from "./previousSpecs/v0_0_0";
import v0_0_0_Schema from "./previousSpecs/v0.0.0.json";
import {
  SavedDocument as v0_0_1,
  SavedWaypoint as v0_0_1_Waypoint,
  SAVE_FILE_VERSION as v0_0_1_Version
} from "./previousSpecs/v0_0_1";
import v0_0_1_Schema from "./previousSpecs/v0.0.1.json";
import {
  SavedDocument as v0_1,
  SavedWaypoint as v0_1_Waypoint,
  SAVE_FILE_VERSION as v0_1_Version
} from "./previousSpecs/v0_1";
import v0_1_Schema from "./previousSpecs/v0.1.json";
import {
  SavedDocument as v0_1_1,
  SAVE_FILE_VERSION as v0_1_1_Version
} from "./previousSpecs/v0_1_1";
import v0_1_1_Schema from "./previousSpecs/v0.1.1.json";
import {
  SavedDocument as v0_1_2,
  SAVE_FILE_VERSION as v0_1_2_Version
} from "./previousSpecs/v0_1_2";
import v0_1_2_Schema from "./previousSpecs/v0.1.2.json";
import {
  SavedDocument as v0_2,
  SavedRobotConfig as v0_2_Config,
  SAVE_FILE_VERSION as v0_2_Version
} from "./previousSpecs/v0_2";
import v0_2_Schema from "./previousSpecs/v0.2.json";
import {
  SavedDocument as v0_2_1,
  SAVE_FILE_VERSION as v0_2_1_Version
} from "./previousSpecs/v0_2_1";
import v0_2_1_Schema from "./previousSpecs/v0.2.1.json";
import {
  SavedDocument as v0_2_2,
  SAVE_FILE_VERSION as v0_2_2_Version
} from "./previousSpecs/v0_2_2";
import v0_2_2_Schema from "./previousSpecs/v0.2.2.json";
import {
  SavedDocument as v0_3,
  SAVE_FILE_VERSION as v0_3_Version
} from "./previousSpecs/v0_3";
import v0_3_Schema from "./previousSpecs/v0.3.json";
import {
  SavedDocument as v0_3_1,
  SAVE_FILE_VERSION as v0_3_1_Version
} from "./previousSpecs/v0_3_1";
import v0_3_1_Schema from "./previousSpecs/v0.3.1.json";

// Paste new version import blocks above this line.
// Import SAVE_FILE_VERSION, SavedDocument and only the other types needed for the upgrader functions.
// Also import the new schema.

// No need to change the below two imports when adding new versions.
import Ajv from "ajv";
import { ROBOT_CONFIG_DEFAULTS } from "./RobotConfigStore";
// Update the import path in the below to point to a particular version as current
import { SAVE_FILE_VERSION } from "./previousSpecs/v0_3_1";

export type {
  SavedDocument,
  SavedTrajectorySample,
  SavedPath,
  SavedPathList,
  SavedRobotConfig,
  SavedWaypoint,
  SavedConstraint,
  SavedCircleObstacle,
  SavedEventMarker,
  SavedCommand,
  SavedGroupCommand,
  SavedNamedCommand,
  SavedWaitCommand,
  SavedGeneratedWaypoint
} from "./previousSpecs/v0_3_1";
export { SAVE_FILE_VERSION } from "./previousSpecs/v0_3_1";

const ajv = new Ajv();

export const VERSIONS = {
  "v0.0.0": {
    up: (document: any): v0_0_1 => {
      document = document as v0_0_0;
      const updated: v0_0_1 = {
        paths: {},
        version: v0_0_1_Version,
        robotConfiguration: document.robotConfiguration
      };
      for (const entry of Object.keys(document.paths)) {
        const path = document.paths[entry];
        updated.paths[entry] = { waypoints: [], trajectory: [] };
        path.waypoints.forEach((waypoint, index) => {
          const { xConstrained, yConstrained } = waypoint;
          const updatedWaypoint: v0_0_1_Waypoint = {
            translationConstrained: !(!xConstrained && !yConstrained),
            ...waypoint
          };
          updated.paths[entry].waypoints[index] = updatedWaypoint;
        });
      }
      return updated;
    },
    schema: v0_0_0_Schema
  },
  "v0.0.1": {
    up: (document: any): v0_1 => {
      document = document as v0_0_1;
      const updated: v0_1 = {
        paths: {},
        version: v0_1_Version,
        robotConfiguration: document.robotConfiguration
      };
      for (const entry of Object.keys(document.paths)) {
        const path = document.paths[entry];
        updated.paths[entry] = {
          waypoints: [],
          trajectory: [],
          constraints: []
        };
        path.waypoints.forEach((waypoint, index) => {
          const updatedWaypoint: v0_1_Waypoint = {
            ...waypoint,
            isInitialGuess: false
          };
          updated.paths[entry].waypoints[index] = updatedWaypoint;
        });
      }
      return updated;
    },
    schema: v0_0_1_Schema
  },
  "v0.1": {
    up: (document: any): v0_1_1 => {
      document = document as v0_1;
      const updated: v0_1_1 = {
        paths: {},
        version: v0_1_1_Version,
        robotConfiguration: document.robotConfiguration
      };
      for (const entry of Object.keys(document.paths)) {
        const path = document.paths[entry];
        updated.paths[entry] = {
          waypoints: path.waypoints,
          trajectory: path.trajectory,
          constraints: path.constraints,
          usesControlIntervalGuessing: true,
          defaultControlIntervalCount: 40
        };
      }
      return updated;
    },
    schema: v0_1_Schema
  },
  "v0.1.1": {
    up: (document: any): v0_1_2 => {
      document = document as v0_1_1;
      const updated: v0_1_2 = {
        paths: {},
        version: v0_1_2_Version,
        robotConfiguration: document.robotConfiguration
      };
      for (const entry of Object.keys(document.paths)) {
        const path = document.paths[entry];
        updated.paths[entry] = {
          waypoints: path.waypoints,
          trajectory: path.trajectory,
          constraints: path.constraints,
          usesControlIntervalGuessing: path.usesControlIntervalGuessing,
          defaultControlIntervalCount: path.defaultControlIntervalCount,
          usesDefaultFieldObstacles: true,
          circleObstacles: []
        };
      }
      return updated;
    },
    schema: v0_1_1_Schema
  },
  "v0.1.2": {
    up: (document: any): v0_2 => {
      document = document as v0_1_2;
      const robotConfiguration: v0_2_Config = {
        motorMaxTorque: ROBOT_CONFIG_DEFAULTS.motorMaxTorque,
        motorMaxVelocity: ROBOT_CONFIG_DEFAULTS.motorMaxVelocity,
        gearing: ROBOT_CONFIG_DEFAULTS.gearing,
        ...document.robotConfiguration
      };
      const updated: v0_2 = {
        paths: document.paths,
        version: v0_2_Version,
        robotConfiguration
      };
      return updated;
    },
    schema: v0_1_2_Schema
  },
  "v0.2": {
    up: (document: any): v0_2_1 => {
      const updated: v0_2_1 = {
        paths: document.paths,
        version: v0_2_1_Version,
        robotConfiguration: document.robotConfiguration,
        splitTrajectoriesAtStopPoints: false
      };
      return updated;
    },
    schema: v0_2_Schema
  },
  "v0.2.1": {
    up: (document: any): v0_2_2 => {
      return {
        paths: document.paths,
        version: v0_2_2_Version,
        robotConfiguration: document.robotConfiguration,
        splitTrajectoriesAtStopPoints: document.splitTrajectoriesAtStopPoints,
        usesObstacles: false
      };
    },
    schema: v0_2_1_Schema
  },
  "v0.2.2": {
    up: (document: any): v0_3 => {
      const updated: v0_3 = document;
      updated.version = v0_3_Version;
      for (const entry of Object.keys(updated.paths)) {
        updated.paths[entry].eventMarkers = [];
        updated.paths[entry].trajectoryWaypoints = [];
        updated.paths[entry].isTrajectoryStale = false;
      }
      return updated;
    },
    schema: v0_2_2_Schema
  },
  "v0.3": {
    up: (document: any): v0_3_1 => {
      const updated: v0_3_1 = document;
      updated.version = v0_3_1_Version;
      for (const entry of Object.keys(updated.paths)) {
        const path = updated.paths[entry];
        for (const marker of path.eventMarkers) {
          marker.trajTargetIndex = null;
          /**check if the saved targetTimestamp
             matches the targeted waypoint in generatedWaypoint.
             If it doesn't match any, something desynced that shouldn't have, and we can't recover its location
             If it does, we know which waypoint it targeted.
            */
          if (marker.targetTimestamp !== null) {
            for (let i = 0; i < path.trajectoryWaypoints.length; i++) {
              if (
                Math.abs(
                  path.trajectoryWaypoints[i].timestamp - marker.targetTimestamp
                ) < 0.01
              ) {
                marker.trajTargetIndex = i;
                break;
              }
            }
          }
        }
      }
      return updated;
    },
    schema: v0_3_Schema
  },
  "v0.3.1": {
    up: (document: any): v0_3 => document,
    schema: v0_3_1_Schema
  }
  /**
   * For developers adding new document versions-Keep this comment at the end of the list.
   *
   * CURRENT_VERSION refers to the version before the one being added.
   *
   * Step 1: Write the upgrader function from CURRENT_VERSION to ADDED_VERSION.
   * Step 2: Replace VERSIONS[CURRENT_VERSION].up with your upgrader function.
   * To reiterate, each version's upgrader function upgrades a document of that version to the next version,
   * except for the latest version's upgrader, which returns the document unchanged.
   * Step 3: write a "no-op" upgrader function for ADDED_VERSION. This function should never actually run,
   * so this is mostly a matter of matching the type signature without modifying the document
   * Step 4: set the `schema` property for your new version to the imported schema from above.
   */
};

export const updateToCurrent = (document: {
  version: string;
}): SavedDocument => {
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

export const validate = (document: { version: string }): string => {
  if (document.version in VERSIONS) {
    if (!ajv.validate(VERSIONS[document.version].schema, document)) {
      return ajv.errorsText(ajv.errors);
    } else {
      return "";
    }
  } else {
    return `Invalid document version: ${document.version}`;
  }
};
