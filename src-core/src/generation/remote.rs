use std::{path::PathBuf, thread};

use ipc_channel::ipc::IpcSender;
use tokio::fs;

use crate::{generation::generate::generate, spec::{project::ProjectFile, traj::TrajFile}, ChoreoResult};

use super::generate::{setup_progress_sender, RemoteArgs, RemoteProgressUpdate};





pub fn remote_main(args: RemoteArgs) {
    let rx = setup_progress_sender();
    let ipc = IpcSender::<String>::connect(args.ipc)
                .expect("Failed to deserialize IPC handle");
    let cln_ipc: IpcSender<String> = ipc.clone();
    thread::Builder::new()
        .name("choreo-cli-progressupdater".to_string())
        .spawn(move || {
            for received in rx {
                let ser_string = serde_json::to_string(&RemoteProgressUpdate::IncompleteSwerveTraj(received.traj))
                    .expect("Failed to serialize progress update");
                cln_ipc.send(ser_string)
                    .expect("Failed to send progress update");
            }
        })
        .expect("Failed to spawn thread");

    let res = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .expect("Failed to build tokio runtime")
        .block_on(remote_generate(args.project, args.traj));

    match res {
        Ok(traj) => {
            let ser_string = serde_json::to_string(&RemoteProgressUpdate::CompleteTraj(traj.traj))
                .expect("Failed to serialize progress update");
            ipc.send(ser_string)
                .expect("Failed to send progress update");
        }
        Err(e) => {
            let ser_string = serde_json::to_string(&RemoteProgressUpdate::Error(e.to_string()))
                .expect("Failed to serialize progress update");
            ipc.send(ser_string)
                .expect("Failed to send progress update");
        }
    }
}

#[allow(clippy::cast_possible_wrap)]
async fn remote_generate(project_path: PathBuf, traj_path: PathBuf) -> ChoreoResult<TrajFile> {
    // set the deploy path to the project directory
    let project = ProjectFile::from_content(&fs::read_to_string(&project_path).await?)?;
    let traj = TrajFile::from_content(&fs::read_to_string(&traj_path).await?)?;

    fs::remove_file(&project_path).await?;
    fs::remove_file(&traj_path).await?;

    println!("Generating trajectory {:} for {:} remotely", traj.name, project.name);

    match generate(&project, traj, 0i64) {
        Ok(new_traj) => Ok(new_traj),
        Err(e) => {
            tracing::error!("Failed to generate trajectory {:}", e);
            Err(e)
        }
    }
}