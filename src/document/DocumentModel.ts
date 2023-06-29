import { types } from "mobx-state-tree";
import { Instance } from "mobx-state-tree";
import { moveItem } from "mobx-utils";
import { v4 as uuidv4 } from "uuid";
import {
  SavedDocument,
  SavedPath,
  SavedPathList,
  SavedRobotConfig,
  SavedTrajectorySample,
  SavedWaypoint,
  SAVE_FILE_VERSION,
} from "./DocumentSpecTypes";

// Save file data types:

// State tree data types:
export const TrajectorySampleStore = types
  .model("TrajectorySampleStore", {
    timestamp: 0,
    x: 0,
    y: 0,
    heading: 0,
    velocityX: 0,
    velocityY: 0,
    angularVelocity: 0,
  })
  .views((self) => {
    return {
      asSavedTrajectorySample(): SavedTrajectorySample {
        let {
          timestamp,
          x,
          y,
          heading,
          velocityX,
          velocityY,
          angularVelocity,
        } = self;
        return {
          timestamp,
          x,
          y,
          heading,
          velocityX,
          velocityY,
          angularVelocity,
        };
      },
    };
  })
  .actions((self) => {
    return {
      fromSavedTrajectorySample(sample: SavedTrajectorySample) {
        self.timestamp = sample.timestamp;
        self.x = sample.x;
        self.y = sample.y;
        self.heading = sample.heading;
        self.velocityX = sample.velocityX;
        self.velocityY = sample.velocityY;
        self.angularVelocity = sample.angularVelocity;
      },
      setX(x: number) {
        self.x = x;
      },
      setY(y: number) {
        self.y = y;
      },
      setHeading(heading: number) {
        self.heading = heading;
      },
      setVelocityX(vx: number) {
        self.velocityX = vx;
      },
      setVelocityY(vy: number) {
        self.velocityY = vy;
      },
      setAngularVelocity(omega: number) {
        self.angularVelocity = omega;
      },
      setTimestamp(timestamp: number) {
        self.timestamp = timestamp;
      },
    };
  });
export interface ITrajectorySampleStore
  extends Instance<typeof TrajectorySampleStore> {}
export const HolonomicWaypointStore = types
  .model("WaypointStore", {
    x: 0,
    y: 0,
    heading: 0,
    xConstrained: true,
    yConstrained: true,
    headingConstrained: true,
    controlIntervalCount: 0,
    velocityMagnitude: 0,
    velocityAngle: 0,
    angularVelocity: 0,
    velocityMagnitudeConstrained: false,
    velocityAngleConstrained: false,
    angularVelocityConstrained: false,
    uuid: types.identifier,
    selected: false,
  })
  .views((self) => {
    return {
      asSavedWaypoint(): SavedWaypoint {
        let {
          x,
          y,
          heading,
          velocityMagnitude,
          velocityAngle,
          xConstrained,
          yConstrained,
          headingConstrained,
          velocityMagnitudeConstrained,
          velocityAngleConstrained,
          angularVelocity,
          angularVelocityConstrained,
          controlIntervalCount,
        } = self;
        return {
          x,
          y,
          heading,
          velocityMagnitude,
          velocityAngle,
          xConstrained,
          yConstrained,
          headingConstrained,
          velocityMagnitudeConstrained,
          velocityAngleConstrained,
          angularVelocity,
          angularVelocityConstrained,
          controlIntervalCount,
        };
      },
    };
  })
  .actions((self) => {
    return {
      fromSavedWaypoint(point: SavedWaypoint) {
        self.x = point.x;
        self.y = point.y;
        self.heading = point.heading;
        self.velocityMagnitude = point.velocityMagnitude;
        self.velocityAngle = point.velocityAngle;
        self.xConstrained = point.xConstrained;
        self.yConstrained = point.yConstrained;
        self.headingConstrained = point.headingConstrained;
        self.velocityMagnitudeConstrained = point.velocityMagnitudeConstrained;
        self.velocityAngleConstrained = point.velocityAngleConstrained;
        self.angularVelocity = point.angularVelocity;
        self.angularVelocityConstrained = point.angularVelocityConstrained;
      },

      setX(x: number) {
        self.x = x;
      },
      setXConstrained(xConstrained: boolean) {
        self.xConstrained = xConstrained;
      },
      setY(y: number) {
        self.y = y;
      },
      setYConstrained(yConstrained: boolean) {
        self.yConstrained = yConstrained;
      },
      setHeading(heading: number) {
        self.heading = heading;
      },
      setHeadingConstrained(headingConstrained: boolean) {
        self.headingConstrained = headingConstrained;
      },
      setSelected(selected: boolean) {
        self.selected = selected;
      },

      setVelocityAngle(vAngle: number) {
        self.velocityAngle = vAngle;
      },
      setVelocityAngleConstrained(velocityAngleConstrained: boolean) {
        self.velocityAngleConstrained = velocityAngleConstrained;
      },
      setVelocityMagnitude(vMag: number) {
        self.velocityMagnitude = vMag;
      },
      setVelocityMagnitudeConstrained(velocityMagnitudeConstrained: boolean) {
        self.velocityMagnitudeConstrained = velocityMagnitudeConstrained;
      },
      setAngularVelocity(omega: number) {
        self.angularVelocity = omega;
      },
      setAngularVelocityConstrained(angularVelocityConstrained: boolean) {
        self.angularVelocityConstrained = angularVelocityConstrained;
      },
    };
  });
