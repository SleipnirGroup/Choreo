import { derived, writable, type Writable } from "svelte/store";
// import SquareCircle from "virtual:icons/mdi/square-circle";
// import Circle from "virtual:icons/mdi/circle";
// import CircleOutline from "virtual:icons/mdi/circle-outline";
// import InitialGuess from "virtual:icons/mdi/help-circle-outline";
import type { TrajectorySample } from "./trajectory.svelte.js";
import { reactive } from "./util/reactive.svelte.js";
class UIState {
  fieldScalingFactor = $state(1);
  playbackTime = $state(0);
  graphPanelOpen = $state(false);
  graphPanelHeight = $derived(
    this.graphPanelOpen ? GRAPH_PANEL_MAX_HEIGHT : GRAPH_PANEL_MIN_HEIGHT);
  graphData: Record<
    GraphLine, Array<[number, number]>> = $state.frozen(emptyGraphData());
  toggleGraphPanel() {
    this.graphPanelOpen = !this.graphPanelOpen;
  }
}
export let uistate = new UIState();
/* Navbar stuff */
export const WaypointData: {
  [key: string]: {
    index: number;
    name: string;
    icon: any;
  };
} = {
  FullWaypoint: {
    index: 0,
    name: "Pose Waypoint",
    icon: null//SquareCircle
  },
  TranslationWaypoint: {
    index: 1,
    name: "Translation Waypoint",
    icon: null//Circle
  },
  EmptyWaypoint: {
    index: 2,
    name: "Empty Waypoint",
    icon: null//CircleOutline
  },
  InitialGuessPoint: {
    index: 3,
    name: "Initial Guess Point",
    icon: null//InitialGuess
  }
};
const NavbarData: {
  [key: string]: {
    index: number;
    name: string;
    icon: any;
  };
} = Object.assign({}, WaypointData);
const waypointNavbarCount = Object.keys(NavbarData).length;
//   const constraintsIndices: number[] = [];
//   const navbarIndexToConstraint: { [key: number]: typeof ConstraintStore } = {};
//   const navbarIndexToConstraintDefinition: {
//     [key: number]: ConstraintDefinition;
//   } = {};
//   {
//     let constraintsOffset = Object.keys(NavbarData).length;
//     Object.entries(constraints).forEach(([key, data], index) => {
//       NavbarData[key] = {
//         index: constraintsOffset,
//         name: data.name,
//         icon: data.icon
//       };
//       navbarIndexToConstraint[constraintsOffset] = ConstraintStores[key];
//       navbarIndexToConstraintDefinition[constraintsOffset] = data;
//       constraintsIndices.push(constraintsOffset);
//       constraintsOffset++;
//     });
//   }
//   const constraintNavbarCount = Object.keys(constraints).length;
//   export const ObstacleData: {
//     [key: string]: {
//       index: number;
//       name: string;
//       icon: ReactElement;
//     };
//   } = {
//     CircleObstacle: {
//       index: Object.keys(NavbarData).length,
//       name: "Circular Obstacle",
//       icon: <DoNotDisturb />
//     }
//   };
//   let obstacleNavbarCount = 0;
//   obstacleNavbarCount = Object.keys(ObstacleData).length;
//   Object.entries(ObstacleData).forEach(([name, data]) => {
//     const obstaclesOffset = Object.keys(NavbarData).length;
//     NavbarData[name] = {
//       index: obstaclesOffset,
//       name: data.name,
//       icon: data.icon
//     };
//   });

//   const eventMarkerCount = 1;
//   NavbarData.EventMarker = {
//     index: Object.keys(NavbarData).length,
//     name: "Event Marker",
//     icon: <Room></Room>
//   };

/** An map of  */
export const NavbarLabels = (() => {
  const x: { [key: string]: number } = {};
  Object.entries(NavbarData).forEach(([key, data], index) => {
    x[key] = index;
  });
  return x;
})();

/** An array of name-and-icon objects for the navbar */
export const NavbarItemData = (() => {
  const x: Array<{ name: string; icon: any }> = [];
  Object.entries(NavbarData).forEach(([key, data], index) => {
    x[data.index] = { name: data.name, icon: data.icon };
  });
  return x;
})();
console.log(NavbarItemData);

