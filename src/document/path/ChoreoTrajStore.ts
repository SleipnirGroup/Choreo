import { types, destroy, Instance, getEnv } from "mobx-state-tree";
import { v4 as uuidv4 } from "uuid";
import {
  CommandStore,
  EventMarkerStore,
  IEventMarkerStore
} from "../EventMarkerStore";
import {
  type Sample,
  Output
} from "../2025/DocumentTypes"
import { Env } from "../DocumentManager";

export const ChoreoTrajStore = types.model("ChoreoTrajStore", {
  waypoints: types.frozen<number[]>(),
  samples: types.frozen<Sample[][]>(),
  markers: types.array(EventMarkerStore)
}).views(self=>({
  get fullTraj():Sample[] {
    return self.samples.flatMap((sect,i,samp)=>{
      if (i != 0) {
        return sect.slice(1);
      }
      return sect;
    });
  },
  getIdxOfFullTraj(indexInFull:number): [number, number] | undefined {
    if (self.samples.length === 0) {return undefined;}
    let sect = 0;
    let indexInSect = 0;
    while (self.samples[sect] !== undefined && self.samples[sect].length  > indexInFull) {
      
      indexInFull-= self.samples[sect].length;
      sect++;
    }
    if (self.samples[sect] === undefined) {
      return undefined;
    } else {
      return [sect, indexInFull];
    }
  },
  getTotalTimeSeconds(): number {
    if (self.samples.length === 0) {
      return 0;
    }
    let lastSection = self.samples[self.samples.length - 1];
    if (lastSection.length === 0) {
      return 0;
    }
    return lastSection[lastSection.length -1].t;
  },
  serialize(): Output {
    return {
      waypoints: self.waypoints,
      samples: self.samples,
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
    }
  }
})).actions(self=>({
  deserialize(ser: Output) {
    self.waypoints = ser.waypoints;
    self.samples = ser.samples;
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
  addEventMarker(marker?: IEventMarkerStore) : IEventMarkerStore {
    if (marker === undefined) {
      marker = getEnv<Env>(self).create.EventMarkerStore({
        name: "Marker",
        target: "first",
        trajTargetIndex: undefined,
        targetTimestamp:undefined,
        offset: ["0 s", 0],
        command: {
          type: "named",
          name: ""
        }
      });
    }
    self.markers.push(marker as IEventMarkerStore);
    return marker;
  },
  setSamples(samples: Sample[][]) {
    self.samples = samples;
  },
  setWaypoints(waypoints: number[]) {
    self.waypoints = waypoints;
  }
}))

export interface IChoreoTrajStore extends Instance<typeof ChoreoTrajStore> {}