import { listen, type EventCallback, type Event } from "@tauri-apps/api/event";
import type { Waypoint } from "./waypoint.js";

export type UpdateWaypointPayload = {
    id: number;
    update: Partial<Waypoint>
};
export type UpdatePathWaypointsPayload= {
    id: number;
    order: number[];
}
type Callback<T> = (e: Event<T>)=>void;
export const EV_UPDATE_PATH_WAYPOINTS =
    (cb: (e: Event<UpdatePathWaypointsPayload>)=>void)=>listen("ev_update_path_waypoints", cb);
export const EV_UPDATE_WAYPOINT = 
    (cb: (e: Event<UpdateWaypointPayload>)=>void)=>listen("ev_update_waypoint", cb);
