import { invoke } from "@tauri-apps/api"
import type { TrajectorySample } from "./trajectory.js"
import type { Waypoint, WaypointNoID } from "./waypoint.js"

export default {
    CMD_GENERATE_TRAJ: (path: number)=>
        invoke("cmd_generate_trajectory", {id: path}) as Promise<TrajectorySample[]>,
    CMD_GET_PATH_WAYPOINTS: (path: number)=>
        invoke("cmd_get_path_waypoints", {id: path}) as Promise<Waypoint[]>,
    CMD_GET_TRAJECTORY: (path: number)=>
        invoke("cmd_get_trajectory", {pathId:path}) as Promise<TrajectorySample[]>,
    CMD_DELETE_PATH_WAYPOINT: (path: number, wpt: number)=>
        invoke("cmd_delete_path_waypoint", {pathId: path, wptId: wpt}) as Promise<void>,
    CMD_ADD_PATH_WAYPOINT: (path: number, update: Partial<WaypointNoID>)=>
        invoke("cmd_add_path_waypoint", { id: path, update }) as Promise<Waypoint>,
    CMD_GET_WAYPOINT: (wpt: number)=>
        invoke("cmd_get_waypoint", {id:wpt}) as Promise<Waypoint>,
    CMD_UPDATE_WAYPOINT: (wpt: number, update: Partial<WaypointNoID>)=>
        invoke("cmd_update_waypoint", {id: wpt, update}) as Promise<void>,
    


}