use partially::Partial;
use sqlx::{Pool, Sqlite};
use tauri::Manager;
use trajoptlib::HolonomicTrajectorySample;

use crate::state::{path::{add_path_waypoint_impl, delete_path_waypoint_impl, generate_trajectory, get_path_waypoints_impl}, trajectory::{get_trajectory, insert_trajectory}, utils::sqlx_stringify, waypoint::{add_waypoint_impl, get_waypoint_impl, update_waypoint_impl, PartialWaypoint, Waypoint}};

use super::tauri_events::{broadcast_path_update, broadcast_waypoint_update};
#[tauri::command]
pub async fn cmd_generate_trajectory(handle: tauri::AppHandle, id: i64)-> Result<Vec<HolonomicTrajectorySample>, String> {
    let pool = handle.state::<Pool<Sqlite>>();
    let traj = generate_trajectory(&pool, id).await?;
    let _ = insert_trajectory(&pool, &id, &traj).await.map_err(sqlx_stringify);
    Ok(traj.samples)
}
#[tauri::command]
pub async fn cmd_get_trajectory(
    handle: tauri::AppHandle,
    path_id: i64,
) -> Result<Vec<HolonomicTrajectorySample>, String> {
    let _pool = handle.state::<Pool<Sqlite>>();
    get_trajectory(&_pool, &path_id)
        .await
        .map_err(sqlx_stringify)
}

#[tauri::command]
pub async fn cmd_add_waypoint(
    handle: tauri::AppHandle,
    waypoint: Option<PartialWaypoint>,
) -> Result<Waypoint, String> {
    let _pool = handle.state::<Pool<Sqlite>>();
    let mut wpt = PartialWaypoint::default();
    if waypoint.is_some() {
        wpt.apply_some(waypoint.unwrap());
    }
    add_waypoint_impl(&_pool, &wpt)
        .await
        .map_err(sqlx_stringify)
}

#[tauri::command]
pub async fn cmd_update_waypoint(
    handle: tauri::AppHandle,
    id: i64,
    update: PartialWaypoint,
) -> Result<(), String> {
    let _pool = handle.state::<Pool<Sqlite>>();
    update_waypoint_impl(&_pool, &id, &update)
        .await
        .map(|_| ())
        .map_err(sqlx_stringify)?;
    let waypoint = get_waypoint_impl(&_pool, &id)
        .await
        .map_err(sqlx_stringify)?;
    if let Some(waypoint) = waypoint {
        broadcast_waypoint_update(handle, id, waypoint).await;
    }

    Ok(())
}

#[tauri::command]
pub async fn cmd_get_waypoint(handle: tauri::AppHandle, id: i64) -> Result<Option<Waypoint>, String> {
    let _pool = handle.state::<Pool<Sqlite>>();
    get_waypoint_impl(&_pool, &id).await.map_err(sqlx_stringify)
}

#[tauri::command]
pub async fn cmd_delete_path_waypoint(
    handle: tauri::AppHandle, path_id: i64, wpt_id: i64
)  -> Result<(), String> {
    let pool = handle.state::<Pool<Sqlite>>();
    delete_path_waypoint_impl(&pool, &path_id, &wpt_id).await.map_err(sqlx_stringify)?;
    let _ = broadcast_path_update(&handle, path_id).await;
    Ok(())
}

#[tauri::command]
pub async fn cmd_get_path_waypoints(
    handle: tauri::AppHandle, id: i64
) -> Result<Vec<Waypoint>, String> {
    let pool = handle.state::<Pool<Sqlite>>();
    let pts = get_path_waypoints_impl(&pool, &id).await.map_err(sqlx_stringify)?;
    Ok(pts)
}

#[tauri::command]
pub async fn cmd_add_path_waypoint(
    handle: tauri::AppHandle,
    id: i64,
    update: PartialWaypoint
) -> Result<Waypoint, String> {
    let pool = handle.state::<Pool<Sqlite>>();
    let waypoint = add_waypoint_impl(&pool, &update).await.map_err(sqlx_stringify)?;
    add_path_waypoint_impl(&pool, &id, &waypoint.id).await.map_err(sqlx_stringify)?;
    broadcast_path_update(&handle, id).await?;
    Ok(waypoint)
}
