use std::{fmt::Debug, future::Future};

use async_trait::async_trait;
use sqlx::{Pool, Sqlite};

use crate::state::{path::delete_path_waypoint_impl, waypoint::{add_waypoint_impl, delete_waypoint, Waypoint, WaypointID}};

pub trait Action<Success> {
    async fn run(&mut self, pool: &Pool<Sqlite>) -> Result<Success, sqlx::Error>;
}
#[async_trait]

pub trait Redo : Send + Sync + Debug {
    async fn redo(&mut self, pool: &Pool<Sqlite>) -> Result<(), sqlx::Error>;
    async fn undo(&mut self, pool: &Pool<Sqlite>) -> Result<(), sqlx::Error>;
}

#[derive(Debug)]
pub struct GroupAction (pub Vec<Box<dyn Redo>>);
impl GroupAction {
    pub async fn redo(&mut self, pool: &Pool<Sqlite>) -> Vec<Result<(), sqlx::Error>> {
        let mut outputs: Vec<Result<(), sqlx::Error>> = Vec::new();
        for act in self.0.iter_mut() {
            outputs.push(act.redo(pool).await);
        }
        outputs
    }
    pub async fn undo(&mut self, pool: &Pool<Sqlite>) -> Vec<Result<(), sqlx::Error>> {
        let mut outputs: Vec<Result<(), sqlx::Error>> = Vec::new();
        for act in self.0.iter_mut().rev() {
            outputs.push(act.undo(pool).await);
        }
        outputs
    }
}