export interface IHolonomicWaypointStore
  extends Instance<typeof HolonomicWaypointStore> {}
export const HolonomicPathStore = types
  .model("HolonomicPathStore", {
    name: "",
    uuid: types.identifier,
    waypoints: types.array(HolonomicWaypointStore),
    generated: types.array(TrajectorySampleStore),
  })
  .views((self) => {
    return {
      getTotalTimeSeconds(): number {
        if (self.generated.length === 0) {
          return 0;
        }
        return self.generated[self.generated.length - 1].timestamp;
      },
      getSavedTrajectory(): Array<SavedTrajectorySample> | null {
        let trajectory = null;
        if (self.generated.length >= 2) {
          trajectory = self.generated.map((point) =>
            point.asSavedTrajectorySample()
          );
        }
        return trajectory;
      },
      canGenerate(): boolean {
        return self.waypoints.length >= 2;
      },
      canExport(): boolean {
        return self.generated.length >= 2;
      },
      asSavedPath(): SavedPath {
        let trajectory: Array<SavedTrajectorySample> | null = null;
        if (self.generated.length >= 2) {
          trajectory = self.generated.map((point) =>
            point.asSavedTrajectorySample()
          );
        }
        return {
          waypoints: self.waypoints.map((point) => point.asSavedWaypoint()),
          trajectory: trajectory,
        };
      },
      lowestSelectedPoint(): IHolonomicWaypointStore | null {
        for (let point of self.waypoints) {
          if (point.selected) return point;
        }
        return null;
      },
    };
  })
  .actions((self) => {
    return {
      fromSavedPath(path: SavedPath) {
        self.waypoints.clear();
        path.waypoints.forEach((point, index) => {
          let waypoint = this.addWaypoint();
          waypoint.fromSavedWaypoint(point);
        });
        self.generated.clear();
        if (path.trajectory !== undefined && path.trajectory !== null) {
          path.trajectory.forEach((savedSample, index) => {
            let sample = TrajectorySampleStore.create();
            sample.fromSavedTrajectorySample(savedSample);
            self.generated.push(sample);
          });
        }
      },
      setName(name: string) {
        self.name = name;
      },
      selectOnly(selectedIndex: number) {
        self.waypoints.forEach((point, index) => {
          point.selected = selectedIndex === index;
        });
      },
      addWaypoint(): IHolonomicWaypointStore {
        self.waypoints.push(HolonomicWaypointStore.create({ uuid: uuidv4() }));
        if (self.waypoints.length === 1) {
          self.waypoints[0].setSelected(true);
        }
        return self.waypoints[self.waypoints.length - 1];
      },
      deleteWaypoint(index: number) {
        if (self.waypoints[index - 1]) {
          self.waypoints[index - 1].setSelected(true);
        }
        self.waypoints.remove(self.waypoints[index]);
        if (self.waypoints.length === 1) {
          self.generated.length = 0;
        }
      },
      deleteWaypointUUID(uuid: string) {
        let index = self.waypoints.findIndex((point) => point.uuid === uuid);
        if (self.waypoints[index - 1]) {
          self.waypoints[index - 1].setSelected(true);
        } else if (self.waypoints[index + 1]) {
          self.waypoints[index + 1].setSelected(true);
        }
        self.waypoints.remove(self.waypoints[index]);
        if (self.waypoints.length === 1) {
          self.generated.length = 0;
        }
      },
      reorder(startIndex: number, endIndex: number) {
        //self.waypoints.splice(endIndex, 0, self.waypoints.splice(startIndex, 1)[0]);
        moveItem(self.waypoints, startIndex, endIndex);
      },
      generatePath() {
        self.generated.length = 0;
        if (self.waypoints.length < 2) {
          return;
        }
        self.waypoints.forEach((point, index) => {
          let newPoint = TrajectorySampleStore.create();
          newPoint.setX(point.x);
          newPoint.setY(point.y);
          newPoint.setHeading(point.heading);
          newPoint.setTimestamp(index);
          self.generated.push(newPoint);
        });
      },
    };
  });
