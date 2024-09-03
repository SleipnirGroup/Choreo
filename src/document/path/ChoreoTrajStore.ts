import { Instance, destroy, getEnv, types } from "mobx-state-tree";
import {
  DifferentialDriveSample,
  Output,
  type SwerveSample
} from "../2025/DocumentTypes";
import { Env } from "../DocumentManager";
import { EventMarkerStore, IEventMarkerStore } from "../EventMarkerStore";

export const ChoreoTrajStore = types
  .model("ChoreoTrajStore", {
    waypoints: types.frozen<number[]>(),
    samples: types.frozen<SwerveSample[][] | DifferentialDriveSample[][]>(),
    forcesAvailable: false,
    markers: types.array(EventMarkerStore)
  })
  .views((self) => ({
    get fullTraj(): SwerveSample[] | DifferentialDriveSample[] {
      //@ts-expect-error This might be a TS bug, flatMap on an A[] | B[] returns an (A | B)[]
      return self.samples.flatMap((sect, i, samp) => {
        if (i != 0) {
          return sect.slice(1);
        }
        return sect;
      });
    },
    get isSwerve(): boolean {
      return (
        this.fullTraj.length === 0 || Object.hasOwn(this.fullTraj[0], "vx")
      );
    },
    get isDifferentialDrive(): boolean {
      return (
        this.fullTraj.length === 0 || Object.hasOwn(this.fullTraj[0], "vl")
      );
    },
    // 01234567
    // ...
    //   ...
    //     ...
    // 0 = 0,0
    // 1 0,1
    // 2 1,0
    // 3,1,1
    // 4,2,0,
    // 5,2,1,
    // 6,2,2
    // the last interval of a section is considered the first interval of the next
    getIdxOfFullTraj(indexRemaining: number): [number, number] | undefined {
      if (self.samples.length === 0) {
        return undefined;
      }
      let sect = 0;
      while (
        self.samples[sect] !== undefined &&
        self.samples[sect].length <= indexRemaining + 1
      ) {
        indexRemaining -= self.samples[sect].length - 1;
        sect++;
      }

      if (self.samples[sect] === undefined) {
        return undefined;
      } else {
        // indexRemaining calculates the number of elements in the last section before and include the target
        // but we need the index within that section
        return [sect, indexRemaining];
      }
    },
    getTotalTimeSeconds(): number {
      if (self.samples.length === 0) {
        return 0;
      }
      const lastSection = self.samples[self.samples.length - 1];
      if (lastSection.length === 0) {
        return 0;
      }
      return lastSection[lastSection.length - 1].t;
    },
    get serialize(): Output {
      return {
        waypoints: self.waypoints,
        samples: self.samples,
        forcesAvailable: self.forcesAvailable
        // markers: self.markers.flatMap((marker) => {
        //   const target = self.waypoints.waypointIdToSavedWaypointId(marker.target);
        //   const saved: SavedEventMarker = {
        //     name: marker.name,
        //     target: target ?? null,
        //     trajTargetIndex: marker.trajTargetIndex ?? null,
        //     targetTimestamp: marker.targetTimestamp ?? null,
        //     offset: marker.offset,
        //     command: marker.command.asSavedCommand()
        //   };

        //   return [saved];
        // }),
      };
    }
  }))
  .actions((self) => ({
    deserialize(ser: Output) {
      self.waypoints = ser.waypoints;
      self.samples = ser.samples;
      self.forcesAvailable = ser.forcesAvailable;
    },
    deleteMarkerUUID(uuid: string) {
      const index = self.markers.findIndex((m) => m.uuid === uuid);
      if (index >= 0 && index < self.markers.length) {
        destroy(self.markers[index]);
        if (self.markers.length === 0) {
          return;
        } else if (self.markers[index - 1]) {
          self.markers[index - 1].setSelected(true);
        } else if (self.markers[index + 1]) {
          self.markers[index + 1].setSelected(true);
        }
      }
    },
    addEventMarker(marker?: IEventMarkerStore): IEventMarkerStore {
      if (marker === undefined) {
        marker = getEnv<Env>(self).create.EventMarkerStore({
          name: "Marker",
          target: "first",
          trajTargetIndex: undefined,
          targetTimestamp: undefined,
          offset: ["0 s", 0],
          command: {
            type: "named",
            data: {
              name: ""
            }
          }
        });
      }
      self.markers.push(marker as IEventMarkerStore);
      return marker;
    },
    setSamples(samples: SwerveSample[][] | DifferentialDriveSample[][]) {
      self.samples = samples;
    },
    setWaypoints(waypoints: number[]) {
      self.waypoints = waypoints;
    },
    setForcesAvailable(use: boolean) {
      self.forcesAvailable = use;
    }
  }));

export type IChoreoTrajStore = Instance<typeof ChoreoTrajStore>;
