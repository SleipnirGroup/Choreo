use std::{
    collections::HashMap,
    f64::consts::PI,
    path::{Path, PathBuf},
};

use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{
    api::{dialog::blocking::FileDialogBuilder, file},
    Manager,
};
use tokio::{
    fs,
    sync::{
        mpsc::{self, UnboundedSender},
        RwLock,
    },
};

use super::types::{expr, Bumper, Module, Project, RobotConfig, Traj, Variables};

type WriterMap = DashMap<String, UnboundedSender<WriterCommand<Traj>>>;
type OptionalProjectWriter = RwLock<Option<UnboundedSender<WriterCommand<Project>>>>;

#[derive(Serialize, Deserialize, Clone)]
struct OpenFileEventPayload<'a> {
    dir: Option<&'a str>,
    name: Option<&'a str>,
    contents: Project,
}

#[derive(Serialize, Deserialize, Clone)]
struct OpenTrajEventPayload<'a> {
    name: Option<&'a str>,
    contents: Traj,
}

pub fn setup_senders(app_handle: &tauri::AppHandle) {
    let map: WriterMap = DashMap::new(); // this is for the type inference
    let first_writemap = app_handle.manage(map);
    let first_project_writer = app_handle.manage::<OptionalProjectWriter>(RwLock::new(None));
    assert!(
        first_writemap && first_project_writer,
        "Setup Senders was called twice"
    );
}

#[tauri::command]
pub async fn write_traj(
    app_handle: tauri::AppHandle,
    file: String,
    traj: Traj,
) -> Result<(), String> {
    let senders: tauri::State<WriterMap> = app_handle.state();
    let sender = senders
        .get(&file)
        .or_else(|| {
            let _ = senders.insert(file.clone(), start::<Traj>(Path::new(&(file.clone()))));
            senders.get(&file)
        })
        .ok_or("Could not get or insert traj file writer. Notify developers.")?;
    sender
        .send(WriterCommand::Write(traj))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn write_chor(app_handle: tauri::AppHandle, chor: Project) -> Result<(), String> {
    let state = app_handle.state::<OptionalProjectWriter>();
    let opt = state.read().await;
    let sender = opt.as_ref().ok_or("No project is open")?;
    sender
        .send(WriterCommand::Write(chor))
        .map_err(|e| e.to_string())
}
#[tauri::command]
pub async fn set_chor_path(
    app_handle: tauri::AppHandle,
    dir: String,
    name: String,
) -> Result<(), String> {
    // TODO: make this return nothing, this could be a breaking change for frontend
    let state = app_handle.state::<OptionalProjectWriter>();
    let _ = state
        .write()
        .await
        .replace(start(&Path::new(&dir).join(name)));
    Ok(())
}

#[derive(Serialize, Deserialize)]
pub enum WriterCommand<T> {
    Write(T),
    Move(String),
}

async fn handle_write<T: Serialize + Send>(contents: T, file: &Path) -> Result<(), ()> {
    let json = super::formatter::to_string_pretty(&contents);
    match json {
        Ok(stringified) => {
            let parent = file.parent();
            if parent.is_none() {
                return Err(());
            }
            let parent = parent.expect("file parent opt check failed");
            fs::create_dir_all(parent).await.map_err(|_e| ())?;
            fs::write(file, stringified).await.map_err(|_e| ())?;
            Ok(())
        }
        Err(e) => {
            println!("{:?}", e.to_string());
            Err(())
        }
    }
}

#[allow(unused_results)]
pub fn start<T: Serialize + Send + Sync + 'static>(
    file: &Path,
) -> tokio::sync::mpsc::UnboundedSender<WriterCommand<T>> {
    let (tx, mut rx) = mpsc::unbounded_channel::<WriterCommand<T>>();
    let mut filepath = PathBuf::new();
    (*file).clone_into(&mut filepath);
    tokio::spawn(async move {
        loop {
            let mut contents = (rx).recv().await;
            while !rx.is_empty() {
                contents = (rx).recv().await;
            }
            match contents {
                None => break,
                Some(contents) => {
                    let _ = match contents {
                        WriterCommand::Move(_) => Ok(()), // TODO
                        WriterCommand::Write(contents) => handle_write(contents, &filepath).await,
                    };
                }
            }
        }
    });
    tx
}

// async fn send_open_chor_event(
//     app_handle: tauri::AppHandle,
//     chor: Project,
//     dir: &str,
//     name: &str,
// ) -> Result<(), tauri::Error> {
//     app_handle.emit_all(
//         "open-file",
//         OpenFileEventPayload {
//             dir: Some(dir),
//             name: Some(name),
//             contents: chor,
//         },
//     )
// }

// async fn send_open_traj_event(
//     app_handle: tauri::AppHandle,
//     traj: Traj,
//     name: &str,
// ) -> Result<(), tauri::Error> {
//     app_handle.emit_all(
//         "open-traj",
//         OpenTrajEventPayload {
//             name: Some(name),
//             contents: traj,
//         },
//     )
// }

