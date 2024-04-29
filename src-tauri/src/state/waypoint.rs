pub type WaypointID = i64;

use std::sync::atomic::{AtomicI64, Ordering};

use partially::Partial;
#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub enum WaypointScope {
    Uuid(WaypointID),
    First,
    Last,
}


#[allow(non_snake_case)]
#[derive(serde::Serialize, serde::Deserialize, sqlx::FromRow, sqlxinsert::SqliteInsert, Debug, Partial, Clone)]
#[partially(derive(Default, serde::Serialize, serde::Deserialize, Debug, Clone))]
pub struct Waypoint {
    // don't allow the id to be in the update struct
    #[partially(omit)]
    id: WaypointID,
    pub x: f64,
    pub y: f64,
    pub heading: f64,
    pub is_initial_guess: bool,
    pub translation_constrained: bool,
    pub heading_constrained: bool,
    pub control_interval_count: i32,
}

/* 0 is the first waypoint of a path, 1 is the last */
pub static WPT_ID: AtomicI64 = AtomicI64::new(2);
pub static KEYS : &str = "id, x, y, heading, is_initial_guess, translation_constrained, heading_constrained, control_interval_count";

impl Waypoint {
    pub fn new() -> Self {
        Waypoint {
            id: WPT_ID.fetch_add(1, Ordering::Relaxed),
            x: 0.0,
            y: 0.0,
            heading: 0.0,
            is_initial_guess: false,
            translation_constrained: true,
            heading_constrained: true,
            control_interval_count: 40,
        }
    }
}

pub fn scope_to_waypoint_id<'a>(
    waypoints: &'a Vec<WaypointID>,
    scope: &Option<WaypointScope>,
) -> Option<&'a WaypointID> {
    if let Some(scope) = scope.as_ref() {
        match scope {
            WaypointScope::Uuid(id) => waypoints.iter().find(|&r| *r == *id),
            WaypointScope::First => waypoints.first(),
            WaypointScope::Last => waypoints.last(),
        }
    } else {
        None
    }
}

pub fn scope_to_position(
    waypoints: &Vec<&WaypointID>,
    scope: &Option<WaypointScope>,
) -> Option<usize> {
    if let Some(scope) = scope.as_ref() {
        match scope {
            WaypointScope::Uuid(id) => waypoints.iter().position(|&r| *r == *id),
            WaypointScope::First => {
                if !waypoints.is_empty() {
                    Some(0)
                } else {
                    None
                }
            }
            WaypointScope::Last => {
                if !waypoints.is_empty() {
                    Some(waypoints.len() - 1)
                } else {
                    None
                }
            }
        }
    } else {
        None
    }
}

pub async fn create_waypoint_table(
    pool: &Pool<Sqlite>,
) -> Result<<Sqlite as sqlx::Database>::QueryResult, Error> {
    sqlx::query(
        "Create table waypoints (
            id INT PRIMARY KEY,
            x REAL NOT NULL,
            y REAL NOT NULL,
            heading REAL NOT NULL,
            is_initial_guess BOOL NOT NULL,
            translation_constrained BOOL NOT NULL,
            heading_constrained BOOL NOT NULL,
            control_interval_count INT NOT NULL
        )
    ",
    )
    .execute(pool)
    .await
}
use sqlx::{Error, Pool, Sqlite};










pub async fn add_waypoint_impl(pool: &Pool<Sqlite>, waypoint: &Waypoint) -> Result<i64, Error> {
    
    sqlx::query(
    format!("INSERT INTO waypoints
            ({}) VALUES(
            ?,       ?, ?, ?,       ?,                ?,                       ?,                   ?)", KEYS).as_str(),
    )
    .bind(waypoint.id)
    .bind(waypoint.x)
    .bind(waypoint.y)
    .bind(waypoint.heading)
    .bind(waypoint.is_initial_guess)
    .bind(waypoint.translation_constrained)
    .bind(waypoint.heading_constrained)
    .bind(waypoint.control_interval_count)
    .execute(pool)
    .await?;
    Ok(waypoint.id)
}
pub async fn update_waypoint_impl(
    pool: &Pool<Sqlite>,
    id: &i64,
    wpt: PartialWaypoint,
) -> Result<<Sqlite as sqlx::Database>::QueryResult, Error> {
    sqlx::query(
        "UPDATE waypoints SET
            x = COALESCE(?, x),
            y = COALESCE(?, y),
            heading = COALESCE(?, heading),
            is_initial_guess = COALESCE(?, is_initial_guess),
            translation_constrained = COALESCE(?, translation_constrained),
            heading_constrained = COALESCE(?, heading_constrained),
            control_interval_count = COALESCE(?, control_interval_count)
            WHERE id == ?",
    )
    .bind(wpt.x)
    .bind(wpt.y)
    .bind(wpt.heading)
    .bind(wpt.is_initial_guess)
    .bind(wpt.translation_constrained)
    .bind(wpt.heading_constrained)
    .bind(wpt.control_interval_count)
    .bind(id)
    .execute(pool)
    .await
}

pub async fn get_waypoint_impl(pool: &Pool<Sqlite>, id: &i64) -> Result<Option<Waypoint>, Error> {
    sqlx::query_as::<Sqlite, Waypoint>(
        format!(
            "SELECT {}
        FROM waypoints WHERE id == ?",
            KEYS
        )
        .as_str(),
    )
    .bind(id)
    .fetch_optional(pool)
    .await
}
