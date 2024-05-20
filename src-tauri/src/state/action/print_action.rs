use async_trait::async_trait;
use sqlx::{Pool, Sqlite};

use crate::state::{path::delete_path_waypoint_impl, waypoint::{add_waypoint_impl, delete_waypoint, PartialWaypoint, Waypoint, WaypointID}};

use super::action::{Action, Redo};

#[derive(Debug)]
pub struct Print(String);
impl Print {
    pub fn new(msg: String) -> Print {
        Print(msg)
    }
}

impl Action<()> for Print {
    async fn run(&mut self, target: &Pool<Sqlite>) -> Result<(), sqlx::Error> {
        println!("doing {}", self.0);
        Ok(())
    }
}
#[async_trait]
impl Redo for Print {
    async fn redo(&mut self, pool: &Pool<Sqlite>) -> Result<(), sqlx::Error> {
        self.run(pool).await.map(|_|())
    }
    
    async fn undo(&mut self, pool: &Pool<Sqlite>) -> Result<(), sqlx::Error> {
        println!("Undoing {}", self.0);
        Ok(())
    }
}