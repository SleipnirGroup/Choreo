
use std::{
    str::FromStr,
};



mod state;
mod ipc;

use crate::state::{
    constraint::{add_constraint, get_constraint, Constraint, Constraints}, path::{
        add_path_waypoint_impl, generate_trajectory, get_path_waypoints_impl
    }, trajectory::{get_sample, insert_trajectory}, waypoint::{
        add_waypoint_impl, get_waypoint_impl,
        update_waypoint_impl,
    }
};
use crate::ipc::tauri_commands:: {
    cmd_add_path_waypoint,
    cmd_get_path_waypoints,
    cmd_delete_path_waypoint,
    
    cmd_add_waypoint,
    cmd_get_waypoint,
    cmd_update_waypoint,
    cmd_get_trajectory,
    cmd_generate_trajectory
};
use state::{
    constraint, path, robotconfig, trajectory, waypoint::{self, PartialWaypoint, Waypoint}
};
use tauri::{Manager};

pub async fn create_tables(pool: &Pool<Sqlite>) -> Result<(), Error> {
    waypoint::create_waypoint_table(pool).await?;
    path::create_path_tables(pool).await?;
    robotconfig::create_robot_config_table(pool).await?;
    constraint::create_constraint_tables(pool).await?;
    trajectory::create_samples_table(pool).await
}
use sqlx::{
    sqlite::{SqliteConnectOptions, SqlitePoolOptions},
    Error, Pool, Sqlite,
};


async fn test_db(handle: tauri::AppHandle) {
    let pool = handle.state::<Pool<Sqlite>>();
    let id = add_waypoint_impl(&pool, &Waypoint::new()).await;
    println!("{:?}", id);
    let first_id = id.unwrap();
    let id2 = add_waypoint_impl(&pool, &Waypoint::new()).await;
    println!("{:?}", id2);
    let second_id = id2.unwrap();
    println!("{:?}", get_waypoint_impl(&pool, &first_id).await);

    // let mut update = PartialWaypoint::default();
    // update.x=Some(1.0f64);
    let update = serde_json::from_str::<PartialWaypoint>("{\"y\":1.0}").unwrap();
    println!(
        "{:?}",
        update_waypoint_impl(&pool, &first_id, update.clone()).await
    );
    println!("{:?}", get_waypoint_impl(&pool, &first_id).await);

    let path_id = 2;
    println!(
        "add to path: {:?}",
        add_path_waypoint_impl(&pool, &path_id, &first_id).await
    );
    println!(
        "add to path: {:?}",
        add_path_waypoint_impl(&pool, &path_id, &second_id).await
    );
    println!(
        "add to path: {:?}",
        add_path_waypoint_impl(
            &pool,
            &path_id,
            &add_waypoint_impl(&pool, &Waypoint::new()).await.unwrap()
        )
        .await
    );
    let path = get_path_waypoints_impl(&pool, &path_id).await.unwrap();
    println!("get path: {:?}", path);

    // path vector is now out of date
    // let path = get_path_waypoints_impl(&pool, &path_id).await.unwrap();
    // println!("get path: {:?}",path);
    //println!("robot config {:?}", get_robot_config_impl(&pool).await);
    // let config_update = serde_json::from_str::<PartialChoreoRobotConfig>("{\"mass\":50.0, \"motor_max_velocity\":4000}").unwrap();
    // println!("updated {:?}", update_robot_config_impl(&pool, config_update).await);
    // println!("robot config {:?}", get_robot_config_impl(&pool).await);
    let cons = add_constraint(
        &pool,
        &path_id,
        &Constraint::of(&Constraints.wpt_velocity_direction)
    )
    .await.unwrap();
    println!(
        "add constraint {:?}",
        cons
    );
    println!(
        "constraint {:?}", serde_json::to_string(&get_constraint(&pool, &cons).await.unwrap()).unwrap()
    );
}
fn main() {
    /*
        let mut pt1 = Waypoint::new();
        let mut pt2 = Waypoint::new();
        pt2.x = 1.0;
        pt2.y = 1.0;
        let mut path = Path::new();
        let id1  = path.add_waypoint(pt1);
        path.add_waypoint(pt2);
        //let constraint = path.get_constraint(path.add_constraint(&Constraints.WptZeroVelocity));


        //path.get_constraint(constraint).scope = ConstraintScope::wpt(WaypointScope::uuid(id1));
        path.delete_waypoint(id1);
        //  {
        //     config: ChoreoRobotConfig::default(),
        //     waypoints: vec![
        //         pt2,
        //         pt1
        //     ],
        //     constraints: vec![
        //         Constraint {
        //             scope: ConstraintScope::sgmt(
        //                 WaypointScope::first,
        //                 WaypointScope::uuid(pt1)),
        //             data: ConstraintData::WptZeroVelocity{} }
        //     ]
        // };

        path.generate_trajectory();

        let ser = serde_json::to_string_pretty(&path);

        if ser.is_ok() {
            let ser = ser.unwrap();
            println!("{}", ser);
            //println!("{:?}", scopeToWaypointID(&path.waypoints, &path.constraints.first().unwrap().scope.0));
            let newPath = serde_json::from_str::<Path>(ser.as_str());
            if newPath.is_ok() {
                //println!("{:?}", scopeToWaypointID(&path.waypoints, &path.constraints.first().unwrap().scope.1));
            }
        }
    */
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle();
            let handle2 = app.handle();
            tauri::async_runtime::spawn(async move {
                let sqlite_opts = SqliteConnectOptions::from_str(":memory:").unwrap();

                // min_connections = 3 to prevent the DB from being wiped randomly
                let pool = SqlitePoolOptions::new()
                    .min_connections(3)
                    .max_connections(10) // default is 10
                    .connect_with(sqlite_opts)
                    .await
                    .unwrap();

                println!("{:?}", create_tables(&pool).await);
                handle.manage(pool);
                test_db(handle).await;
                let pool = handle2.state::<Pool<Sqlite>>();
                let traj_res = generate_trajectory(&pool, 2).await;
                
                println!("{:?}", traj_res);
                if let Ok(traj) = traj_res {
                    let insert_res = insert_trajectory(&pool, &2, &traj).await;
                    println!("{:?}", insert_res);
                }

                let traj_res = generate_trajectory(&pool, 2).await;
                
                println!("{:?}", traj_res);
                if let Ok(traj) = traj_res {
                    let insert_res = insert_trajectory(&pool, &2, &traj).await;
                    println!("{:?}", insert_res);
                }
                println!("{:?}", get_sample(&pool, &2, &56).await);
            });
            Ok(())
            // define in memory DB connection options
        })
        .invoke_handler(tauri::generate_handler![
            cmd_delete_path_waypoint,
            cmd_add_waypoint,
            cmd_update_waypoint,
            cmd_add_path_waypoint,
            cmd_get_path_waypoints,
            cmd_get_waypoint,
            cmd_generate_trajectory,
            cmd_get_trajectory
        ])
        //     generate_trajectory,
        //     cancel,
        //     open_file_dialog,
        //     file_event_payload_from_dir,
        //     save_file,
        //     contains_build_gradle,
        //     delete_file,
        //     delete_dir,
        //     delete_traj_segments,
        //     open_file_app
        // ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