const NavbarItemSections = [waypointNavbarCount]//, constraintNavbarCount];
//   NavbarItemSections.push(obstacleNavbarCount);
//   NavbarItemSections.push(eventMarkerCount);

export const NavbarItemSectionEnds = NavbarItemSections.map((s, idx) =>
  NavbarItemSections.slice(0, idx + 1).reduce((prev, cur) => prev + cur, -1)
);
console.log(NavbarItemSectionEnds);

/** Graph Panel */
export const GRAPH_PANEL_MIN_HEIGHT = 32;
export const GRAPH_PANEL_MAX_HEIGHT = 350;

export type GraphLine = keyof TrajectorySample
  | "abs_vel"
  | "accel";
export type GraphAxis = {
  name: string,
  units: string,
  color: string,
  leftAxis: boolean,
  defaultView: boolean,
  getter: (arr: TrajectorySample[], i: number) => number
};
export let graphColors: Record<GraphLine, GraphAxis> = {
  timestamp: {
    name: "Timestamp",
    color: "white",
    units: "s",
    leftAxis: true,
    defaultView: false,
    getter: (arr, i) => arr[i].timestamp
  },
  x: {
    name: "X Position",
    units: "m",
    color: "red",
    leftAxis: false,
    defaultView: false,
    getter: (arr, i) => arr[i].x
  },
  y: {
    name: "Y Position",
    units: "m",
    color: "green",
    leftAxis: false,
    defaultView: false,
    getter: (arr, i) => arr[i].y
  },
  heading: {
    name: "Heading",
    units: "rad",
    color: "blue",
    leftAxis: true,
    defaultView: true,
    getter: (arr, i) => arr[i].heading
  },
  velocity_x: {
    name: "X Velocity",
    units: "m/s",
    color: "darkred",
    leftAxis: true,
    defaultView: false,
    getter: (arr, i) => arr[i].velocity_x
  },
  velocity_y: {
    name: "Y Velocity",
    units: "m/s",
    color: "darkgreen",
    leftAxis: true,
    defaultView: false,
    getter: (arr, i) => arr[i].velocity_y
  },
  angular_velocity: {
    name: "Angular Velocity",
    units: "rad/s",
    color: "darkblue",
    leftAxis: true,
    defaultView: true,
    getter: (arr, i) => arr[i].angular_velocity
  },
  abs_vel: {
    name: "Absolute Velocity",
    units: "m/s",
    color: "yellow",
    leftAxis: true,
    defaultView: true,
    getter: (arr, i) => Math.hypot(arr[i].velocity_x, arr[i].velocity_y)
  },
  accel: {
    name: "Linear Acceleration",
    units: "m/s²",
    color: "orange",
    leftAxis: false,
    defaultView: true,
    getter: (arr, i) => {
      var samp: TrajectorySample = arr[i - 1];
      var samp2: TrajectorySample = arr[i + 1];
      if (samp2 === undefined || samp === undefined) {
        return 0;
      }

      return (
        Math.hypot(samp2.velocity_x, samp2.velocity_y) -
        Math.hypot(samp.velocity_x, samp.velocity_y)) / (samp2.timestamp - samp.timestamp);
    }
  }
}
export let graphDefaultViews = Object.fromEntries(
  Object.entries(graphColors).map(entry => [entry[0], entry[1].defaultView])
) as Record<GraphLine, boolean>
type Wrap<T> =
{
  get: () => T;
  set: (newValue: T) => void;
}
export let graphViews: Record<GraphLine, Wrap<boolean>> = {} as Record<GraphLine, Wrap<boolean>>
  Object.entries(graphColors).forEach(entry => {
    let state = $state(entry[1].defaultView);
    Object.defineProperty(graphViews, entry[0],{          //Alternatively, use: `get() {}`
          get: function() {
            console.log("get graph view", entry[0])
            return state;
          },
          //Alternatively, use: `set(newValue) {}`
          set: function(newValue:boolean) {
            console.log("set graph view", entry[0])
            state = newValue;
          }
        })
      }
);

let graphViewKeys = Object.keys(graphViews)
let graphViewEntries = Object.values(graphViews)
export function emptyGraphData(): Record<
GraphLine, Array<[number, number]>> {
  return {
    x: [],
    y: [],
    heading: [],
    velocity_x: [],
    velocity_y: [],
    angular_velocity: [],
    timestamp: [],
    abs_vel: [],
    accel: []
  }
}