#[tauri::command]
pub async fn open_file_dialog(_app_handle: tauri::AppHandle) -> Result<(String, String), String> {
    let file_path = FileDialogBuilder::new()
        .set_title("Open a .chor file")
        .add_filter("Choreo Save File", &["chor"])
        .pick_file();
    if let Some(path) = file_path {
        if let Some(dir) = path.parent() {
            if let Some(name) = path.file_name() {
                let dir = dir.to_str();
                let name = name.to_str();
                if let (Some(dir), Some(name)) = (dir, name) {
                    return Ok((dir.to_string(), name.to_string()));
                }
                return Err("Filepath was not UTF-8".to_string());
            }
        }
    }
    Err("Incomplete Selection".to_string())
    // TODO: Replace with if-let chains (https://github.com/rust-lang/rfcs/pull/2497)
}

#[tauri::command]
pub async fn open_chor(
    app_handle: tauri::AppHandle,
    path: Option<(String, String)>,
) -> Result<Project, String> {
    let (dir, name) = match path {
        None => open_file_dialog(app_handle.clone()).await?,
        Some(path) => path,
    };
    let pathbuf = Path::new(&dir).join(name);
    let contents = file::read_string(pathbuf).map_err(|e| e.to_string())?;
    let chor = open_chor_from_contents(&contents).map_err(|e| e.to_string())?;
    //let _ = send_open_chor_event(app_handle, chor, dir.as_str(), name.as_str());
    Ok(chor)
}

#[tauri::command]
pub async fn open_traj(
    _app_handle: tauri::AppHandle,
    path: (String, String),
) -> Result<Traj, String> {
    let pathbuf = Path::new(&path.0).join(&path.1);
    let contents = file::read_string(pathbuf).map_err(|e| e.to_string())?;
    let chor = open_traj_from_contents(&contents).map_err(|e| e.to_string())?;
    //let _ = send_open_chor_event(app_handle, chor, dir.as_str(), name.as_str());
    Ok(chor)
}

#[tauri::command]
pub async fn new_file(_app_handle: tauri::AppHandle) -> Result<Project, String> {
    //let _ = send_open_chor_event(app_handle, chor, dir.as_str(), name.as_str());
    Ok(Project {
        version: "v2025.0.0".to_string(),
        variables: Variables {
            expressions: HashMap::new(),
            poses: HashMap::new(),
        },
        config: RobotConfig {
            gearing: expr("6.5", 6.5),
            radius: expr("2 in", 0.0508),
            vmax: expr("6000.0 RPM", 6000.0 * 2.0 * PI / 60.0),
            tmax: expr("1.2 N*m", 1.2),
            modules: [
                Module {
                    x: expr("11 in", 0.2794),
                    y: expr("11 in", 0.2794),
                },
                Module {
                    x: expr("-11 in", -0.2794),
                    y: expr("11 in", 0.2794),
                },
                Module {
                    x: expr("-11 in", -0.2794),
                    y: expr("-11 in", -0.2794),
                },
                Module {
                    x: expr("11 in", 0.2794),
                    y: expr("-11 in", -0.2794),
                },
            ],
            mass: expr("150 lbs", 68.038_855_5),
            inertia: expr("6 kg m^2", 6.0),
            bumper: Bumper {
                front: expr("16 in", 0.4064),
                left: expr("16 in", 0.4064),
                back: expr("16 in", 0.4064),
                right: expr("16 in", 0.4064),
            },
        },
    })
}

fn open_traj_from_contents(input: &str) -> Result<Traj, serde_json::Error> {
    let json: Value = serde_json::from_str(input)?;
    let traj: Traj = serde_json::from_value(json)?;
    Ok(traj)
}

fn open_chor_from_contents(input: &str) -> Result<Project, serde_json::Error> {
    let json: Value = serde_json::from_str(input)?;
    let chor: Project = serde_json::from_value(json)?;
    Ok(chor)
}

#[tauri::command]
pub async fn delete_dir(dir: String) {
    let dir_path = Path::new(&dir);
    let _ = fs::remove_dir_all(dir_path).await;
}

#[tauri::command]
pub async fn delete_file(dir: String, name: String) {
    let dir_path = Path::new(&dir);
    let name_path = Path::join(dir_path, name);
    let _ = fs::remove_file(name_path).await;
}

#[tauri::command]
pub async fn find_all_traj(dir: Option<&Path>) -> Result<Vec<String>, String> {
    dir.map_or_else(
        || Err("Directory does not exist".to_string()),
        |dir_path| {
            Ok(dir_path
                .read_dir()
                .map_err(|e| e.to_string())?
                .flatten()
                .filter_map(|entry| {
                    let path = entry.path();
                    let extension = if path.is_file() {
                        path.extension()
                    } else {
                        None
                    };
                    if extension.map_or(false, |e| e.eq_ignore_ascii_case("traj")) {
                        entry.path().to_str().map(ToString::to_string)
                    } else {
                        None
                    }
                })
                .collect::<Vec<String>>())
        },
    )
}