export interface IHolonomicPathStore
  extends Instance<typeof HolonomicPathStore> {}

export const PathListStore = types
  .model("PathListStore", {
    paths: types.map(HolonomicPathStore),
    activePathUUID: "",
  })
  .views((self) => {
    return {
      asSavedPathList(): SavedPathList {
        let obj: any = {};
        self.paths.forEach((path) => {
          obj[path.name] = path.asSavedPath();
        });
        return obj;
      },
      toJSON(): any {
        let obj: any = {};
        self.paths.forEach((path) => {
          obj[path.name] = path;
        });
        return obj;
      },
      get pathNames() {
        return Array.from(self.paths.values()).map(
          (pathStore) => pathStore.name
        );
      },

      get pathUUIDs() {
        return Array.from(self.paths.keys());
      },
      get activePath() {
        return (
          self.paths.get(self.activePathUUID) ||
          HolonomicPathStore.create({ name: "New Path", uuid: uuidv4() })
        );
      },
    };
  })
  .actions((self) => {
    return {
      setActivePathUUID(uuid: string) {
        if (self.pathUUIDs.includes(uuid)) {
          self.activePathUUID = uuid;
        }
      },
      addPath(name: string, select: boolean = false): string {
        let usedName = name;
        let disambig = 1;
        while (self.pathNames.includes(usedName)) {
          usedName = `${name} (${disambig.toFixed(0)})`;
          disambig++;
        }
        let newUUID = uuidv4();
        self.paths.put(
          HolonomicPathStore.create({
            uuid: newUUID,
            name: usedName,
            waypoints: [],
          })
        );
        if (self.paths.size === 1 || select) {
          self.activePathUUID = newUUID;
        }
        return newUUID;
      },
    };
    // The annoying thing we have to do to add the above actions to the object before we use them below
  })
  .actions((self) => {
    return {
      deletePath(uuid: string) {
        self.paths.delete(uuid);
        if (self.paths.size === 0) {
          self.addPath("New Path", true);
        } else if (self.activePathUUID === uuid) {
          self.setActivePathUUID(self.pathUUIDs[0]);
        }
      },
      fromSavedPathList(list: SavedPathList) {
        self.paths.clear();
        if (list) {
          Array.from(Object.keys(list).values()).forEach((name) => {
            let uuid = self.addPath(name, false);
            let path = self.paths.get(uuid);
            path!.fromSavedPath(list[name]);
          });
        }
      },
    };
  });

