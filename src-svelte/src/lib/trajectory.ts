import { writable, type Writable } from "svelte/store";
import type { RemoteReadable } from "./waypoint.js";
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

type TrajectoryStore = Writable<TrajectorySample[]>

export let Trajectories : Record<number, TrajectoryStore> = {}

export function Trajectory(path_id: number) {
    if (Trajectories[path_id] === undefined) {
        Trajectories[path_id] = writable<TrajectorySample[]>([]);
        Commands.CMD_GET_TRAJECTORY(path_id)
        .then((traj: TrajectorySample[])=>Trajectories[path_id].set(traj));
    }
    return Trajectories[path_id];
}