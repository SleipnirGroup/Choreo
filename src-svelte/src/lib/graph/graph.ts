import type { TrajectorySample } from "$lib/trajectory.svelte.js";
import { signal, type Signal } from "$lib/util/state.svelte.js";

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
export let graphViews = Object.fromEntries(
    Object.entries(graphColors).map(entry => 
        [entry[0], signal(entry[1].defaultView)]

)
) as Record<GraphLine, Signal<boolean>>;

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
