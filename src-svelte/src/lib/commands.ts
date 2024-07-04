import { invoke } from "@tauri-apps/api"
import type { TrajectorySample } from "./trajectory.svelte.js"
import type {IWaypoint} from "./waypoint.svelte.js"

const config = {
    mass: 74.088,
    rotationalInertia: 6.0,
    bumperWidth: 0.876,
    bumperLength: 0.876,
    wheelbase: 0.578,
    trackWidth: 0.578,
    motorMaxTorque: 1.162,
    motorMaxVelocity: 4800.0,
    gearing: 6.75,
    wheelRadius: 0.050799972568014815,
    wheelMaxTorque: 1.162*6.75,
    wheelMaxVelocity: (4800 * (Math.PI * 2)) / 60 / 6.75
}
export default {
    CMD_GENERATE_TRAJ: (path_id: number, waypoints: IWaypoint[],)=>{
        if (waypoints.length >= 2) {
            return invoke("generate_trajectory", {handle: path_id, path: waypoints, config, constraints: [], circleObstacles: [], polygonObstacles: []}) as Promise<{samples: TrajectorySample[]}>
        } else {
            throw "Generated with <2 waypoints";
        } 
    }
        
    


}