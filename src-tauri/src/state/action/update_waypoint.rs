use async_trait::async_trait;
use sqlx::{Pool, Sqlite};

use crate::state::{path::delete_path_waypoint_impl, waypoint::{add_waypoint_impl, delete_waypoint, get_prev_waypoint, update_waypoint_impl, PartialWaypoint, Waypoint, WaypointID}};

use super::action::{Action, Redo};
#[derive(Debug)]
pub struct UpdateWaypoint{
    id: WaypointID,
    pub update: PartialWaypoint,
    prev: PartialWaypoint}

impl UpdateWaypoint {
    pub fn new(id: WaypointID, wpt: PartialWaypoint) -> UpdateWaypoint {
        UpdateWaypoint{id, update: wpt.clone(), prev: PartialWaypoint::new()}
    }
}

impl Action<PartialWaypoint> for UpdateWaypoint {
    async fn run(&mut self, pool: &Pool<Sqlite>) -> Result<PartialWaypoint, sqlx::Error> {

        get_prev_waypoint(pool, &self.id, &self.update).await.and_then(|prev| {
           self.prev = prev;
           Ok(())
        })?;
        update_waypoint_impl(pool, &self.id, &self.update).await?;
        Ok(self.prev.clone())
        //add_waypoint_impl(target, &self.0).await
    }
}
#[async_trait]
impl Redo for UpdateWaypoint {
    async fn redo(&mut self, pool: &Pool<Sqlite>) -> Result<(), sqlx::Error> {
        self.run(pool).await.map(|_|())
    }
    
    async fn undo(&mut self, pool: &Pool<Sqlite>) -> Result<(), sqlx::Error> {
        update_waypoint_impl(pool, &self.id, &self.prev).await
    }
}