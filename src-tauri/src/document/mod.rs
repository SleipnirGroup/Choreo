use std::path::{Path, PathBuf};

use serde::Serialize;
use tokio::{fs, sync::mpsc::UnboundedReceiver};

use crate::{error::ChoreoError, ChoreoResult};

pub mod file;
pub mod formatter;
pub mod generate;
pub mod intervals;
pub mod plugin;
pub mod types;

async fn write_serializable<T: Serialize + Send>(contents: T, file: &Path) -> ChoreoResult<()> {
    let json = formatter::to_string_pretty(&contents)?;
    let parent = file
        .parent()
        .ok_or_else(|| ChoreoError::FileWrite(file.to_path_buf()))?;
    fs::create_dir_all(parent).await?;
    fs::write(file, json).await?;
    Ok(())
}

#[allow(unused_results)]
fn spawn_writer_task<T: Serialize + Send + Sync + 'static>(
    file: PathBuf,
    mut receiver: UnboundedReceiver<T>,
) {
    tokio::spawn(async move {
        while let Some(mut contents) = receiver.recv().await {
            write_serializable(&mut contents, &file).await?;
        }
        Ok::<(), ChoreoError>(())
    });
}