export interface IPathListStore extends Instance<typeof PathListStore> {}
export const RobotConfigStore = types
  .model("WaypointStore", {
    mass: 4,
    rotationalInertia: 5.6,
    wheelMaxVelocity: 16,
    wheelMaxTorque: 1.9,
    wheelRadius: 0.0508,
    bumperWidth: 0.9,
    bumperLength: 0.9,
    wheelbase: 0.622,
    trackWidth: 0.622,
  })
  .actions((self) => {
    return {
      fromSavedRobotConfig(config: SavedRobotConfig) {
        let {
          mass,
          rotationalInertia,
          wheelMaxTorque,
          wheelMaxVelocity,
          wheelbase,
          trackWidth,
          bumperLength,
          bumperWidth,
          wheelRadius,
        } = config;
        self.mass = mass;
        self.rotationalInertia = rotationalInertia;
        self.wheelMaxTorque = wheelMaxTorque;
        self.wheelMaxVelocity = wheelMaxVelocity;
        self.wheelbase = wheelbase;
        self.trackWidth = trackWidth;
        self.bumperLength = bumperLength;
        self.bumperWidth = bumperWidth;
        self.wheelRadius = wheelRadius;
      },
      setMass(arg: number) {
        self.mass = arg;
      },
      setRotationalInertia(arg: number) {
        self.rotationalInertia = arg;
      },
      setMaxTorque(arg: number) {
        self.wheelMaxTorque = arg;
      },
      setMaxVelocity(arg: number) {
        self.wheelMaxVelocity = arg;
      },
      setBumperWidth(arg: number) {
        self.bumperWidth = arg;
      },
      setBumperLength(arg: number) {
        self.bumperLength = arg;
      },
      setWheelbase(arg: number) {
        self.wheelbase = arg;
      },
      setTrackwidth(arg: number) {
        self.trackWidth = arg;
      },
      setWheelRadius(arg: number) {
        self.wheelRadius = arg;
      },
    };
  })
  .views((self) => {
    return {
      asSavedRobotConfig(): SavedRobotConfig {
        let {
          mass,
          rotationalInertia,
          wheelMaxTorque,
          wheelMaxVelocity,
          wheelbase,
          trackWidth: trackwidth,
          bumperLength,
          bumperWidth,
          wheelRadius,
        } = self;
        return {
          mass,
          rotationalInertia,
          wheelMaxTorque,
          wheelMaxVelocity,
          wheelbase,
          trackWidth: trackwidth,
          bumperLength,
          bumperWidth,
          wheelRadius,
        };
      },
      bumperSVGElement() {
        return `M ${self.bumperLength / 2} ${self.bumperWidth / 2}
            L ${self.bumperLength / 2} ${-self.bumperWidth / 2}
            L ${-self.bumperLength / 2} ${-self.bumperWidth / 2}
            L ${-self.bumperLength / 2} ${self.bumperWidth / 2}
            L ${self.bumperLength / 2} ${self.bumperWidth / 2}
            `;
      },
    };
  });
export interface IRobotConfigStore extends Instance<typeof RobotConfigStore> {}
export default class DocumentModel {
  pathlist = PathListStore.create();
  robotConfig = RobotConfigStore.create();
  asSavedDocument(): SavedDocument {
    return {
      version: SAVE_FILE_VERSION,
      robotConfiguration: this.robotConfig.asSavedRobotConfig(),
      paths: this.pathlist.asSavedPathList(),
    };
  }
  fromSavedDocument(document: SavedDocument) {
    if (document.version !== SAVE_FILE_VERSION) {
      console.error("mismatched version");
    }
    this.robotConfig.fromSavedRobotConfig(document.robotConfiguration);
    this.pathlist.fromSavedPathList(document.paths);
  }
  constructor() {
    this.pathlist.addPath("New Path");
  }
}
