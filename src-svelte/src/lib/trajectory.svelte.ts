import { writable, type Writable } from "svelte/store";

import { invoke } from "@tauri-apps/api";
import Commands from "./commands.js"

export interface TrajectorySample {
    timestamp: number; //positive
    x: number;
    y: number;
    heading: number;
    velocity_x: number;
    velocity_y: number;
    angular_velocity: number;
  }

export let Trajectories : Record<number, Output> = {}
class Output{
    samples = $state<TrajectorySample[]>([]);
}
export function Trajectory(path_id: number) {
    if (Trajectories[path_id] === undefined) {
        let traj = new Output();
         Trajectories[path_id] = traj;
    }
    return Trajectories[path_id];
}