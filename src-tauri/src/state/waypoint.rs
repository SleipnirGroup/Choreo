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
#[partially(derive(Default, serde::Serialize, serde::Deserialize, Debug, Clone, sqlx::FromRow))]

pub struct Waypoint {
    // don't allow the id to be in the update struct
    #[partially(omit)]
    pub id: WaypointID,
    pub x: f64,
    pub y: f64,
    pub heading: f64,
    pub is_initial_guess: bool,
    pub translation_constrained: bool,
    pub heading_constrained: bool,
    pub control_interval_count: i32
}

#[allow(non_snake_case)]
#[derive(serde::Serialize, serde::Deserialize, sqlx::FromRow, sqlxinsert::SqliteInsert, Debug, Partial, Clone)]

pub struct WaypointData {
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

pub static DEFAULT_WAYPOINT: WaypointData = WaypointData {
    x: 0.0,
    y: 0.0,
    heading: 0.0,
    is_initial_guess: false,
    translation_constrained: true,
    heading_constrained : true,
    control_interval_count: 40
};
impl PartialWaypoint {
    pub fn new() -> Self {
        PartialWaypoint {
            x: None,
            y: None,
            heading: None,
            is_initial_guess: None,
            translation_constrained: None,
            heading_constrained: None,
            control_interval_count: None,
        }
    }

    pub fn default() -> Self {
        
        PartialWaypoint {
            x: Some(DEFAULT_WAYPOINT.x),
            y: Some(DEFAULT_WAYPOINT.y),
            heading: Some(DEFAULT_WAYPOINT.heading),
            is_initial_guess: Some(DEFAULT_WAYPOINT.is_initial_guess),
            translation_constrained: Some(DEFAULT_WAYPOINT.translation_constrained),
            heading_constrained: Some(DEFAULT_WAYPOINT.heading_constrained),
            control_interval_count: Some(DEFAULT_WAYPOINT.control_interval_count),
        }
    }
}
//id: WPT_ID.fetch_add(1, Ordering::Relaxed),
impl Waypoint {
    pub fn new(id: WaypointID, partial: &PartialWaypoint) -> Self {
        let mut pt = Waypoint::default(id);
        pt.apply_some(partial.clone());
        pt
    }

    pub fn default(id: WaypointID) -> Self {
        let mut pt = Waypoint {
            id: id,
            
            // The below values mean nothing, default Waypoint content
            // should be defined in PartialWaypoint::default()
            x: DEFAULT_WAYPOINT.x,
            y: DEFAULT_WAYPOINT.y,
            heading: DEFAULT_WAYPOINT.heading,
            is_initial_guess: DEFAULT_WAYPOINT.is_initial_guess,
            translation_constrained: DEFAULT_WAYPOINT.translation_constrained,
            heading_constrained: DEFAULT_WAYPOINT.heading_constrained,
            control_interval_count: DEFAULT_WAYPOINT.control_interval_count,
        };
        pt
    }

    // pub fn new() -> Self {
    //     Waypoint {
    //         id: None,

    //         x: 0.0,
    //         y: 0.0,
    //         heading: 0.0,
    //         is_initial_guess: false,
    //         translation_constrained: true,
    //         heading_constrained: true,
    //         control_interval_count: 40,
    //     }
    // }
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
            control_interval_count INT NOT NULL,
            is_deleted BOOL NOT NULL DEFAULT FALSE
        )
    ",
    )
    .execute(pool)
    .await
}
use sqlx::{Error, Pool, Sqlite};










pub async fn add_waypoint_impl(pool: &Pool<Sqlite>, waypoint: &PartialWaypoint) -> Result<Waypoint, Error> {
    let id = WPT_ID.fetch_add(1, Ordering::Relaxed);
    let full_point = Waypoint::new(id, waypoint);
    
    sqlx::query(
    format!("INSERT INTO waypoints
            ({}) VALUES(
            ?,       ?, ?, ?,       ?,                ?,                       ?,                   ?)", KEYS).as_str(),
    )
    .bind(id)
    .bind(full_point.x)
    .bind(full_point.y)
    .bind(full_point.heading)
    .bind(full_point.is_initial_guess)
    .bind(full_point.translation_constrained)
    .bind(full_point.heading_constrained)
    .bind(full_point.control_interval_count)
    .execute(pool)
    .await?;
    Ok(full_point)
}

/// Returns a PartialWaypoint containing the current values of waypoint [id]
/// for every field present in the provided PartialWaypoint
pub async fn get_prev_waypoint(
    pool: &Pool<Sqlite>,
    id: &i64,
    wpt: &PartialWaypoint,
) -> Result<PartialWaypoint, Error> {
    sqlx::query_as::<Sqlite, PartialWaypoint>(
        "SELECT 
            CASE WHEN ? IS NULL THEN NULL ELSE x END  as x,
            CASE WHEN ? IS NULL THEN NULL ELSE y END as y,
            CASE WHEN ? IS NULL THEN NULL ELSE heading END as heading, 
            CASE WHEN ? IS NULL THEN NULL ELSE is_initial_guess END as is_initial_guess,
            CASE WHEN ? IS NULL THEN NULL ELSE translation_constrained END as translation_constrained,
            CASE WHEN ? IS NULL THEN NULL ELSE heading_constrained END as heading_constrained,
            CASE WHEN ? IS NULL THEN NULL ELSE control_interval_count END as control_interval_count
            FROM waypoints
            WHERE id == ?
        "
    )
    .bind(wpt.x)
    .bind(wpt.y)
    .bind(wpt.heading)
    .bind(wpt.is_initial_guess)
    .bind(wpt.translation_constrained)
    .bind(wpt.heading_constrained)
    .bind(wpt.control_interval_count)
    .bind(id)
    .fetch_one(pool)
    .await
}
pub async fn update_waypoint_impl(
    pool: &Pool<Sqlite>,
    id: &i64,
    wpt: &PartialWaypoint,
) -> Result<(), Error> {

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
    .await?;
    Ok(())
}

/// Fully deletes waypoint. Used only as rollback for add_waypoint
/// Precondition: 
pub async fn delete_waypoint (
    pool: &Pool<Sqlite>,
    id: &i64
) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM waypoints WHERE id==?")
    .bind(id)
    .execute(pool)
    .await.map(|_|())
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
