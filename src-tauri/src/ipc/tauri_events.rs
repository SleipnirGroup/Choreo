use serde::{Deserialize, Serialize};
use sqlx::{Pool, Sqlite};
use tauri::Manager;

use crate::state::{path::get_path_waypoints_impl, utils::sqlx_stringify, waypoint::{Waypoint, WaypointID}};

#[derive(Debug, Serialize, Deserialize, Clone)]
struct UpdatePathWaypointsPayload {
    id: i64,
    order: Vec<Waypoint>
}
pub async fn broadcast_path_update(handle: &tauri::AppHandle, path_id: i64) -> Result<(), String> {
    let pool = handle.state::<Pool<Sqlite>>();
    let ids = get_path_waypoints_impl(&pool, &path_id).await.map_err(sqlx_stringify)?;
    handle.emit_all("ev_update_path_waypoints", UpdatePathWaypointsPayload{id: path_id, order: ids});
    Ok(())
}

#[derive(serde::Serialize, Clone)]
pub struct UpdateWaypointPayload {
    id: WaypointID,
    update: Waypoint
}
pub async fn broadcast_waypoint_update(
    handle: tauri::AppHandle,
    id: i64,
    update: Waypoint,
) {
    handle.emit_all::<UpdateWaypointPayload>("ev_update_waypoint", UpdateWaypointPayload {id, update});
}