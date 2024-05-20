use educe::Educe;
use sqlx::{Pool, Sqlite};

use super::action::{Action, GroupAction, Redo};

#[derive(Educe)]
#[educe(Debug)]
pub struct History<'a> {
    actions: Vec<GroupAction>,
    /// actions[index] is the next slot to be populated with an action
    index: usize,
    #[educe(Debug(ignore))]
    pool: &'a Pool<Sqlite>,
    active_group: Option<Vec<Box<dyn Redo>>>
}


impl History<'_> {
    pub fn new(pool: &Pool<Sqlite>) -> History {
        History {
            actions: Vec::new(),
            index: 0,
            pool,
            active_group: None
        }
    }
}


impl History<'_>{
    pub async fn add<S>(&mut self, mut action: impl Action<S> + Redo + 'static) -> Result<S, sqlx::Error> {
        let value = action.run(self.pool).await;
        if value.is_ok() {
            if let Some(ref mut group) = self.active_group {
                group.push(Box::new(action));
            } else {
                self.actions.truncate(self.index);
                self.actions.push(GroupAction(vec![Box::new(action)]));
                self.index += 1;
            }
            
        }
        value
    } 

    pub async fn start_group<S>(&mut self, action: impl Action<S> + Redo + 'static) -> Result<S, sqlx::Error> {
        if self.active_group.is_none() {
            self.active_group = Some(Vec::new());
        }
        self.add(action).await
    }
    pub fn stop_group(&mut self) {
        if let Some (ref mut group) = self.active_group {
            
            self.active_group.take().map(|v| {
                if (v.len() > 0) {
                    self.actions.truncate(self.index);
                    self.actions.push(GroupAction(v));
                    self.index += 1;
                }
            });
        }
    }

    pub async fn undo(&mut self) {
        self.stop_group();
        let to_undo = self.actions.get_mut(self.index-1);
        if let Some(to_undo) = to_undo {
            to_undo.undo(self.pool).await;
            self.index-= 1;
        }
    }

    pub async fn redo(&mut self) {
        self.stop_group();
        let to_redo = self.actions.get_mut(self.index);
        if let Some(to_redo) = to_redo {
            to_redo.redo(self.pool).await;
            self.index+= 1;
        }
    }

}