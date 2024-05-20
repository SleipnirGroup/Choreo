use async_trait::async_trait;
use sqlx::{Pool, Sqlite};

use crate::state::{path::delete_path_waypoint_impl, waypoint::{add_waypoint_impl, delete_waypoint, PartialWaypoint, Waypoint, WaypointID}};

use super::action::{Action, Redo};

#[derive(Debug)]
pub struct AddWaypoint(pub PartialWaypoint, Option<WaypointID>);
impl AddWaypoint {
    pub fn new(wpt: PartialWaypoint) -> AddWaypoint {
        AddWaypoint(wpt.clone(), None)
    }
}

impl Action<Waypoint> for AddWaypoint {
    async fn run(&mut self, target: &Pool<Sqlite>) -> Result<Waypoint, sqlx::Error> {
        add_waypoint_impl(target, &self.0).await.map(|pt| {self.1 = Some(pt.id); pt})
    }
}
#[async_trait]
impl Redo for AddWaypoint {
    async fn redo(&mut self, pool: &Pool<Sqlite>) -> Result<(), sqlx::Error> {
        self.run(pool).await.map(|_|())
    }
    
    async fn undo(&mut self, pool: &Pool<Sqlite>) -> Result<(), sqlx::Error> {
        if let Some(id) = self.1 {
            
            delete_waypoint(pool, &id).await
        } else {
            // adding it didn't succeed or never happened
            Ok(())}
    }
}